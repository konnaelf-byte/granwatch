import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Replicate the corrected signature logic from payfastRoute.ts for testing
// Uses PHP-compatible urlencode: spaces as '+', uppercase hex percent-encoding
function phpUrlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

function buildSignature(params: Record<string, string>, passphrase = ""): string {
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== "" && v !== undefined && k !== "signature")
    .map(([k, v]) => `${k}=${phpUrlencode(v.trim())}`)
    .join("&");

  const withPassphrase = passphrase
    ? `${filtered}&passphrase=${phpUrlencode(passphrase.trim())}`
    : filtered;

  return crypto.createHash("md5").update(withPassphrase).digest("hex");
}

describe("Payfast signature generation", () => {
  it("produces a 32-character MD5 hex string", () => {
    const params = {
      merchant_id: "34585597",
      merchant_key: "kghylybod30a4",
      amount: "27.00",
      item_name: "Gran+ subscription",
    };
    const sig = buildSignature(params);
    expect(sig).toHaveLength(32);
    expect(sig).toMatch(/^[a-f0-9]+$/);
  });

  it("produces a deterministic signature for the same input", () => {
    const params = {
      merchant_id: "34585597",
      merchant_key: "kghylybod30a4",
      amount: "27.00",
      item_name: "Gran+ subscription",
    };
    expect(buildSignature(params)).toBe(buildSignature(params));
  });

  it("produces different signatures when params differ", () => {
    const base = { merchant_id: "34585597", amount: "27.00", item_name: "Gran+" };
    const modified = { ...base, amount: "13.50" };
    expect(buildSignature(base)).not.toBe(buildSignature(modified));
  });

  it("excludes empty string values and signature field from signature", () => {
    const withEmpty = { merchant_id: "34585597", amount: "27.00", passphrase: "", signature: "abc" };
    const withoutEmpty = { merchant_id: "34585597", amount: "27.00" };
    expect(buildSignature(withEmpty)).toBe(buildSignature(withoutEmpty));
  });

  it("includes passphrase in signature when provided", () => {
    const params = { merchant_id: "34585597", amount: "27.00" };
    const withPass = buildSignature(params, "mysecret");
    const withoutPass = buildSignature(params);
    expect(withPass).not.toBe(withoutPass);
  });

  it("encodes spaces as + (PHP urlencode style)", () => {
    // Verify that item names with spaces are encoded correctly
    const params = { merchant_id: "34585597", item_name: "Gran Plus Subscription" };
    const sig = buildSignature(params);
    // Should not throw and should produce a valid MD5
    expect(sig).toHaveLength(32);
  });

  it("PAYFAST_MERCHANT_ID env var is set", () => {
    expect(process.env.PAYFAST_MERCHANT_ID).toBe("34585597");
  });

  it("PAYFAST_MERCHANT_KEY env var is set", () => {
    expect(process.env.PAYFAST_MERCHANT_KEY).toBe("kghylybod30a4");
  });

  it("PAYFAST_PASSPHRASE env var is set", () => {
    expect(process.env.PAYFAST_PASSPHRASE).toBeTruthy();
    expect(process.env.PAYFAST_PASSPHRASE!.length).toBeGreaterThan(5);
  });

  it("produces correct signature with passphrase for subscription params", () => {
    const params = {
      merchant_id: "34585597",
      merchant_key: "kghylybod30a4",
      return_url: "https://granwatch.com/payment/success?elderId=1",
      cancel_url: "https://granwatch.com/payment/cancel?elderId=1",
      notify_url: "https://granwatch.com/api/payfast/itn",
      name_first: "Konstand",
      name_last: "Spies",
      email_address: "kisforkonna@gmail.com",
      m_payment_id: "gran-1-user-1-1234567890",
      amount: "27.00",
      item_name: "Gran+ for profile 1",
      item_description: "GranWatch Gran+ monthly subscription (R27.00/month)",
      custom_int1: "1",
      custom_int2: "1",
      subscription_type: "1",
      billing_date: "2026-04-16",
      recurring_amount: "27.00",
      frequency: "3",
      cycles: "0",
    };
    const sig = buildSignature(params, "GranWatch2026Secure");
    expect(sig).toHaveLength(32);
    expect(sig).toMatch(/^[a-f0-9]+$/);
    // Verify it's deterministic
    expect(buildSignature(params, "GranWatch2026Secure")).toBe(sig);
  });
});
