import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getSignInUrl } from "./const";
import "./index.css";
import "./i18n"; // 8-language i18n — must load before App renders
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const queryClient = new QueryClient();

const redirectToSignInIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  window.location.href = getSignInUrl(window.location.pathname);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToSignInIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToSignInIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// ─── SocialLogin initialisation (native only) ────────────────────────────────
// Must run before any sign-in attempt. Safe to call multiple times (idempotent).
// iOS Google: iOSClientId = iOS OAuth client; iOSServerClientId = web client so
// the returned idToken aud matches the web client ID that Clerk trusts.
// Apple: uses bundle id `app.granwatch` automatically on iOS (no clientId needed).
// Android: Apple sign-in is hidden (no redirectUrl configured) — passing `apple`
// on Android makes initialize() throw ("apple.android.redirectUrl is null or
// empty"), which also breaks Google init. So apple is iOS-only here.
if (Capacitor.isNativePlatform()) {
  const isIOS = Capacitor.getPlatform() === "ios";
  SocialLogin.initialize({
    google: {
      iOSClientId: "156428600768-kk8a2atra3haubsa91aoncmg6d7073rv.apps.googleusercontent.com",
      iOSServerClientId: "156428600768-4bdsso544vgd5o6ri81r97kqp27a351u.apps.googleusercontent.com",
      // Android (Credential Manager) validates the idToken against the web client:
      webClientId: "156428600768-4bdsso544vgd5o6ri81r97kqp27a351u.apps.googleusercontent.com",
    },
    ...(isIOS
      ? {
          apple: {
            // clientId is only needed for web/Android; iOS uses the bundle id automatically
          },
        }
      : {}),
  }).catch((err) => console.warn("[SocialLogin] initialize error:", err));
}

// ─── Deep links (iOS Universal Links / Android App Links) ────────────────────
// When the OS opens the app from a granwatch.app link, navigate the WebView to
// the same path so the link actually lands somewhere (e.g. invite → /join/CODE).
// The /api/og/invite/* share-preview URL maps to its real destination /join/*.
// Guarded: on builds without the @capacitor/app native plugin this no-ops.
if (Capacitor.isNativePlatform()) {
  // Map a granwatch.app URL to an in-app path and navigate there.
  //
  // LOOP GUARD (field report 2026-08-11, infinite splash/join loop):
  // navigation happens via window.location.href = FULL RELOAD, which resets
  // module state — so an in-memory "already handled" flag is useless. The
  // launch URL from getLaunchUrl() persists for the whole app session, so
  // after the reload it fired again → navigate → reload → forever.
  // Guard 1 — "already there": if the current location matches the link
  // target, do nothing.
  // Guard 2 (field report 2026-08-21, sign-in infinite loop): the launch URL
  // must only ever be acted on ONCE per app session. Without this, a signed-
  // OUT user opening an invite link cold got stuck: /join/CODE → in-app nav
  // to /sign-in (a reload) → main.tsx re-runs → getLaunchUrl() STILL returns
  // the invite → yanked back to /join before Clerk even finished loading
  // (buttons greyed) → /sign-in → forever. sessionStorage survives WebView
  // reloads within one app session but is cleared on a fresh cold start, so
  // a genuinely new link tap still navigates.
  const LAUNCH_HANDLED_KEY = "gw-launch-url-handled";
  const handleDeepLink = (url: string | undefined | null, isLaunchUrl = false) => {
    if (!url) return;
    try {
      if (isLaunchUrl) {
        if (window.sessionStorage.getItem(LAUNCH_HANDLED_KEY) === url) return; // already replayed
        window.sessionStorage.setItem(LAUNCH_HANDLED_KEY, url);
      }
      const u = new URL(url);
      let path = u.pathname + u.search;
      const ogInvite = u.pathname.match(/^\/api\/og\/invite\/([A-Za-z0-9_-]+)/);
      if (ogInvite) path = `/join/${ogInvite[1]}`;
      if (!path.startsWith("/") || path.startsWith("//") || path === "/") return;
      const current = window.location.pathname + window.location.search;
      if (current === path || window.location.pathname === path.split("?")[0]) return; // already there
      window.location.href = path;
    } catch (err) {
      console.warn("[DeepLink] parse failed:", err);
    }
  };

  import("@capacitor/app")
    .then(({ App: CapacitorApp }) => {
      // Warm start / app already running: link tap fires appUrlOpen. Always
      // navigate — every event is a real, fresh user tap.
      CapacitorApp.addListener("appUrlOpen", ({ url }) => handleDeepLink(url));
      // COLD start: the app is LAUNCHED by the link — appUrlOpen may never
      // fire because the event happened before this listener existed. This
      // path replays on every in-session reload, hence the once-only guard.
      CapacitorApp.getLaunchUrl()
        .then((launch) => handleDeepLink(launch?.url, true))
        .catch(() => {});
    })
    .catch((err) => console.warn("[DeepLink] @capacitor/app unavailable on this build:", err));
}

// ─── Service Worker Registration ─────────────────────────────────────────────
// Register the SW in both the browser and Capacitor WebView (iOS / Android).
// We skip registration in local dev (Vite HMR) to avoid caching stale builds.
// Skip SW in Capacitor native shells — the app loads from server.url directly,
// so the SW adds no value and its controllerchange reload can break Clerk init.
const isCapacitorNative = !!(window as any).Capacitor?.isNative || !!(window as any).Capacitor?.isNativePlatform?.();
if ("serviceWorker" in navigator && import.meta.env.PROD && !isCapacitorNative) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Prompt the user to reload when an update is waiting
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — tell the SW to take over immediately
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));

    // Reload the page when the active SW changes (after an update)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </ClerkProvider>
);
