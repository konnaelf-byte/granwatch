/**
 * Push notification registration — native builds only (Build 11+).
 *
 * Flow:
 *   1. App opens signed-in (Dashboard) → getPushToken()
 *   2. Plugin availability is checked first, so web and older native builds
 *      (≤10, which don't contain the FirebaseMessaging plugin) no-op safely.
 *   3. Permission is requested once; if granted, the FCM registration token
 *      is returned and the caller stores it via trpc.pushToken.register
 *      (idempotent server-side).
 *
 * Delivery requires the APNs auth key to be uploaded in Firebase console
 * (Cloud Messaging → Apple app configuration) — registration works without it.
 */
import { Capacitor } from "@capacitor/core";
import { isNativeApp } from "./platform";

let attemptedThisSession = false;

export interface PushToken {
  token: string;
  platform: "ios" | "android";
}

/** Returns the FCM token, or null when unavailable (web, old build, denied). */
export async function getPushToken(): Promise<PushToken | null> {
  if (!isNativeApp) return null;
  if (!Capacitor.isPluginAvailable("FirebaseMessaging")) return null;
  if (attemptedThisSession) return null;
  attemptedThisSession = true;

  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    let perm = await FirebaseMessaging.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await FirebaseMessaging.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.log("[Push] Permission not granted:", perm.receive);
      return null;
    }

    const { token } = await FirebaseMessaging.getToken();
    if (!token) return null;

    const platform = Capacitor.getPlatform() === "android" ? "android" : "ios";
    console.log(`[Push] Got ${platform} FCM token (${token.slice(0, 12)}…)`);
    return { token, platform };
  } catch (err) {
    console.warn("[Push] Registration unavailable:", err);
    return null;
  }
}
