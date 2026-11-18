import { describe, expect, it } from "vitest";
import { buildGroupedRows } from "./grouped-rows";

describe("complete gallery scroll extent", () => {
  const groups = Array.from({ length: 1000 }, (_, index) => ({
    key: String(index),
    label: String(index),
    items: [index * 3, index * 3 + 1, index * 3 + 2],
  }));
  it("includes the last group immediately, not just eight groups", () => {
    const rows = buildGroupedRows(groups, 1, 72);
    expect(rows).toHaveLength(4000);
    expect(rows.at(-1)?.items).toEqual([2999]);
    expect(rows.reduce((height, row) => height + row.height, 0)).toBe(246000);
  });
  it("reserves all grid rows including incomplete final rows", () => {
    const rows = buildGroupedRows([{ key: "day", label: "Day", items: [1, 2, 3, 4] }], 3, 166);
    expect(rows.map((row) => row.height)).toEqual([30, 166, 166]);
    expect(rows.at(-1)?.items).toEqual([4]);
  });
});
