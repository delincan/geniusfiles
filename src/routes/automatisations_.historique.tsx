/**
 * Historique complet des exécutions d'automatisations.
 *
 * Écran dédié (hors de la liste) qui reprend le journal
 * `gf.automations.history` et le compteur `runCount` de chaque règle.
 * Les exécutions sont regroupées par jour ; chaque ligne déplie le détail
 * des actions et des erreurs. Synchronisé via les évènements des modules
 * d'historique et de stockage.
 */
import { useListScrollMemory } from "@/lib/files/use-list-scroll";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, Trash2 } from "@/components/icons";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { formatDateValue, useT, t as translate } from "@/lib/i18n";
import { BackButton } from "@/components/navigation/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/common/useConfirm";
import { HistoryEntry } from "@/components/automations/HistoryEntry";
import {
  clearExecutionHistory,
  loadExecutionHistory,
  subscribeExecutionHistory,
} from "@/lib/automations/history";
import { listAutomations, subscribeAutomations } from "@/lib/automations/store";
import type { Automation, ExecutionRecord } from "@/lib/automations/types";

export const Route = createFileRoute("/automatisations_/historique")({
  head: () => ({
    meta: [
      { title: translate("meta.automationHistory.title") },
      {
        name: "description",
        content: translate("meta.automationHistory.description"),
      },
      { property: "og:title", content: translate("meta.automationHistory.title") },
      {
        property: "og:description",
        content: translate("meta.automationHistory.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function HistoryPage() {
  /* Position de la liste restituée au retour depuis un aperçu. */
  useListScrollMemory("automations-history", true);

  const tr = useT();
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [rules, setRules] = useState<Automation[]>([]);
  const confirm = useConfirm();

  useEffect(() => {
    const refresh = () => {
      setHistory(loadExecutionHistory());
      setRules(listAutomations());
    };
    refresh();
    const u1 = subscribeExecutionHistory(refresh);
    const u2 = subscribeAutomations(refresh);
    return () => {
      u1();
      u2();
    };
  }, []);

  const days = useMemo(() => {
    const groups: { key: string; label: string; items: ExecutionRecord[] }[] = [];
    for (const h of history) {
      const key = dayKey(h.startedAt);
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = {
          key,
          label: formatDateValue(h.startedAt, { weekday: "long", day: "numeric", month: "long" }),
          items: [],
        };
        groups.push(g);
      }
      g.items.push(h);
    }
    return groups;
  }, [history]);

  const ranRules = useMemo(() => rules.filter((r) => r.runCount > 0), [rules]);

  return (
    <AppShell>
      <PageHeader
        leading={
          <BackButton
            className="gf-press -ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground"
            size={22}
          />
        }
        compact
        title={tr("automations.ui.history.title")}
        subtitle={tr("automations.history.page.retained", { count: history.length })}
        action={
          history.length ? (
            <button
              type="button"
              onClick={() =>
                confirm.ask(
                  {
                    title: tr("automations.history.page.clearConfirm.title"),
                    description: tr("automations.history.page.clearConfirm.desc", {
                      count: history.length,
                    }),
                    confirmLabel: tr("automations.history.page.clearConfirm.confirm"),
                    tone: "danger",
                  },
                  () => clearExecutionHistory(),
                )
              }
              className="gf-press flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {tr("automations.history.page.clear")}
            </button>
          ) : null
        }
      />

      <div className="animate-page-in flex flex-col gap-6 pb-4 pt-4">
        {history.length === 0 ? (
          <div className="gf-card">
            <EmptyState
              icon={HistoryIcon}
              title={tr("automations.history.page.emptyTitle")}
              description={tr("automations.history.page.emptyDesc")}
              action={
                <Link
                  to="/automatisations"
                  className="gf-press flex h-11 items-center rounded-xl bg-surface-2 px-4 text-[14px] font-semibold text-foreground"
                >
                  {tr("automations.section.list")}
                </Link>
              }
            />
          </div>
        ) : (
          days.map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <h2 className="px-1 type-overline first-letter:uppercase">{g.label}</h2>
              <ul className="gf-card">
                {g.items.map((h) => (
                  <HistoryEntry key={h.id} record={h} timeOnly />
                ))}
              </ul>
            </section>
          ))
        )}

        {ranRules.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 type-overline">{tr("automations.history.page.rulesSection")}</h2>
            <ul className="gf-card">
              {ranRules.map((r) => (
                <li
                  key={r.id}
                  data-divider="text"
                  className="gf-settings-row flex min-h-[56px] items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">{r.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {r.lastRunAt
                        ? tr("automations.history.page.lastRun", {
                            when: formatDateValue(r.lastRunAt, {
                              dateStyle: "short",
                              timeStyle: "short",
                            }),
                          })
                        : tr("automations.history.page.neverRun")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[12px] font-semibold tabular-nums text-foreground">
                    {r.runCount}×
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {confirm.dialog}
    </AppShell>
  );
}
