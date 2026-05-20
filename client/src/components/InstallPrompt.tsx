import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

// BeforeInstallPromptEvent is not in standard TypeScript types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform() {
  const ua = navigator.userAgent;

  // Already installed as standalone PWA
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }

  // Detect in-app browsers (WhatsApp, Facebook, Instagram, Messenger, Gmail, Snapchat, TikTok, LinkedIn)
  const inAppBrowserPatterns = [
    /FBAN|FBAV/i,        // Facebook
    /Instagram/i,        // Instagram
    /WhatsApp/i,         // WhatsApp
    /Snapchat/i,         // Snapchat
    /TikTok/i,           // TikTok
    /LinkedInApp/i,      // LinkedIn
    /GSA/i,              // Gmail (Google Search App)
    /YahooMobile/i,      // Yahoo Mail
    /Outlook/i,          // Outlook
    /MicroMessenger/i,   // WeChat
  ];

  const isInAppBrowser = inAppBrowserPatterns.some((pattern) => pattern.test(ua));
  if (isInAppBrowser) {
    // Determine which native browser to recommend
    const isAndroid = /android/i.test(ua);
    return isAndroid ? "inapp-android" : "inapp-ios";
  }

  // Samsung Internet browser — older versions don't support SameSite=None cookies well
  // and don't support PWA install prompts reliably. Recommend Chrome.
  const isSamsungInternet = /SamsungBrowser\/(\d+)/.test(ua);
  const samsungVersionMatch = ua.match(/SamsungBrowser\/(\d+)/);
  const samsungVersion = samsungVersionMatch ? parseInt(samsungVersionMatch[1], 10) : 99;
  if (isSamsungInternet && samsungVersion < 17) {
    return "samsung-old";
  }

  // iOS Safari (not in-app)
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) &&
    !(window as any).MSStream &&
    !(navigator as any).standalone;
  if (isIOS) return "ios";

  // Android / Desktop Chrome (will receive beforeinstallprompt)
  return "android";
}

export function InstallPrompt() {
  const { isAuthenticated } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem("installPromptDismissed")) return;

    const detected = detectPlatform();

    // Don't show if already installed
    if (detected === "standalone") return;

    // Show Samsung browser warning BEFORE sign-in — it blocks the login flow
    if (detected === "samsung-old") {
      const t = setTimeout(() => setShowBanner(true), 1000);
      setPlatform(detected);
      return () => clearTimeout(t);
    }

    // For all other prompts, only show to signed-in users
    if (!isAuthenticated) return;

    setPlatform(detected);

    if (detected === "ios") {
      // iOS Safari: show manual instructions after a short delay
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }

    if (detected === "inapp-ios" || detected === "inapp-android") {
      // In-app browser: show "open in real browser" message after a short delay
      const t = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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

  const handleOpenInBrowser = () => {
    // Copy current URL to clipboard so user can paste in real browser
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("installPromptDismissed", "1");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div
        className="max-w-lg mx-auto rounded-2xl p-4 flex items-start gap-3 shadow-xl"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        {/* App icon */}
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663467284809/kPXP5TfTQ4hUuXDHU4e2Bo/gran-icon-final_a6b9501a.png"
          alt="GranWatch"
          className="w-12 h-12 rounded-xl flex-shrink-0 object-cover"
        />

        <div className="flex-1 min-w-0">
          {/* In-app browser on iOS */}
          {platform === "inapp-ios" && (
            <>
              <p className="font-semibold text-sm text-foreground">Open in Safari for the best experience</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap the <strong>···</strong> or share menu and choose <strong>"Open in Safari"</strong> to install GranWatch to your home screen and enable notifications.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-8 text-xs gap-1"
                onClick={handleOpenInBrowser}
              >
                <ExternalLink className="w-3 h-3" />
                Copy link to open in Safari
              </Button>
            </>
          )}

          {/* Old Samsung Internet — recommend Chrome */}
          {platform === "samsung-old" && (
            <>
              <p className="font-semibold text-sm text-foreground">For the best experience, open in Chrome</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your Samsung Internet browser may have trouble signing in. Tap the <strong>⋮</strong> menu and choose <strong>"Open in Chrome"</strong> for a smoother experience.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-8 text-xs gap-1"
                onClick={handleOpenInBrowser}
              >
                <ExternalLink className="w-3 h-3" />
                Copy link to open in Chrome
              </Button>
            </>
          )}

          {/* In-app browser on Android */}
          {platform === "inapp-android" && (
            <>
              <p className="font-semibold text-sm text-foreground">Open in Chrome for the best experience</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap the <strong>⋮</strong> menu and choose <strong>"Open in Chrome"</strong> to install GranWatch and enable notifications.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-8 text-xs gap-1"
                onClick={handleOpenInBrowser}
              >
                <ExternalLink className="w-3 h-3" />
                Copy link to open in Chrome
              </Button>
            </>
          )}

          {/* iOS Safari */}
          {platform === "ios" && (
            <>
              <p className="font-semibold text-sm text-foreground">Add GranWatch to your home screen</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap the{" "}
                <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  {" "}Share
                </span>{" "}
                button at the <strong>bottom</strong> of Safari, then choose{" "}
                <strong>"Add to Home Screen"</strong>.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This enables push notifications and a native app feel.
              </p>
            </>
          )}

          {/* Android / Chrome */}
          {platform === "android" && (
            <>
              <p className="font-semibold text-sm text-foreground">Add GranWatch to your home screen</p>
              <p className="text-xs text-muted-foreground mt-1">
                Install for quick access and notifications — no App Store needed.
              </p>
              <Button
                size="sm"
                className="mt-2 h-8 text-xs"
                onClick={handleInstall}
              >
                Install App
              </Button>
            </>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
