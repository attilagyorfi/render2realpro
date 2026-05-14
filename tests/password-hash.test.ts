import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/services/auth/profile-store";

describe("password hashing", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$2[abxy]\$/);
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("not the password", hash)).resolves.toBe(false);
  });

  it("refuses passwords shorter than 8 characters", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/at least 8/);
  });

  it("verifyPassword returns false on empty hash without throwing", async () => {
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
  });
});
