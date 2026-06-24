import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { scanRubric } from "../src/rubric.js";

const FIXTURES = path.join(__dirname, "fixtures");

describe("rubric scanner", () => {
  it("flags a toast-only test as below threshold", async () => {
    const results = await scanRubric([path.join(FIXTURES, "weak", "toast-only.spec.ts")], 70);
    expect(results.length).toBeGreaterThan(0);
    const r = results[0];
    expect(r.score).toBeLessThan(70);
    expect(r.findings.some((f) => f.rule.id === "TOAST_ONLY")).toBe(true);
  });

  it("flags weak .toBeTruthy assertions", async () => {
    const results = await scanRubric([path.join(FIXTURES, "weak", "truthy-only.spec.ts")], 70);
    expect(results.some((r) => r.findings.some((f) => f.rule.id === "WEAK_TO_BE_TRUTHY"))).toBe(true);
  });

  it("flags added waitForTimeout calls", async () => {
    const results = await scanRubric([path.join(FIXTURES, "weak", "wait-for-timeout.spec.ts")], 70);
    expect(results.some((r) => r.findings.some((f) => f.rule.id === "HIDDEN_WAIT_FOR_TIMEOUT"))).toBe(true);
  });

  it("flags broad selectors", async () => {
    const results = await scanRubric([path.join(FIXTURES, "weak", "broad-selector.spec.ts")], 70);
    expect(results.some((r) => r.findings.some((f) => f.rule.id === "BROAD_SELECTOR"))).toBe(true);
  });

  it("passes a well-written test", async () => {
    const results = await scanRubric([path.join(FIXTURES, "strong", "transfer.spec.ts")], 70);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(70);
    }
  });
});
