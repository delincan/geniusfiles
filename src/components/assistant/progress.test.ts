import { describe, expect, it } from "vitest";
import type { TaskSnapshot, TaskStep } from "@/lib/ai/session";
import { pipelineProgress, shouldHoldAnswer } from "./progress";

const steps: TaskStep[] = ["understand", "plan", "execute", "verify", "respond"].map((id) => ({
  id: id as TaskStep["id"],
  label: id,
  state: "pending",
}));
const running: TaskSnapshot = { phase: "running", steps, failed: false, cancelled: false };

describe("real pipeline completion", () => {
  it("does not advance without completed milestones", () => {
    expect(pipelineProgress(running)).toBe(0);
    expect(
      pipelineProgress({ ...running, steps: steps.map((s) => ({ ...s, state: "active" })) }),
    ).toBe(0);
  });
  it("counts completed milestones without reaching 100 during work", () => {
    expect(
      pipelineProgress({
        ...running,
        steps: steps.map((s, i) => ({ ...s, state: i < 2 ? "done" : "pending" })),
      }),
    ).toBe(40);
    expect(
      pipelineProgress({ ...running, steps: steps.map((s) => ({ ...s, state: "done" })) }),
    ).toBe(80);
  });
  it("reaches 100 only after successful completion", () => {
    expect(pipelineProgress({ ...running, phase: "closing" })).toBe(100);
  });
  it("never reports a failed operation as 100", () => {
    expect(
      pipelineProgress({
        ...running,
        phase: "closing",
        failed: true,
        steps: steps.map((s) => ({ ...s, state: "done" })),
      }),
    ).toBe(80);
  });
  it("never reports a cancelled operation as 100", () => {
    expect(
      pipelineProgress({
        ...running,
        phase: "closing",
        cancelled: true,
        steps: steps.map((s) => ({ ...s, state: "done" })),
      }),
    ).toBe(80);
  });
  it("holds generated text until the processing has finished", () => {
    expect(shouldHoldAnswer(running, false)).toBe(true);
    expect(shouldHoldAnswer({ ...running, phase: "idle" }, true)).toBe(true);
    expect(shouldHoldAnswer({ ...running, phase: "closing" }, false)).toBe(false);
  });
});
