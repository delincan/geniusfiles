import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { sameRoots, useRoots } from "./useRoots";

describe("useRoots", () => {
  it("keeps the same storage lists between redraws so the search does not restart forever", () => {
    const { result, rerender } = renderHook(() => useRoots());
    const first = result.current;
    rerender();
    rerender();
    expect(result.current.available).toBe(first.available);
    expect(result.current.roots).toBe(first.roots);
  });

  it("treats identical storage lists as unchanged and differing ones as changed", () => {
    const a = [{ id: "internal", label: "Interne", available: true }] as never;
    const b = [{ id: "internal", label: "Interne", available: true }] as never;
    const c = [{ id: "internal", label: "Interne", available: false }] as never;
    expect(sameRoots(a, b)).toBe(true);
    expect(sameRoots(a, c)).toBe(false);
  });
});
