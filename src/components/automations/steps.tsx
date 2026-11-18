/**
 * Étapes de l'éditeur d'automatisation, chacune affichée seule sur un écran
 * plein : déclencheur, conditions, actions, réglages, vérification.
 */
import { useMemo, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from "@/components/icons";
import { TextField } from "@/components/files/BottomSheet";
import { Toggle } from "@/components/settings/controls";
import {
  getActionCatalog,
  getConditionCatalog,
  getTriggerCatalog,
} from "@/lib/automations/catalog";
import {
  defaultAction,
  defaultCondition,
  defaultTrigger,
  triggerSummary,
  validateAction,
  type Draft,
} from "@/lib/automations/draft";
import { buildPreview, type ActionPreview } from "@/lib/automations/engine";
import { useT } from "@/lib/i18n";
import type { Action, Condition, Trigger, TriggerKind } from "@/lib/automations/types";
import { ACTION_ICON, CONDITION_ICON, TRIGGER_ICON } from "./kind-icons";
import { Field } from "./fields";
import { ActionParams, ConditionParams, TriggerParams } from "./params";

const TRIGGERS_WITH_PARAMS: TriggerKind[] = [
  "scheduled_time",
  "daily",
  "weekly",
  "file_added",
  "folder_changed",
  "storage_low",
];

/** Après un ajout, remonte en haut de l'étape pour montrer l'élément ajouté. */
function showAdded() {
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
}

export function StepIntro({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="type-title text-foreground">{title}</h2>
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function Overline({ children }: { children: ReactNode }) {
  return <h3 className="px-1 type-overline">{children}</h3>;
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? "border-primary" : "border-border-strong"
      }`}
    >
      {checked ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`gf-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        danger ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ─────────────────────── 1 — Déclencheur ─────────────────────── */

export function TriggerStep({
  trigger,
  onChange,
}: {
  trigger: Trigger;
  onChange: (t: Trigger) => void;
}) {
  const tr = useT();
  const catalog = getTriggerCatalog(tr);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={tr("automations.ui.trigger.title")}
        desc={tr("automations.ui.trigger.desc")}
      />
      <ul
        role="radiogroup"
        aria-label={tr("automations.step.trigger")}
        className="flex flex-col gap-2"
      >
        {catalog.map((entry) => {
          const selected = entry.kind === trigger.kind;
          const Icon = TRIGGER_ICON[entry.kind];
          return (
            <li key={entry.kind} className="flex flex-col gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  if (!selected) onChange(defaultTrigger(entry.kind));
                }}
                className="gf-option"
              >
                <span className="gf-option-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium text-foreground">
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
                    {entry.description}
                  </span>
                </span>
                <RadioMark checked={selected} />
              </button>
              {selected && TRIGGERS_WITH_PARAMS.includes(entry.kind) ? (
                <div className="gf-card px-4 py-4">
                  <TriggerParams trigger={trigger} onChange={onChange} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────── 2 — Conditions ─────────────────────── */

export function ConditionsStep({
  conditions,
  onChange,
}: {
  conditions: Condition[];
  onChange: (c: Condition[]) => void;
}) {
  const tr = useT();
  const catalog = getConditionCatalog(tr);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={tr("automations.ui.conditions.title")}
        desc={tr("automations.ui.conditions.desc")}
      />

      {conditions.length ? (
        <section className="flex flex-col gap-2">
          <Overline>{tr("automations.summaryStep.conditions")}</Overline>
          <ul className="flex flex-col gap-2">
            {conditions.map((c, i) => {
              const Icon = CONDITION_ICON[c.kind];
              return (
                <li key={i} className="gf-card flex flex-col gap-3 px-4 pb-4 pt-2">
                  <div className="-mr-2 flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                      {catalog.find((e) => e.kind === c.kind)?.label}
                    </span>
                    <IconButton
                      label={tr("automations.conditions.remove")}
                      onClick={() => onChange(conditions.filter((_, j) => j !== i))}
                    >
                      <X className="h-5 w-5" />
                    </IconButton>
                  </div>
                  <ConditionParams
                    condition={c}
                    onChange={(next) => onChange(conditions.map((cc, j) => (j === i ? next : cc)))}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          {tr("automations.conditions.empty")}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <Overline>{tr("automations.ui.conditions.available")}</Overline>
        <ul className="gf-card">
          {catalog.map((entry) => {
            const Icon = CONDITION_ICON[entry.kind];
            return (
              <li key={entry.kind} className="gf-settings-row">
                <button
                  type="button"
                  onClick={() => {
                    onChange([...conditions, defaultCondition(entry.kind)]);
                    showAdded();
                  }}
                  className="gf-press-row flex min-h-[60px] w-full items-center gap-4 px-4 py-3 text-left"
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-foreground">
                      {entry.label}
                    </span>
                    <span className="block text-[12px] leading-snug text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                  <Plus className="h-5 w-5 shrink-0 text-primary" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ─────────────────────── 3 — Actions ─────────────────────── */

export function ActionsStep({
  actions,
  onChange,
}: {
  actions: Action[];
  onChange: (a: Action[]) => void;
}) {
  const tr = useT();
  const catalog = getActionCatalog(tr);
  const move = (from: number, to: number) => {
    const copy = [...actions];
    [copy[from], copy[to]] = [copy[to], copy[from]];
    onChange(copy);
  };
  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={tr("automations.ui.actions.title")}
        desc={tr("automations.ui.actions.desc")}
      />

      {actions.length ? (
        <section className="flex flex-col gap-2">
          <Overline>{tr("automations.ui.actions.selected")}</Overline>
          <ol className="gf-card">
            {actions.map((a, i) => {
              const Icon = ACTION_ICON[a.kind];
              return (
                <li
                  key={i}
                  className="gf-settings-row flex min-h-[60px] items-center gap-3 py-2 pl-4 pr-1.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                    {catalog.find((e) => e.kind === a.kind)?.label}
                  </span>
                  {i > 0 ? (
                    <IconButton label={tr("automations.ui.moveUp")} onClick={() => move(i, i - 1)}>
                      <ArrowUp className="h-[18px] w-[18px]" />
                    </IconButton>
                  ) : null}
                  {i < actions.length - 1 ? (
                    <IconButton
                      label={tr("automations.ui.moveDown")}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown className="h-[18px] w-[18px]" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    label={tr("automations.actions.remove")}
                    onClick={() => onChange(actions.filter((_, j) => j !== i))}
                  >
                    <X className="h-5 w-5" />
                  </IconButton>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <Overline>{tr("automations.ui.actions.available")}</Overline>
        <ul className="gf-card">
          {catalog.map((entry) => {
            const Icon = ACTION_ICON[entry.kind];
            return (
              <li key={entry.kind} className="gf-settings-row">
                <button
                  type="button"
                  onClick={() => {
                    onChange([...actions, defaultAction(entry.kind)]);
                    showAdded();
                  }}
                  className="gf-press-row flex min-h-[60px] w-full items-center gap-4 px-4 py-3 text-left"
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      entry.kind === "trash" ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-foreground">
                      {entry.label}
                    </span>
                    <span className="block text-[12px] leading-snug text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                  <Plus className="h-5 w-5 shrink-0 text-primary" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ─────────────────────── 4 — Réglages ─────────────────────── */

export function SettingsStep({
  actions,
  onChange,
}: {
  actions: Action[];
  onChange: (a: Action[]) => void;
}) {
  const tr = useT();
  const catalog = getActionCatalog(tr);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={tr("automations.ui.settings.title")}
        desc={tr("automations.ui.settings.desc")}
      />
      <ol className="flex flex-col gap-3">
        {actions.map((a, i) => {
          const Icon = ACTION_ICON[a.kind];
          const ok = !validateAction(a);
          return (
            <li key={i} className="gf-card flex flex-col gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                  {catalog.find((e) => e.kind === a.kind)?.label}
                </span>
                {ok ? (
                  <Check
                    className="h-5 w-5 shrink-0 text-primary"
                    aria-label={tr("automations.ui.settings.ready")}
                  />
                ) : null}
              </div>
              <ActionParams
                action={a}
                onChange={(next) => onChange(actions.map((aa, j) => (j === i ? next : aa)))}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ─────────────────────── 5 — Vérification ─────────────────────── */

export function ReviewStep({
  draft,
  onName,
  onDescription,
  onEnabled,
  onGoTo,
}: {
  draft: Draft;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onEnabled: (v: boolean) => void;
  onGoTo: (step: 1 | 2 | 3 | 4) => void;
}) {
  const tr = useT();
  const conditionCatalog = getConditionCatalog(tr);
  const preview: ActionPreview[] = useMemo(
    () =>
      buildPreview({
        id: draft.id ?? "draft",
        name: draft.name || tr("automations.summaryStep.unnamed"),
        description: draft.description,
        enabled: draft.enabled,
        trigger: draft.trigger,
        conditions: draft.conditions,
        actions: draft.actions,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        runCount: 0,
        source: "manual",
      }),
    [draft, tr],
  );
  const TriggerIcon = TRIGGER_ICON[draft.trigger.kind];

  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={tr("automations.ui.review.title")}
        desc={tr("automations.ui.review.desc")}
      />

      <div className="flex flex-col gap-4">
        <Field label={tr("automations.summaryStep.name")}>
          <TextField
            value={draft.name}
            onChange={onName}
            placeholder={tr("automations.summaryStep.namePlaceholder")}
          />
        </Field>
        <Field label={tr("automations.summaryStep.description")}>
          <TextField
            value={draft.description}
            onChange={onDescription}
            placeholder={tr("automations.summaryStep.descriptionPlaceholder")}
          />
        </Field>
      </div>

      <div className="gf-card">
        <ReviewBlock title={tr("automations.summaryStep.trigger")} onEdit={() => onGoTo(1)}>
          <p className="flex items-center gap-2 text-[14px] font-medium text-foreground">
            <TriggerIcon className="h-[18px] w-[18px] shrink-0 text-primary" />
            {triggerSummary(draft.trigger)}
          </p>
        </ReviewBlock>
        <ReviewBlock title={tr("automations.summaryStep.conditions")} onEdit={() => onGoTo(2)}>
          {draft.conditions.length ? (
            <ul className="flex flex-col gap-1 text-[13.5px] text-foreground">
              {draft.conditions.map((c, i) => (
                <li key={i}>{conditionCatalog.find((e) => e.kind === c.kind)?.label}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-muted-foreground">
              {tr("automations.ui.review.noCondition")}
            </p>
          )}
        </ReviewBlock>
        <ReviewBlock
          title={tr("automations.summaryStep.actionsPlanned", { count: preview.length })}
          onEdit={() => onGoTo(3)}
        >
          <ol className="flex flex-col gap-2.5">
            {preview.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-foreground">{step.label}</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </ReviewBlock>
      </div>

      <div className="gf-card flex items-center gap-4 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-medium text-foreground">
            {tr("automations.ui.review.enable")}
          </span>
          <span className="block text-[12px] leading-snug text-muted-foreground">
            {tr("automations.ui.review.enableHint")}
          </span>
        </span>
        <Toggle
          checked={draft.enabled}
          onChange={onEnabled}
          ariaLabel={tr("automations.ui.review.enable")}
        />
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const tr = useT();
  return (
    <section data-divider="full" className="gf-settings-row flex flex-col gap-2 px-4 pb-4 pt-2">
      <div className="-mr-2 flex items-center justify-between gap-2">
        <h3 className="type-overline">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="gf-press flex h-10 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-primary"
        >
          <Pencil className="h-4 w-4" />
          {tr("automations.ui.review.edit")}
        </button>
      </div>
      {children}
    </section>
  );
}
