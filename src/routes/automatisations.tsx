/**
 * Automatisations — liste des règles, utilisations du jour et dernières
 * exécutions.
 *
 * La création et la modification se font dans un écran plein et dédié
 * (`/automatisations/editeur`), étape par étape. Une règle ne s'exécute
 * jamais à l'enregistrement : uniquement via « Exécuter » sur sa carte ou
 * par le planificateur au moment exact du déclencheur.
 */
import { useListScrollMemory } from "@/lib/files/use-list-scroll";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Filter, History, Play, Plus, Zap } from "@/components/icons";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { usePullToRefresh } from "@/lib/gestures/pull-refresh";
import { errorMessage } from "@/lib/errors/humanize";
import { ConfirmDialog } from "@/components/files/BottomSheet";
import { t as translateNow, useT } from "@/lib/i18n";
import { runAutomation } from "@/lib/automations/engine";
import { isQuotaExceeded } from "@/lib/quota/errors";
import { QuotaLimitNotice } from "@/components/quota/QuotaLimitNotice";
import { useQuota } from "@/lib/quota/useQuota";
import { loadExecutionHistory, subscribeExecutionHistory } from "@/lib/automations/history";
import { subscribeRunning } from "@/lib/automations/status";
import {
  deleteAutomation,
  duplicateAutomation,
  listAutomations,
  subscribeAutomations,
  toggleAutomation,
} from "@/lib/automations/store";
import { EmptyStateAd } from "@/components/ads/EmptyStateAd";
import { InlineAdBanner } from "@/components/ads/InlineAdBanner";
import { AutomationCard } from "@/components/automations/AutomationCard";
import { HistoryEntry } from "@/components/automations/HistoryEntry";
import type { Automation, ExecutionRecord } from "@/lib/automations/types";

