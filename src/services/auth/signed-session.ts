/**
 * signed-session.ts
 *
 * Encodes and verifies the value stored in the session cookie. The
 * payload (userId + expiry timestamp) is HMAC-signed with
 * appEnv.sessionSecret so a tampered cookie cannot pose as another user.
 *
 * Cookie value format:
 *   <base64url(payload)>.<base64url(hmac-sha256(secret, payload))>
 *
 * payload itself is a JSON string: {"u":"<userId>","e":<expiresAtMs>}
 *
 * Constant-time comparison via crypto.timingSafeEqual is used on the
 * signature check.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { appEnv } from "@/config/env";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type SessionPayload = {
  u: string; // userId
  e: number; // expiresAtMs (epoch milliseconds)
};

function signPayload(serialized: string): string {
  return createHmac("sha256", appEnv.sessionSecret)
    .update(serialized)
    .digest("base64url");
}

function safeEqualBase64Url(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "base64url");
    const bBuf = Buffer.from(b, "base64url");
    if (aBuf.length === 0 || aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export function buildSessionCookieValue(
  userId: string,
  ttlSeconds: number = SESSION_MAX_AGE_SECONDS
): string {
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  const payload: SessionPayload = { u: userId, e: expiresAtMs };
  const serialized = JSON.stringify(payload);
  const encoded = Buffer.from(serialized, "utf-8").toString("base64url");
  const sig = signPayload(serialized);
  return `${encoded}.${sig}`;
}

export type VerifiedSession = {
  userId: string;
  expiresAtMs: number;
};

/**
 * Validates a cookie value and returns the embedded userId + expiry on
 * success. Returns null if the value is malformed, the HMAC doesn't
 * match the current secret, or the session has expired.
 */
export function verifySessionCookieValue(
  value: string | undefined | null
): VerifiedSession | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  let serialized: string;
  try {
    serialized = Buffer.from(encodedPayload, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const expectedSig = signPayload(serialized);
  if (!safeEqualBase64Url(providedSig, expectedSig)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(serialized) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.u !== "string" || typeof payload.e !== "number") {
    return null;
  }

  if (Date.now() >= payload.e) return null; // expired

  return { userId: payload.u, expiresAtMs: payload.e };
}
