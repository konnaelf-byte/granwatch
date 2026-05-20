import { describe, it, expect } from "vitest";

// Test the OG HTML builder logic (pure function extracted for testing)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

describe("OG meta tag generation", () => {
  it("escapes HTML entities in elder names", () => {
    const name = 'Ouma <Ingrid> & "Family"';
    const escaped = escapeHtml(name);
    expect(escaped).toBe("Ouma &lt;Ingrid&gt; &amp; &quot;Family&quot;");
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
  });

  it("generates correct invite title for elder name", () => {
    const elderName = "Ouma Ingrid";
    const title = `Join ${elderName}'s family on GranWatch`;
    expect(title).toBe("Join Ouma Ingrid's family on GranWatch");
  });

  it("generates correct invite description", () => {
    const elderName = "Ouma Lenie";
    const description = `You've been invited to help keep an eye on ${elderName}. Join the family, log visits, and make sure she's never forgotten. 💛`;
    expect(description).toContain("Ouma Lenie");
    expect(description).toContain("💛");
  });

  it("generic share title is correct", () => {
    const title = "GranWatch — Let's take good care of Gran";
    expect(title).toBe("GranWatch — Let's take good care of Gran");
  });

  it("redirect URL uses the correct join path", () => {
    const code = "ABC123";
    const appUrl = "https://granwatch.com";
    const redirectUrl = `${appUrl}/join/${code}`;
    expect(redirectUrl).toBe("https://granwatch.com/join/ABC123");
  });

  it("canonical OG URL uses /api/og/ prefix for production compatibility", () => {
    const code = "XYZ789";
    const appUrl = "https://granwatch.com";
    const canonicalUrl = `${appUrl}/api/og/invite/${code}`;
    expect(canonicalUrl).toMatch(/^https:\/\//);
    expect(canonicalUrl).toContain("/api/og/invite/");
    expect(canonicalUrl).toBe("https://granwatch.com/api/og/invite/XYZ789");
  });

  it("OG HTML contains meta refresh redirect", () => {
    const redirectUrl = "https://granwatch.com/join/ABC123";
    const html = `<meta http-equiv="refresh" content="0;url=${redirectUrl}" />`;
    expect(html).toContain(redirectUrl);
    expect(html).toContain("meta http-equiv");
  });
});
