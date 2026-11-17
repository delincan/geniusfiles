import { Check, X } from "@/components/icons";
import { useT } from "@/lib/i18n";
import type { TaskSnapshot } from "@/lib/ai/session";
import { pipelineProgress } from "./progress";

export function PipelineTrace({ task }: { task: TaskSnapshot }) {
  const t = useT();
  if (task.phase === "idle" || task.steps.length === 0) return null;
  const current =
    task.steps.find((s) => s.state === "active" || s.state === "failed") ??
    task.steps[task.steps.length - 1];
  const progress = pipelineProgress(task);
  const completed = task.phase === "closing" && !task.failed && !task.cancelled;
  const label = task.failed
    ? t("assistant.error.title")
    : task.cancelled
      ? t("action.cancel")
      : completed
        ? t("action.done")
        : (current.detail ?? current.label);

  return (
    <div className="gf-chat-safe gf-pipeline-line py-2" aria-live="polite">
      <div className="mb-2 flex items-start gap-2 text-[13px]">
        {task.failed || task.cancelled ? (
          <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        ) : completed ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <span
            aria-hidden
            className="gf-pipeline-spin mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-primary/20 border-t-primary"
          />
        )}
        <span key={label} className="gf-pipeline-swap min-w-0 flex-1 text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{progress} %</span>
      </div>
      <div
        role="progressbar"
        aria-label={t("assistant.pipeline.ariaLabel", { label: current.label })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${label} · ${progress} %`}
        className="h-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${task.failed || task.cancelled ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
