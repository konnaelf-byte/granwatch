import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Older Samsung Internet (< v12) and Android WebView (< 5.0) incorrectly
 * treat SameSite=None as SameSite=Strict, breaking cross-origin OAuth redirects.
 * Detect these browsers and omit SameSite so they fall back to the default
 * (Lax-equivalent), which works fine for same-site session cookies.
 *
 * Reference: https://www.chromium.org/updates/same-site/incompatible-clients
 */
function isSameSiteNoneIncompatible(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent;

  // Samsung Internet < 12 — SamsungBrowser/X.Y where X < 12
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+)/);
  if (samsungMatch && parseInt(samsungMatch[1], 10) < 12) return true;

  // Android WebView / UC Browser on Android 5 and below
  // Android 5 = Linux; Android 5, Android 4
  const androidMatch = ua.match(/Android (\d+)/);
  if (androidMatch && parseInt(androidMatch[1], 10) <= 5) {
    // Only flag if it's the stock WebView (not Chrome)
    if (ua.includes("wv") || ua.includes("UCBrowser")) return true;
  }

  // iOS 12 and below — Safari and embedded WKWebView
  const iosMatch = ua.match(/\(iP.+; CPU .*OS (\d+)[_\d]*.*\) AppleWebKit/);
  if (iosMatch && parseInt(iosMatch[1], 10) <= 12) return true;

  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const userAgent = (req.headers["user-agent"] as string) ?? "";
  const secure = isSecureRequest(req);

  // For incompatible browsers, omit SameSite entirely (defaults to Lax-equivalent).
  // SameSite=None requires Secure=true; if not secure, also fall back.
  const sameSite: "none" | "lax" =
    isSameSiteNoneIncompatible(userAgent) || !secure ? "lax" : "none";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
