import { describe, expect, it } from "vitest";
import { transferResultKind } from "./result";
import type { TransferTask } from "./manager";

const task: TransferTask = {
  id: "confirmed-copy",
  mode: "copy",
  status: "done",
  title: "report.pdf",
  sourceLabel: "Documents",
  destLabel: "Backup",
  destination: { rootId: "internal", segments: ["Backup"] },
  startedAt: 1,
  endedAt: 2,
  total: 3,
  completed: 3,
  bytes: 30,
  totalBytes: 30,
  speedBps: 0,
  succeeded: 3,
  skipped: 0,
  overwritten: 0,
  renamed: 0,
  failures: [],
};
describe("confirmed illustrated transfer outcomes", () => {
  it("offers a copy result only after actual success", () => {
    expect(transferResultKind({ ...task, status: "running" })).toBeNull();
    expect(transferResultKind(task)).toBe("copyDone");
  });
  it("distinguishes a successful move from a copy", () => {
    expect(transferResultKind({ ...task, mode: "move" })).toBe("moveDone");
  });
  it("never announces partial failure as success", () => {
    expect(
      transferResultKind({
        ...task,
        status: "failed",
        succeeded: 2,
        failures: [{ name: "a", reason: "EACCES" }],
      }),
    ).toBeNull();
  });
  it("does not show success for cancelled or entirely skipped operations", () => {
    expect(transferResultKind({ ...task, status: "cancelled" })).toBeNull();
    expect(transferResultKind({ ...task, succeeded: 0, skipped: 3 })).toBeNull();
  });
  it("recognizes real exhausted storage", () => {
    expect(
      transferResultKind({
        ...task,
        status: "failed",
        failures: [{ name: "a", reason: "ENOSPC: no space left on device" }],
      }),
    ).toBe("lowSpace");
  });
  it("does not conflate RAM, access errors or running work with exhausted storage", () => {
    for (const reason of ["OutOfMemoryError", "Permission denied", "Unknown failure"]) {
      expect(
        transferResultKind({ ...task, status: "failed", failures: [{ name: "a", reason }] }),
      ).toBeNull();
    }
    expect(
      transferResultKind({
        ...task,
        status: "running",
        failures: [{ name: "a", reason: "ENOSPC" }],
      }),
    ).toBeNull();
  });
});
