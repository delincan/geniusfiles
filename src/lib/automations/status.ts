/**
 * Couleurs : jetons sémantiques uniquement (bleu = en cours, vert = réussi,
 * orange = partiel, rouge = échec, gris = désactivé ou en attente).
 *
 * Derive the display status of an automation from the execution history
 * plus a live "running" set maintained by the engine.
 */
import { loadExecutionHistory } from "./history";
import type { Automation, DisplayStatus, ExecutionRecord } from "./types";
import { t } from "@/lib/i18n";

const running = new Set<string>();
const listeners = new Set<() => void>();

export function markRunning(id: string) {
  running.add(id);
  listeners.forEach((l) => l());
}
export function markStopped(id: string) {
  running.delete(id);
  listeners.forEach((l) => l());
}
export function isRunning(id: string) {
  return running.has(id);
}
export function subscribeRunning(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function lastRealRun(id: string, history?: ExecutionRecord[]): ExecutionRecord | undefined {
  const h = history ?? loadExecutionHistory();
  return h.find((r) => r.automationId === id && !r.simulated);
}

export function displayStatus(
  a: Automation,
  history?: ExecutionRecord[],
): { status: DisplayStatus; label: string; tone: string; dot: string } {
  if (isRunning(a.id))
    return {
      status: "running",
      label: t("automations.status.running"),
      tone: "bg-primary-soft text-primary",
      dot: "bg-primary",
    };
  if (!a.enabled)
    return {
      status: "disabled",
      label: t("automations.status.disabled"),
      tone: "bg-surface-2 text-muted-foreground",
      dot: "bg-muted-foreground/40",
    };
  const last = lastRealRun(a.id, history);
  if (!last)
    return {
      status: "pending",
      label: t("automations.status.pending"),
      tone: "bg-surface-2 text-muted-foreground",
      dot: "bg-muted-foreground",
    };
  if (last.status === "ok")
    return {
      status: "success",
      label: t("automations.status.success"),
      tone: "bg-success/10 text-success",
      dot: "bg-success",
    };
  if (last.status === "partial")
    return {
      status: "partial",
      label: t("automations.status.partial"),
      tone: "bg-warning/10 text-warning",
      dot: "bg-warning",
    };
  return {
    status: "failed",
    label: t("automations.status.failed"),
    tone: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  };
}
