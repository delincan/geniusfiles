import type { TaskSnapshot } from "@/lib/ai/session";

/** Completion of reported milestones, not an estimate of elapsed/remaining time. */
export function pipelineProgress(task: TaskSnapshot): number {
  if (task.phase === "idle" || task.steps.length === 0) return 0;
  if (task.phase === "closing" && !task.failed && !task.cancelled) return 100;
  const completed = task.steps.filter((step) => step.state === "done").length;
  return Math.min(80, Math.floor((completed / task.steps.length) * 100));
}

/** Never expose the current result before the final completion callback. */
export function shouldHoldAnswer(task: TaskSnapshot, busy: boolean): boolean {
  return busy || task.phase === "running";
}