export const Route = createFileRoute("/automatisations")({
  head: () => ({
    meta: [
      { title: "Automatisations — GeniusFiles" },
      {
        name: "description",
        content: translateNow("meta.automations.description"),
      },
      { property: "og:title", content: "Automatisations — GeniusFiles" },
      {
        property: "og:description",
        content: translateNow("meta.automations.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AutomationsPage,
});

const RECENT_RUNS = 3;

function AutomationsPage() {
  /* Position de la liste restituée au retour depuis un aperçu. */
  useListScrollMemory("automations", true);

  const tr = useT();
  const navigate = useNavigate();
  const [items, setItems] = useState<Automation[]>([]);
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Automation | null>(null);
  const [, forceTick] = useState(0);
  const [limitHit, setLimitHit] = useState(false);
  const quota = useQuota("automations");

  const refresh = useCallback(() => {
    setItems(listAutomations());
    setHistory(loadExecutionHistory());
  }, []);

  /* Tirer pour actualiser : relit les règles et l'historique réels. */
  usePullToRefresh(refresh);

  useEffect(() => {
    refresh();
    const un1 = subscribeAutomations(refresh);
    const un2 = subscribeExecutionHistory(refresh);
    const un3 = subscribeRunning(() => forceTick((n) => n + 1));
    return () => {
      un1();
      un2();
      un3();
    };
  }, [refresh]);

  const activeCount = useMemo(() => items.filter((a) => a.enabled).length, [items]);

  const openCreate = () =>
    void navigate({ to: "/automatisations/editeur", search: { id: undefined } });
  const openEdit = (a: Automation) =>
    void navigate({ to: "/automatisations/editeur", search: { id: a.id } });

  const runNow = async (a: Automation) => {
    try {
      const rec = await runAutomation(a, { simulate: false });
      if (rec.status === "ok") {
        toast.success(tr("automations.toast.ran.title"), {
          description: tr("automations.toast.ran.desc", { name: a.name }),
        });
      } else if (rec.status === "partial") {
        toast.warning(tr("automations.toast.partial.title"), {
          description: tr("automations.toast.partial.desc", {
            name: a.name,
            count: rec.errors.length,
          }),
        });
      } else {
        toast.error(tr("automations.toast.failed.title"), {
          description: rec.errors[0]
            ? errorMessage(new Error(rec.errors[0]))
            : tr("automations.toast.failed.desc", { name: a.name }),
        });
      }
    } catch (err) {
      if (isQuotaExceeded(err)) {
        setLimitHit(true);
        return;
      }
      toast.error(tr("automations.toast.failed.title"), {
        description: errorMessage(err, tr("automations.toast.failed.generic")),
      });
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={tr("automations.title")}
        subtitle={tr("automations.ui.subtitle")}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="gf-press flex h-10 items-center gap-1.5 rounded-xl bg-primary pl-3 pr-3.5 text-[13px] font-semibold text-primary-foreground"
          >
            <Plus className="h-[18px] w-[18px]" />
            {tr("automations.new")}
          </button>
        }
      />

      {/* L'avis complet n'apparaît qu'à la limite atteinte. */}
      {limitHit ? (
        <QuotaLimitNotice
          feature="automations"
          onClose={() => setLimitHit(false)}
          className="mt-4"
        />
      ) : null}

      <div className="animate-page-in flex flex-col gap-6 pb-4 pt-4">
        {items.length ? (
          <>
            <Overview
              total={items.length}
              active={activeCount}
              remaining={quota.remaining}
              quotaTotal={quota.total}
            />
            <section className="flex flex-col gap-3">
              <h2 className="px-1 type-subtitle text-foreground">
                {tr("automations.section.list")}
              </h2>
              <ul className="flex flex-col gap-3">
                {items.map((a) => (
                  <AutomationCard
                    key={a.id}
                    automation={a}
                    history={history}
                    onEdit={() => openEdit(a)}
                    onToggle={() => toggleAutomation(a.id, !a.enabled)}
                    onDuplicate={() => {
                      duplicateAutomation(a.id);
                      toast.success(tr("automations.toast.duplicated.title"), {
                        description: tr("automations.toast.duplicated.desc"),
                      });
                    }}
                    onDelete={() => setConfirmDelete(a)}
                    onRun={() => runNow(a)}
                  />
                ))}
              </ul>
            </section>
          </>
        ) : (
          <EmptyAutomations onCreate={openCreate} remaining={quota.remaining} />
        )}

        {/* Écran vide : le pavé publicitaire vient après le message et son
            bouton, dans l'espace réellement libre, et disparaît proprement
            si aucune annonce n'est disponible. */}
        {items.length === 0 ? <EmptyStateAd slot="empty-automations" /> : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="type-subtitle text-foreground">{tr("automations.ui.history.recent")}</h2>
            {history.length ? (
              <Link
                to="/automatisations/historique"
                className="-mr-2 flex h-10 items-center gap-0.5 rounded-xl px-2 text-[13px] font-semibold text-primary"
              >
                {tr("automations.ui.history.seeAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
          {history.length ? (
            <ul className="gf-card">
              {history.slice(0, RECENT_RUNS).map((h) => (
                <HistoryEntry key={h.id} record={h} />
              ))}
            </ul>
          ) : (
            <div className="gf-card flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
                <History className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground">
                  {tr("automations.history.none")}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {tr("automations.history.hint")}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Page remplie : bannière adaptative en fin de flux. */}
      {items.length > 0 ? <InlineAdBanner slot="automations-list" /> : null}

      <ConfirmDialog
        open={!!confirmDelete}
        title={tr("automations.delete.title")}
        danger
        confirmLabel={tr("action.delete")}
        description={
          <>
            {tr("automations.delete.desc.before")}
            <span className="font-medium text-foreground"> {confirmDelete?.name} </span>
            {tr("automations.delete.desc.after")}
          </>
        }
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteAutomation(confirmDelete.id);
            toast.success(tr("automations.toast.deleted.title"), {
              description: tr("automations.toast.deleted.desc", { name: confirmDelete.name }),
            });
          }
          setConfirmDelete(null);
        }}
      />
    </AppShell>
  );
}

/** Vue d'ensemble : règles, actives et utilisations restantes aujourd'hui. */
function Overview({
  total,
  active,
  remaining,
  quotaTotal,
}: {
  total: number;
  active: number;
  remaining: number;
  quotaTotal: number;
}) {
  const tr = useT();
  const cells = [
    { value: String(total), label: tr("automations.ui.overview.rules") },
    { value: String(active), label: tr("automations.ui.overview.active") },
    {
      value: quotaTotal > 0 ? `${remaining}/${quotaTotal}` : String(remaining),
      label: tr("automations.ui.overview.usesLeft"),
    },
  ];
  return (
    <div className="gf-card grid grid-cols-3 divide-x divide-border/60">
      {cells.map((c) => (
        <div key={c.label} className="flex min-w-0 flex-col gap-1 px-3 py-3.5">
          <span
            suppressHydrationWarning
            className="text-[20px] font-bold leading-none tabular-nums text-foreground"
          >
            {c.value}
          </span>
          <span className="truncate text-[12px] text-muted-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Aucune règle : la mascotte, une phrase, une action, et le principe en trois temps. */
function EmptyAutomations({ onCreate, remaining }: { onCreate: () => void; remaining: number }) {
  const tr = useT();
  const steps = [
    { icon: Zap, title: tr("automations.step.trigger"), desc: tr("automations.ui.how.trigger") },
    {
      icon: Filter,
      title: tr("automations.step.conditions"),
      desc: tr("automations.ui.how.conditions"),
    },
    { icon: Play, title: tr("automations.step.actions"), desc: tr("automations.ui.how.actions") },
  ];
  return (
    <>
      <div className="gf-card flex flex-col items-center px-5 pb-5 pt-5 text-center">
        <img
          src="/onboarding/step-6.webp"
          alt=""
          width={120}
          height={160}
          className="h-[150px] w-auto object-contain"
        />
        <h2 className="mt-3 type-title text-foreground">{tr("automations.ui.empty.title")}</h2>
        <p className="mt-1.5 max-w-[300px] text-[13.5px] leading-relaxed text-muted-foreground">
          {tr("automations.ui.empty.desc")}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="gf-press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
          {tr("automations.ui.empty.cta")}
        </button>
        <p suppressHydrationWarning className="mt-3 text-[12px] text-muted-foreground">
          {remaining > 0 ? tr("quota.remaining", { count: remaining }) : tr("quota.none")}
        </p>
      </div>
      <ol className="gf-card">
        {steps.map((s, i) => (
          <li key={s.title} className="gf-settings-row flex items-center gap-3 px-4 py-3">
            <span className="gf-option-icon">
              <s.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-foreground">
                {i + 1}. {s.title}
              </span>
              <span className="block text-[12px] leading-snug text-muted-foreground">{s.desc}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
