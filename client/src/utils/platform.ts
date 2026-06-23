/**
 * Platform detection utilities for Capacitor native app vs. web browser.
 *
 * Use these to branch behaviour between native and web — notably the payment
 * path: native iOS/Android must use Apple/Google in-app purchase via RevenueCat
 * (see utils/iap.ts), while web uses Lemon Squeezy (see GranPlusModal).
 */

import { Capacitor } from "@capacitor/core";

/** True when running inside the compiled iOS or Android native app. */
export const isNativeApp: boolean = Capacitor.isNativePlatform();

/** True when running as a web app (browser or PWA). */
export const isWebApp: boolean = !isNativeApp;

/** "ios" | "android" | "web" */
export const currentPlatform: string = Capacitor.getPlatform();
