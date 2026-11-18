/**
 * Ligne d'historique d'exécution : automatisation, date, résultat, fichiers
 * traités, puis détail des actions et erreurs à la demande.
 */
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, XCircle } from "@/components/icons";
import { countLabel } from "@/lib/copy";
import { formatDateValue, useT, type TFunction } from "@/lib/i18n";
import type { ExecutionRecord, ExecutionStatus } from "@/lib/automations/types";

function statusLabel(s: ExecutionStatus, tr: TFunction): string {
  switch (s) {
    case "ok":
      return tr("automations.history.page.status.ok");
    case "partial":
      return tr("automations.history.page.status.partial");
    case "failed":
      return tr("automations.history.page.status.failed");
    case "simulated":
      return tr("automations.history.page.status.simulated");
  }
}

function StatusIcon({ status }: { status: ExecutionStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (status === "partial") return <AlertTriangle className="h-5 w-5 text-warning" />;
  if (status === "failed") return <XCircle className="h-5 w-5 text-destructive" />;
  return <Clock3 className="h-5 w-5 text-muted-foreground" />;
}

const ACTION_DOT: Record<"ok" | "failed" | "skipped", string> = {
  ok: "bg-success",
  failed: "bg-destructive",
  skipped: "bg-muted-foreground/50",
};

export function HistoryEntry({
  record,
  timeOnly = false,
}: {
  record: ExecutionRecord;
  /** Sous un titre de jour, l'heure suffit. */
  timeOnly?: boolean;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const when = formatDateValue(
    record.startedAt,
    timeOnly ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" },
  );
  const hasDetails = record.actions.length > 0 || record.errors.length > 0;
  return (
    <li className="gf-settings-row">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        aria-expanded={hasDetails ? open : undefined}
        className="gf-press-row flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2"
          aria-label={statusLabel(record.status, tr)}
        >
          <StatusIcon status={record.status} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-foreground">
            {record.automationName}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {when} · {statusLabel(record.status, tr)}
            {record.filesProcessed ? ` · ${countLabel(record.filesProcessed, "file")}` : ""}
          </span>
        </span>
        {hasDetails ? (
          <ChevronDown
            className={`h-[18px] w-[18px] shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        ) : null}
      </button>
      {open ? (
        <div className="flex flex-col gap-2 px-4 pb-4 pl-[64px]">
          {record.actions.length ? (
            <ul className="flex flex-col gap-1.5">
              {record.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12.5px]">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${ACTION_DOT[a.status]}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground">{a.label}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {a.status === "failed"
                        ? tr("automations.history.page.actionFailed")
                        : a.status === "skipped"
                          ? tr("automations.history.page.actionSkipped")
                          : tr("automations.history.page.actionOk")}
                      {a.filesProcessed ? ` · ${countLabel(a.filesProcessed, "file")}` : ""}
                    </span>
                    {a.message ? (
                      <span className="mt-0.5 block text-muted-foreground">{a.message}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {record.errors.length ? (
            <ul className="flex flex-col gap-1 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px] leading-snug text-destructive">
              {record.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
