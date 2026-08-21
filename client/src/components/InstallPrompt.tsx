import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

// Since the native apps launched (iOS Aug 11 2026, Android Aug 20 2026), phone
// browsers get pointed at the REAL store apps — never the PWA. The PWA install
// prompt survives only on desktop Chrome/Edge, where no store app exists.
// (History: the old PWA prompt installed a duplicate "web app" alongside the
// Play-installed app on Android — field-caught by Konstand, 2026-08-21.)

const APP_STORE_URL = "https://apps.apple.com/app/granwatch/id6782076368";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.granwatch";

// BeforeInstallPromptEvent is not in standard TypeScript types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform() {
  const ua = navigator.userAgent;

  // Native app (Capacitor WebView) — user is already in the installed app.
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    return "standalone";
  }

  // Already installed as standalone PWA (legacy installs from before the stores)
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }

  // Any iOS browser (Safari, Chrome-on-iOS, in-app browsers) → App Store
  if (/iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream) {
    return "store-ios";
  }

  // Any Android browser (Chrome, Samsung Internet, in-app browsers) → Play Store
  if (/android/i.test(ua)) {
    return "store-android";
  }

  // Desktop Chrome/Edge — the only place the PWA still makes sense
  return "desktop";
}

export function InstallPrompt() {
  const { isAuthenticated } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // One-shot override: the user JUST joined a family via an invite link —
    // peak motivation to install the real app, so an old dismissal doesn't
    // silence the store banner. Flag is set by JoinFamily on success and
    // cleared here so it fires exactly once.
    let justJoined = false;
    try {
      justJoined = sessionStorage.getItem("gw-just-joined") === "1";
      if (justJoined) sessionStorage.removeItem("gw-just-joined");
    } catch {}

    const detected = detectPlatform();

    // Don't show if already in the app
    if (detected === "standalone") return;

    // The join can also complete AFTER this component mounted (auto-join is
    // async) — listen for the live event so the banner appears right away.
    const showStoreBannerSoon = () => {
      if (detected === "store-ios" || detected === "store-android") {
        setPlatform(detected);
        setDismissed(false);
        setTimeout(() => setShowBanner(true), 1500); // let the welcome toast land first
      }
    };
    window.addEventListener("gw-just-joined", showStoreBannerSoon);
    const cleanupJoinListener = () =>
      window.removeEventListener("gw-just-joined", showStoreBannerSoon);

    // Don't show if already dismissed (unless they just joined a family)
    if (!justJoined && localStorage.getItem("installPromptDismissed")) return cleanupJoinListener;

    // Only show to signed-in users — visitors get the landing page's own store chooser
    if (!isAuthenticated) return cleanupJoinListener;

    setPlatform(detected);

    if (detected === "store-ios" || detected === "store-android") {
      const t = setTimeout(() => setShowBanner(true), 2500);
      return () => {
        clearTimeout(t);
        cleanupJoinListener();
      };
    }

    // Desktop: capture the native PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      cleanupJoinListener();
    };
  }, [isAuthenticated]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        localStorage.setItem("installPromptDismissed", "1");
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("installPromptDismissed", "1");
  };

  if (!showBanner || dismissed) return null;

  const storeUrl = platform === "store-ios" ? APP_STORE_URL : PLAY_STORE_URL;
  const storeName = platform === "store-ios" ? "App Store" : "Google Play";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div
        className="max-w-lg mx-auto rounded-2xl p-4 flex items-start gap-3 shadow-xl"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        {/* App icon */}
        <img
          src="/icon-512.png"
          alt="GranWatch"
          className="w-12 h-12 rounded-xl flex-shrink-0 object-cover"
        />

        <div className="flex-1 min-w-0">
          {/* Phone browsers → the real app in the store */}
          {(platform === "store-ios" || platform === "store-android") && (
            <>
              <p className="font-semibold text-sm text-foreground">Get the GranWatch app</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Push notifications and the smoothest experience live in the app — free on {storeName}.
              </p>
              <Button asChild size="sm" className="mt-2 h-9 text-sm">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  Get it on {storeName}
                </a>
              </Button>
            </>
          )}

          {/* Desktop Chrome/Edge — PWA install */}
          {platform === "desktop" && (
            <>
              <p className="font-semibold text-sm text-foreground">Install GranWatch on this computer</p>
              <p className="text-sm text-muted-foreground mt-1">
                Quick access from your dock or taskbar — no download needed.
              </p>
              <Button size="sm" className="mt-2 h-9 text-sm" onClick={handleInstall}>
                Install
              </Button>
            </>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5 p-1"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
