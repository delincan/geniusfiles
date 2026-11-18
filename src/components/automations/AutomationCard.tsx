/**
 * Carte compacte d'une automatisation : nom, objectif, état, déclencheur,
 * dernière exécution, puis actions (exécuter, plus d'options).
 */
import { useState } from "react";
import {
  Clock3,
  Copy,
  Loader2,
  MoreVertical,
  Pencil,
  Play,
  Power,
  Trash2,
} from "@/components/icons";
import { BottomSheet } from "@/components/files/BottomSheet";
import { SheetActionRow, SheetDivider } from "@/components/files/SheetActionRow";
import { Toggle } from "@/components/settings/controls";
import { getActionCatalog } from "@/lib/automations/catalog";
import { triggerSummary } from "@/lib/automations/draft";
import { displayStatus, isRunning } from "@/lib/automations/status";
import { formatDateValue, useT } from "@/lib/i18n";
import type { Automation, ExecutionRecord } from "@/lib/automations/types";
import { TRIGGER_ICON } from "./kind-icons";

export function StatusBadge({
  label,
  dot,
  pulse,
}: {
  label: string;
  dot: string;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/90">
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}

export function AutomationCard({
  automation,
  history,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  onRun,
}: {
  automation: Automation;
  history: ExecutionRecord[];
  onEdit: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRun: () => Promise<void>;
}) {
  const tr = useT();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const st = displayStatus(automation, history);
  const running = isRunning(automation.id) || busy;
  const lastReal = history.find((r) => r.automationId === automation.id && !r.simulated);
  const Icon = TRIGGER_ICON[automation.trigger.kind];
  const catalog = getActionCatalog(tr);
  const objective =
    automation.description?.trim() ||
    automation.actions
      .map((a) => catalog.find((c) => c.kind === a.kind)?.label)
      .filter(Boolean)
      .join(" · ");

  const run = async () => {
    if (running) return;
    setBusy(true);
    try {
      await onRun();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="gf-card">
      <div className="flex items-start gap-2 pl-4 pr-3 pt-4">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="gf-option-icon" data-active={automation.enabled}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 pt-0.5">
            <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">
              {automation.name}
            </span>
            {objective ? (
              <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-muted-foreground">
                {objective}
              </span>
            ) : null}
          </span>
        </button>
        <Toggle
          checked={automation.enabled}
          onChange={onToggle}
          ariaLabel={
            automation.enabled ? tr("automations.toggle.disable") : tr("automations.toggle.enable")
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pb-3 pt-2.5 pl-[68px]">
        <StatusBadge label={st.label} dot={st.dot} pulse={st.status === "running"} />
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{triggerSummary(automation.trigger)}</span>
        </span>
      </div>

      <div className="flex items-center gap-1 border-t border-border/60 py-1.5 pl-4 pr-1.5">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {lastReal
              ? tr("automations.card.lastRun", {
                  when: formatDateValue(lastReal.finishedAt, {
                    dateStyle: "short",
                    timeStyle: "short",
                  }),
                })
              : tr("automations.ui.card.never")}
          </span>
        </span>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="gf-press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-primary disabled:opacity-70"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? tr("automations.card.running") : tr("automations.ui.card.run")}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={tr("automations.ui.card.more")}
          className="gf-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <BottomSheet sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={automation.name}>
        <div className="-mx-2 flex flex-col">
          <SheetActionRow
            icon={Pencil}
            label={tr("automations.ui.card.edit")}
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
          />
          <SheetActionRow
            icon={Power}
            label={
              automation.enabled
                ? tr("automations.toggle.disable")
                : tr("automations.toggle.enable")
            }
            onClick={() => {
              setMenuOpen(false);
              onToggle();
            }}
          />
          <SheetActionRow
            icon={Play}
            label={tr("automations.card.run")}
            onClick={() => {
              setMenuOpen(false);
              void run();
            }}
          />
          <SheetActionRow
            icon={Copy}
            label={tr("automations.card.duplicate")}
            onClick={() => {
              setMenuOpen(false);
              onDuplicate();
            }}
          />
          <SheetDivider />
          <SheetActionRow
            icon={Trash2}
            label={tr("automations.card.delete")}
            danger
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
          />
        </div>
      </BottomSheet>
    </li>
  );
}
