import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (auditoría H3)", () => {
  it("permite hasta el límite y bloquea después", () => {
    const key = `t-${Date.now()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000)).toBe(true);
    expect(rateLimit(key, 5, 60_000)).toBe(false);
  });
  it("claves independientes no se afectan", () => {
    const k = `a-${Date.now()}`;
    expect(rateLimit(k, 1, 60_000)).toBe(true);
    expect(rateLimit(k, 1, 60_000)).toBe(false);
    expect(rateLimit(`b-${Date.now()}`, 1, 60_000)).toBe(true);
  });
});
