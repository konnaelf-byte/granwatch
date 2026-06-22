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
if (Capacitor.isNativePlatform()) {
  SocialLogin.initialize({
    google: {
      iOSClientId: "156428600768-kk8a2atra3haubsa91aoncmg6d7073rv.apps.googleusercontent.com",
      iOSServerClientId: "156428600768-4bdsso544vgd5o6ri81r97kqp27a351u.apps.googleusercontent.com",
    },
    apple: {
      // clientId is only needed for web/Android; iOS uses the bundle id automatically
    },
  }).catch((err) => console.warn("[SocialLogin] initialize error:", err));
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
