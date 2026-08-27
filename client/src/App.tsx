import { SignIn, AuthenticateWithRedirectCallback, useAuth as useClerkAuth } from "@clerk/react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ElderProfile from "./pages/ElderProfile";
import CreateElder from "./pages/CreateElder";
import JoinFamily from "./pages/JoinFamily";
import Notifications from "./pages/Notifications";
import ElderSettings from "./pages/ElderSettings";
import { PaymentSuccess, PaymentCancel } from "./pages/PaymentResult";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import InstallPrompt from "./components/InstallPrompt";
import NativeSignIn from "./components/NativeSignIn";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Reads ?redirect_url= from the current URL and returns it only if it is a
 * safe internal path (guards against open-redirect abuse). Used to send the
 * user back to where they were headed (e.g. an invite link /join/CODE) after
 * signing in, instead of dropping them on /dashboard.
 */
function getSafeRedirectParam(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("redirect_url");
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function SignInPage() {
  const [, navigate] = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const redirectUrl = getSafeRedirectParam();
  const { isLoaded, isSignedIn } = useClerkAuth();

  // Already signed in? Skip the sign-in screen entirely. Without this, an app
  // relaunch that lands here (e.g. Android recreating the activity after the
  // Google Play payment sheet, 2026-08-20) dead-ends the user: every sign-in
  // attempt fails with Clerk's "Session already exists".
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate(redirectUrl ?? "/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn, redirectUrl, navigate]);

  if (isLoaded && isSignedIn) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Back button — only shown in native app (not web), and not on sso-callback */}
      {isNative && typeof window !== "undefined" && !window.location.pathname.includes("sso-callback") && (
        <div className="px-4 pt-safe pt-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Native: use custom sign-in to avoid Safari bounce and Google's embedded-WebView block */}
        {isNative ? (
          <NativeSignIn returnPath={redirectUrl} />
        ) : (
          /* Web: Clerk's standard SignIn. forceRedirectUrl pins the post-auth
             destination to the ?redirect_url= return path (e.g. /join/CODE from
             an invite link) so OAuth round-trips can't fall back to /dashboard. */
          <SignIn
            routing="path"
            path="/sign-in"
            forceRedirectUrl={redirectUrl ?? undefined}
            signUpForceRedirectUrl={redirectUrl ?? undefined}
          />
        )}
      </div>
    </div>
  );
}

// Completes an OAuth redirect (used by native Apple sign-in). Clerk finalizes the
// session here and forwards to redirectUrlComplete (/dashboard).
function SSOCallbackPage() {
  // Prefer the ?redirect_url= param; else the return path stashed by an invite
  // link before OAuth started (sessionStorage survives the round-trip in the
  // same tab); else /dashboard.
  const stashed =
    typeof window !== "undefined" ? window.sessionStorage.getItem("gw_return_path") : null;
  const safeStashed =
    stashed && stashed.startsWith("/") && !stashed.startsWith("//") ? stashed : null;
  const target = getSafeRedirectParam() ?? safeStashed ?? "/dashboard";
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={target}
        signUpFallbackRedirectUrl={target}
      />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      {/* Wildcard is required: Clerk's path-routed <SignIn> navigates to
          sub-steps of /sign-in — /sign-in/factor-one is the password step,
          plus /sign-in/sso-callback, /sign-in/verify, etc. With only exact
          matches here, every sub-step fell through to the 404 catch-all,
          making email+password sign-in impossible on web. */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sso-callback" component={SSOCallbackPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/elder/:id" component={ElderProfile} />
      <Route path="/create" component={CreateElder} />
      <Route path="/join/:code?" component={JoinFamily} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/elder/:id/settings" component={ElderSettings} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {/* Skip-to-content link for keyboard and switch-access users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold focus:text-sm"
          >
            Skip to main content
          </a>
          <Toaster richColors position="top-center" />
          <Router />
          <InstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
