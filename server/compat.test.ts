import { describe, it, expect } from "vitest";

// ─── Cookie SameSite compatibility ───────────────────────────────────────────

function isSameSiteNoneIncompatible(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent;

  const samsungMatch = ua.match(/SamsungBrowser\/(\d+)/);
  if (samsungMatch && parseInt(samsungMatch[1], 10) < 12) return true;

  const androidMatch = ua.match(/Android (\d+)/);
  if (androidMatch && parseInt(androidMatch[1], 10) <= 5) {
    if (ua.includes("wv") || ua.includes("UCBrowser")) return true;
  }

  const iosMatch = ua.match(/\(iP.+; CPU .*OS (\d+)[_\d]*.*\) AppleWebKit/);
  if (iosMatch && parseInt(iosMatch[1], 10) <= 12) return true;

  return false;
}

describe("SameSite=None browser compatibility", () => {
  it("flags Samsung Internet < 12 as incompatible", () => {
    const ua = "Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/11.2 Chrome/75.0.3770.143 Mobile Safari/537.36";
    expect(isSameSiteNoneIncompatible(ua)).toBe(true);
  });

  it("allows Samsung Internet >= 12", () => {
    const ua = "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.0 Chrome/87.0.4280.141 Mobile Safari/537.36";
    expect(isSameSiteNoneIncompatible(ua)).toBe(false);
  });

  it("flags Android 5 WebView as incompatible", () => {
    const ua = "Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36";
    expect(isSameSiteNoneIncompatible(ua)).toBe(true);
  });

  it("allows modern Android Chrome", () => {
    const ua = "Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
    expect(isSameSiteNoneIncompatible(ua)).toBe(false);
  });

  it("flags iOS 12 Safari as incompatible", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1";
    expect(isSameSiteNoneIncompatible(ua)).toBe(true);
  });

  it("allows iOS 13+ Safari", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
    expect(isSameSiteNoneIncompatible(ua)).toBe(false);
  });
});

// ─── OAuth state decoding ─────────────────────────────────────────────────────

function decodeState(state: string): string {
  try {
    const decoded = atob(state);
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      if (parsed.redirectUri) return parsed.redirectUri;
    }
    return decoded;
  } catch {
    return state;
  }
}

describe("OAuth state decoding", () => {
  it("decodes legacy plain redirectUri state", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const state = btoa(redirectUri);
    expect(decodeState(state)).toBe(redirectUri);
  });

  it("decodes new JSON state with returnPath and extracts redirectUri", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const state = btoa(JSON.stringify({ redirectUri, returnPath: "/join/ABC123" }));
    expect(decodeState(state)).toBe(redirectUri);
  });

  it("does not include returnPath in the decoded redirectUri", () => {
    const redirectUri = "https://granwatch.com/api/oauth/callback";
    const state = btoa(JSON.stringify({ redirectUri, returnPath: "/join/ABC123" }));
    const result = decodeState(state);
    expect(result).not.toContain("returnPath");
    expect(result).not.toContain("join");
  });

  it("handles malformed state gracefully", () => {
    const result = decodeState("not-valid-base64!!!");
    expect(typeof result).toBe("string");
  });
});
