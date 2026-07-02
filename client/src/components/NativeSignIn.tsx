/**
 * NativeSignIn — Custom sign-in UI for Capacitor iOS/Android.
 *
 * Uses @capgo/capacitor-social-login to obtain provider ID tokens natively,
 * then exchanges them with Clerk (no web redirect / Safari bounce).
 *
 * Three paths:
 *   • Apple  → SocialLogin.login('apple') → idToken → signIn.create({ strategy: 'oauth_token_apple', token })
 *   • Google → SocialLogin.login('google') → idToken → clerk.authenticateWithGoogleOneTap({ token })
 *   • Email  → email-code OTP flow via clerk.client.signIn / clerk.client.signUp
 *
 * Transfer flow (sign-in → sign-up):
 *   If signIn.firstFactorVerification.status === 'transferable', call signUp.create({ transfer: true }).
 * Transfer flow (sign-up → sign-in):
 *   If signUp.isTransferable is true, call signIn.create({ transfer: true }).
 */

import { useState, useEffect, useRef } from "react";
import { useClerk } from "@clerk/react";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { useLocation } from "wouter";
import { Loader2, Mail, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentPlatform } from "@/utils/platform";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "buttons" | "email-entry" | "email-code";

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NativeSignIn() {
  const clerk = useClerk();
  const [, navigate] = useLocation();

  const [screen, setScreen] = useState<Screen>("buttons");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null); // which button is spinning
  const [error, setError] = useState<string | null>(null);
  // Track which Clerk resource (signIn or signUp) is in progress for email-code
  const [emailFlowMode, setEmailFlowMode] = useState<"signIn" | "signUp">("signIn");
  // Resend-code cooldown (seconds remaining; 0 = button enabled)
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const RESEND_COOLDOWN_SECONDS = 30;

  // Tick down the resend cooldown each second while active.
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
      return;
    }
    if (!cooldownTimer.current) {
      cooldownTimer.current = setInterval(() => {
        setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
      }, 1000);
    }
    return () => {
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    };
  }, [resendCooldown]);

  // clerk.loaded is true once Clerk has initialized
  const isReady = clerk.loaded;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function clearError() {
    setError(null);
  }

  /**
   * Detect whether a native social-login error is just the user cancelling
   * (dismissing the Apple/Google sheet). Different platforms/plugins surface
   * this differently, so check the common codes and messages.
   */
  function isUserCancellation(err: unknown): boolean {
    const e = err as { code?: string | number; message?: string };
    const code = String(e?.code ?? "");
    if (code === "USER_CANCELLED" || code === "CANCELED" || code === "1001" || code === "12501") {
      return true;
    }
    const msg = (e?.message ?? "").toLowerCase();
    return (
      msg.includes("cancel") ||
      msg.includes("canceled") ||
      msg.includes("cancelled") ||
      msg.includes("user closed") ||
      msg.includes("the user canceled the sign-in flow") ||
      msg.includes("aborted")
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSignIn(): any {
    const si = clerk.client?.signIn;
    if (!si) throw new Error("Clerk client is not initialized yet.");
    return si;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSignUp(): any {
    const su = clerk.client?.signUp;
    if (!su) throw new Error("Clerk client is not initialized yet.");
    return su;
  }

  /** After a successful sign-in, activate the session and redirect. */
  async function completeSignIn(sessionId: string) {
    await clerk.setActive({ session: sessionId });
    navigate("/dashboard");
  }

  /** After a successful sign-up, activate the session and redirect. */
  async function completeSignUp(sessionId: string) {
    await clerk.setActive({ session: sessionId });
    navigate("/dashboard");
  }

  // ── Apple sign-in ────────────────────────────────────────────────────────────

  async function handleApple() {
    if (!isReady) return;
    clearError();
    setLoading("apple");
    try {
      // Apple via Clerk WEB OAuth (uses the Services ID, which Clerk trusts).
      // Apple — unlike Google — permits Sign in with Apple inside a WebView, so it
      // stays in-app (capacitor.config server.allowNavigation whitelists the apple
      // + clerk domains). Clerk's web SDK does NOT accept native Apple ID tokens,
      // so the redirect flow is the correct path here.
      const signIn = getSignIn();
      await signIn.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: "https://granwatch.app/sso-callback",
        redirectUrlComplete: "https://granwatch.app/dashboard",
      });
      // The redirect + the /sso-callback route finish the sign-in.
    } catch (err: unknown) {
      if (isUserCancellation(err)) {
        // User dismissed the sheet — not an error. Return to the sign-in options
        // with no error banner and no stuck spinner (cleared in finally).
        setScreen("buttons");
      } else {
        const e = err as { message?: string; errors?: Array<{ message: string }> };
        const msg = e?.errors?.[0]?.message ?? e?.message ?? "Apple sign-in failed. Please try again.";
        setError(msg);
        setScreen("buttons");
        console.error("[NativeSignIn] Apple error:", err);
      }
    } finally {
      setLoading(null);
    }
  }

  // ── Google sign-in ───────────────────────────────────────────────────────────

  async function handleGoogle() {
    if (!isReady) return;
    clearError();
    setLoading("google");
    try {
      // BUG FIX: After a user deletes/switches accounts, the native Google plugin
      // silently reuses the previously signed-in Google account (no chooser) and
      // then errors. Sign out of the native Google session first so the account
      // chooser always appears. Best-effort: ignore errors (e.g. not logged in).
      try {
        await SocialLogin.logout({ provider: "google" });
      } catch (logoutErr) {
        console.warn("[NativeSignIn] Google pre-login logout skipped:", logoutErr);
      }

      const result = await SocialLogin.login({ provider: "google", options: {} });
      const googleResult = result.result;
      if (googleResult.responseType !== "online") {
        throw new Error("Google returned offline mode; expected online mode.");
      }
      const idToken = googleResult.idToken;
      if (!idToken) throw new Error("Google sign-in did not return an ID token.");

      // clerk.authenticateWithGoogleOneTap handles both sign-in and sign-up automatically
      const clerkResult = await clerk.authenticateWithGoogleOneTap({ token: idToken });

      // The result is a SignInResource or SignUpResource — both have status and createdSessionId
      if (clerkResult.status === "complete") {
        const sessionId = (clerkResult as { createdSessionId: string | null }).createdSessionId;
        if (sessionId) {
          // Determine if it's a signIn or signUp by checking for firstFactorVerification
          if ("firstFactorVerification" in clerkResult) {
            await completeSignIn(sessionId);
          } else {
            await completeSignUp(sessionId);
          }
          return;
        }
      }

      throw new Error("Google sign-in completed but session could not be established.");
    } catch (err: unknown) {
      if (isUserCancellation(err)) {
        // User dismissed the chooser — not an error. Return to the sign-in options
        // with no error banner and no stuck spinner (cleared in finally).
        setScreen("buttons");
      } else {
        const e = err as { message?: string; errors?: Array<{ message: string }> };
        const msg = e?.errors?.[0]?.message ?? e?.message ?? "Google sign-in failed. Please try again.";
        setError(msg);
        setScreen("buttons");
        console.error("[NativeSignIn] Google error:", err);
      }
    } finally {
      setLoading(null);
    }
  }

  // ── Email OTP flow ───────────────────────────────────────────────────────────

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady || !email.trim()) return;
    clearError();
    setLoading("email");
    try {
      // Attempt sign-in first: prepare email_code for this identifier
      const signIn = getSignIn();
      const res = await signIn.create({ strategy: "email_code", identifier: email.trim() });
      if (res.status === "needs_first_factor") {
        setEmailFlowMode("signIn");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setScreen("email-code");
        return;
      }
      throw new Error(`Unexpected sign-in status: ${res.status}`);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string; message?: string }>; message?: string };
      // Check if Clerk says no user found → try sign-up
      const clerkErrors = e?.errors ?? [];
      const isNoUser = clerkErrors.some(
        (ce) => ce.code === "form_identifier_not_found" || ce.code === "form_param_nil"
      );
      if (isNoUser) {
        try {
          const signUp = getSignUp();
          await signUp.create({ emailAddress: email.trim() });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setEmailFlowMode("signUp");
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setScreen("email-code");
        } catch (signUpErr: unknown) {
          const sue = signUpErr as { errors?: Array<{ message?: string }>; message?: string };
          const msg = sue?.errors?.[0]?.message ?? sue?.message ?? "Could not start sign-up. Please try again.";
          setError(msg);
          console.error("[NativeSignIn] Email sign-up error:", signUpErr);
        }
      } else {
        const msg = clerkErrors[0]?.message ?? e?.message ?? "Failed to send code. Please try again.";
        setError(msg);
        console.error("[NativeSignIn] Email submit error:", err);
      }
    } finally {
      setLoading(null);
    }
  }

  /**
   * BUG FIX: Re-send the email verification code from the code-entry step so a
   * user who never received the first code is not dead-ended. Re-runs the same
   * preparation used initially (signIn email_code create, or signUp
   * prepareEmailAddressVerification), depending on which flow we're in. Starts a
   * 30s cooldown to avoid spamming, and surfaces a clear error on failure.
   */
  async function handleResendCode() {
    if (!isReady || loading !== null || resendCooldown > 0 || !email.trim()) return;
    clearError();
    setLoading("resend");
    try {
      if (emailFlowMode === "signIn") {
        const signIn = getSignIn();
        const res = await signIn.create({ strategy: "email_code", identifier: email.trim() });
        if (res.status !== "needs_first_factor") {
          throw new Error(`Unexpected sign-in status: ${res.status}`);
        }
      } else {
        const signUp = getSignUp();
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      }
      // Success → start cooldown.
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string }>; message?: string };
      const msg = e?.errors?.[0]?.message ?? e?.message ?? "Could not resend the code. Please try again.";
      setError(msg);
      console.error("[NativeSignIn] Resend code error:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady || !code.trim()) return;
    clearError();
    setLoading("code");
    try {
      if (emailFlowMode === "signIn") {
        const signIn = getSignIn();
        const res = await signIn.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
        if (res.status === "complete") {
          await completeSignIn(res.createdSessionId!);
          return;
        }
        // Sign-in says this identifier should sign-up (transferable)
        if (res.firstFactorVerification.status === "transferable") {
          const signUp = getSignUp();
          const signUpRes = await signUp.create({ transfer: true });
          if (signUpRes.status === "complete") {
            await completeSignUp(signUpRes.createdSessionId!);
            return;
          }
          throw new Error(`Unexpected sign-up transfer status: ${signUpRes.status}`);
        }
        throw new Error(`Unexpected sign-in status after code: ${res.status}`);
      } else {
        // signUp flow
        const signUp = getSignUp();
        const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (res.status === "complete") {
          await completeSignUp(res.createdSessionId!);
          return;
        }
        // Sign-up says user already exists (transferable → sign in)
        // In the legacy SignUpResource, transferable is detected via verifications.emailAddress.status
        if (res.verifications.emailAddress.status === "transferable") {
          const signIn = getSignIn();
          const siRes = await signIn.create({ transfer: true });
          if (siRes.status === "complete") {
            await completeSignIn(siRes.createdSessionId!);
            return;
          }
          throw new Error(`Unexpected sign-in transfer status: ${siRes.status}`);
        }
        throw new Error(`Unexpected sign-up status after code: ${res.status}`);
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string }>; message?: string };
      const clerkErrors = e?.errors ?? [];
      const msg = clerkErrors[0]?.message ?? e?.message ?? "Invalid code. Please try again.";
      setError(msg);
      console.error("[NativeSignIn] Code verify error:", err);
    } finally {
      setLoading(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-foreground">Sign in to GranWatch</h1>
        <p className="text-sm text-muted-foreground mt-1">Keep your family connected</p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* ── Buttons screen ── */}
      {screen === "buttons" && (
        <div className="flex flex-col gap-3">
          {/* Apple — iOS only: on Android it's an unfamiliar web-OAuth detour,
              so Android leads with Google + email (users who signed up with
              Apple on iPhone can still use email-code with the same address). */}
          {currentPlatform !== "android" && (
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-medium gap-3"
            onClick={handleApple}
            disabled={!isReady || loading !== null}
            aria-busy={loading === "apple"}
          >
            {loading === "apple" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Apple className="w-5 h-5" />
            )}
            Continue with Apple
          </Button>
          )}

          {/* Google */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-medium gap-3"
            onClick={handleGoogle}
            disabled={!isReady || loading !== null}
            aria-busy={loading === "google"}
          >
            {loading === "google" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Email */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-medium gap-3"
            onClick={() => { clearError(); setScreen("email-entry"); }}
            disabled={!isReady || loading !== null}
          >
            <Mail className="w-5 h-5" />
            Continue with Email
          </Button>
        </div>
      )}

      {/* ── Email entry screen ── */}
      {screen === "email-entry" && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="native-email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="native-email"
              type="email"
              autoComplete="email"
              autoFocus
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading !== null}
              className="h-12 text-base"
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base"
            disabled={!isReady || loading !== null || !email.trim()}
            aria-busy={loading === "email"}
          >
            {loading === "email" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send code"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => { clearError(); setScreen("buttons"); setEmail(""); }}
            disabled={loading !== null}
          >
            Back
          </Button>
        </form>
      )}

      {/* ── Email code verification screen ── */}
      {screen === "email-code" && (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground text-center">
            We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="native-code" className="text-sm font-medium text-foreground">
              Verification code
            </label>
            <Input
              id="native-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={loading !== null}
              className="h-12 text-base text-center tracking-widest"
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base"
            disabled={!isReady || loading !== null || code.length < 6}
            aria-busy={loading === "code"}
          >
            {loading === "code" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify code"}
          </Button>

          {/* Resend code (with 30s cooldown to avoid spamming) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={handleResendCode}
            disabled={!isReady || loading !== null || resendCooldown > 0}
            aria-busy={loading === "resend"}
          >
            {loading === "resend" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : resendCooldown > 0 ? (
              `Resend code in ${resendCooldown}s`
            ) : (
              "Resend code"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => { clearError(); setResendCooldown(0); setScreen("email-entry"); setCode(""); }}
            disabled={loading !== null}
          >
            Change email
          </Button>
        </form>
      )}
    </div>
  );
}
