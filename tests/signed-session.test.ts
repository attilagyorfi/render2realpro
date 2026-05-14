import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  // Pin the secret so the test doesn't rely on the dev-fallback random
  // value, which would change between processes and prevent any cross-call
  // verification from succeeding.
  process.env.RENDER2REAL_SESSION_SECRET =
    "test-secret-deterministic-32chars-minimum-aaaa";
});

describe("signed session cookie", () => {
  it("round-trips userId and embeds a future expiry", async () => {
    const mod = await import("@/services/auth/signed-session");
    const cookie = mod.buildSessionCookieValue("user-abc");
    const verified = mod.verifySessionCookieValue(cookie);

    expect(verified).not.toBeNull();
    expect(verified!.userId).toBe("user-abc");
    expect(verified!.expiresAtMs).toBeGreaterThan(Date.now());
  });

  it("rejects a cookie whose payload was tampered with", async () => {
    const mod = await import("@/services/auth/signed-session");
    const cookie = mod.buildSessionCookieValue("user-abc");
    const [, sig] = cookie.split(".");
    // Encode a different userId with the original signature.
    const evilPayload = Buffer.from(
      JSON.stringify({ u: "user-attacker", e: Date.now() + 60_000 }),
      "utf-8"
    ).toString("base64url");
    const forged = `${evilPayload}.${sig}`;

    expect(mod.verifySessionCookieValue(forged)).toBeNull();
  });

  it("rejects a cookie with a wrong signature", async () => {
    const mod = await import("@/services/auth/signed-session");
    const cookie = mod.buildSessionCookieValue("user-abc");
    const [encoded] = cookie.split(".");
    const tampered = `${encoded}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;

    expect(mod.verifySessionCookieValue(tampered)).toBeNull();
  });

  it("rejects an expired cookie", async () => {
    const mod = await import("@/services/auth/signed-session");
    // ttlSeconds = 0 → expiry is in the past after the await/microtask cycle.
    const cookie = mod.buildSessionCookieValue("user-abc", 0);
    // Make sure even a fast machine sees the cookie as expired by waiting
    // 5ms past the issue moment.
    await new Promise((r) => setTimeout(r, 5));

    expect(mod.verifySessionCookieValue(cookie)).toBeNull();
  });

  it("rejects malformed inputs without throwing", async () => {
    const mod = await import("@/services/auth/signed-session");

    expect(mod.verifySessionCookieValue(null)).toBeNull();
    expect(mod.verifySessionCookieValue(undefined)).toBeNull();
    expect(mod.verifySessionCookieValue("")).toBeNull();
    expect(mod.verifySessionCookieValue("not-a-cookie")).toBeNull();
    expect(mod.verifySessionCookieValue("only.one")).toBeNull();
    expect(mod.verifySessionCookieValue("a.b.c")).toBeNull();
  });
});
