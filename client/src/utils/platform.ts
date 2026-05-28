/**
 * Platform detection utilities for Capacitor native app vs. web browser.
 *
 * Use these to gate features that are not allowed in the native iOS/Android
 * app — particularly any payment or subscription UI (Apple IAP rules).
 *
 * The Reader App model requires ZERO purchase UI in the native app.
 * All payment flows must be web-only (via granwatch.app).
 */

import { Capacitor } from "@capacitor/core";

/** True when running inside the compiled iOS or Android native app. */
export const isNativeApp: boolean = Capacitor.isNativePlatform();

/** True when running as a web app (browser or PWA). */
export const isWebApp: boolean = !isNativeApp;

/** "ios" | "android" | "web" */
export const currentPlatform: string = Capacitor.getPlatform();
