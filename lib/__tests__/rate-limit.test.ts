import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (auditoría H3)", () => {
  it("permite hasta el límite y bloquea después", async () => {
    const key = `t-${Date.now()}`;
    for (let i = 0; i < 5; i++) expect(await rateLimit(key, 5, 60_000)).toBe(true);
    expect(await rateLimit(key, 5, 60_000)).toBe(false);
  });
  it("claves independientes no se afectan", async () => {
    const k = `a-${Date.now()}`;
    expect(await rateLimit(k, 1, 60_000)).toBe(true);
    expect(await rateLimit(k, 1, 60_000)).toBe(false);
    expect(await rateLimit(`b-${Date.now()}`, 1, 60_000)).toBe(true);
  });
});
