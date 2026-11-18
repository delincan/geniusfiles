/**
 * Éditeur d'automatisation — écran plein, une étape à la fois.
 *
 *   1. Déclencheur   2. Conditions (facultatif)   3. Actions
 *   4. Réglages      5. Vérification et enregistrement
 *
 * L'enregistrement n'exécute jamais la règle et n'envoie aucune
 * notification. Retour Android : étape précédente, puis confirmation
 * d'abandon si des modifications n'ont pas été enregistrées.
 */
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, SearchX } from "@/components/icons";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/files/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { MissingHint } from "@/components/automations/fields";
import {
  ActionsStep,
  ConditionsStep,
  ReviewStep,
  SettingsStep,
  TriggerStep,
} from "@/components/automations/steps";
import {
  emptyDraft,
  fromAutomation,
  validateActions,
  validateConditions,
  validateTrigger,
  type Draft,
} from "@/lib/automations/draft";
import { getAutomation, saveAutomation } from "@/lib/automations/store";
import { BACK_PRIORITY, canGoBackInApp, useBackHandler } from "@/lib/navigation/back-stack";
import { t as translateNow, useT } from "@/lib/i18n";

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL = 5;

const STEP_LABEL: Record<Step, string> = {
  1: "automations.step.trigger",
  2: "automations.step.conditions",
  3: "automations.step.actions",
  4: "automations.ui.step.settings",
  5: "automations.ui.step.review",
};

export const Route = createFileRoute("/automatisations_/editeur")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === "string" && search.id ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: translateNow("meta.automationEditor.title") },
      { name: "description", content: translateNow("meta.automationEditor.description") },
      { property: "og:title", content: translateNow("meta.automationEditor.title") },
      { property: "og:description", content: translateNow("meta.automationEditor.description") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutomationEditorPage,
});

function AutomationEditorPage() {
  const tr = useT();
  const { id } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<Draft | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  /* Le stockage local n'existe que côté appareil : lecture après montage. */
  useEffect(() => {
    if (id) {
      const found = getAutomation(id);
      if (!found) {
        setMissing(true);
        return;
      }
      const d = fromAutomation(found);
      setInitial(d);
      setDraft(d);
    } else {
      const d = emptyDraft();
      setInitial(d);
      setDraft(d);
    }
    setMissing(false);
    setStep(1);
  }, [id]);

  const dirty = useMemo(
    () => !!draft && !!initial && JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  const leave = useCallback(() => {
    if (canGoBackInApp()) router.history.back();
    else void navigate({ to: "/automatisations", replace: true });
  }, [router, navigate]);

  /* Retour : étape précédente, sinon confirmation d'abandon. */
  useBackHandler(step > 1, () => {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
    window.scrollTo({ top: 0 });
    return true;
  });
  useBackHandler(step === 1 && dirty, () => {
    setConfirmDiscard(true);
    return true;
  });

  const goTo = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    if (step > 1) goTo((step - 1) as Step);
    else if (dirty) setConfirmDiscard(true);
    else leave();
  };

  if (missing) {
    return (
      <AppShell immersive>
        <EditorHeader title={tr("automations.wizard.editTitle")} onBack={leave} />
        <EmptyState
          icon={SearchX}
          title={tr("automations.ui.notFound")}
          action={
            <button
              type="button"
              onClick={leave}
              className="gf-press flex h-12 items-center rounded-xl bg-surface-2 px-5 text-[14px] font-semibold text-foreground"
            >
              {tr("action.back")}
            </button>
          }
        />
      </AppShell>
    );
  }

  if (!draft) {
    return (
      <AppShell immersive>
        <EditorHeader
          title={id ? tr("automations.wizard.editTitle") : tr("automations.wizard.createTitle")}
          onBack={leave}
        />
      </AppShell>
    );
  }

  const triggerErr = validateTrigger(draft.trigger);
  const conditionErr = validateConditions(draft.conditions);
  const actionErr = validateActions(draft.actions);
  const missingMessage: Record<Step, string | undefined> = {
    1: triggerErr,
    2: conditionErr,
    3: draft.actions.length ? undefined : tr("automations.actions.err.needOne"),
    4: actionErr,
    5: draft.name.trim() ? undefined : tr("automations.wizard.nameRequired"),
  };
  const blocker = missingMessage[step];

  const submit = () => {
    /* Garde-fou : chaque étape est revalidée avant l'enregistrement. */
    const firstInvalid = ([1, 2, 3, 4, 5] as Step[]).find((s) => missingMessage[s]);
    if (firstInvalid) {
      toast.error(missingMessage[firstInvalid]);
      goTo(firstInvalid);
      return;
    }
    saveAutomation({
      id: draft.id,
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      enabled: draft.enabled,
      trigger: draft.trigger,
      conditions: draft.conditions,
      actions: draft.actions,
    });
    toast.success(
      draft.id ? tr("automations.toast.updated.title") : tr("automations.toast.created.title"),
      {
        description: draft.id
          ? tr("automations.toast.updated.desc")
          : tr("automations.toast.created.desc"),
      },
    );
    setInitial(draft);
    leave();
  };

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <AppShell immersive>
      <div className="flex min-h-dvh flex-col">
        <EditorHeader
          title={
            draft.id ? tr("automations.wizard.editTitle") : tr("automations.wizard.createTitle")
          }
          subtitle={tr("automations.ui.stepOf", {
            current: step,
            total: TOTAL,
            label: tr(STEP_LABEL[step]),
          })}
          step={step}
          onBack={back}
        />

        <div key={step} className="animate-page-in flex-1 pb-6 pt-5">
          {step === 1 ? (
            <TriggerStep trigger={draft.trigger} onChange={(trigger) => update({ trigger })} />
          ) : null}
          {step === 2 ? (
            <ConditionsStep
              conditions={draft.conditions}
              onChange={(conditions) => update({ conditions })}
            />
          ) : null}
          {step === 3 ? (
            <ActionsStep actions={draft.actions} onChange={(actions) => update({ actions })} />
          ) : null}
          {step === 4 ? (
            <SettingsStep actions={draft.actions} onChange={(actions) => update({ actions })} />
          ) : null}
          {step === 5 ? (
            <ReviewStep
              draft={draft}
              onName={(name) => update({ name })}
              onDescription={(description) => update({ description })}
              onEnabled={(enabled) => update({ enabled })}
              onGoTo={goTo}
            />
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-border/60 bg-background px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <MissingHint message={blocker} />
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="gf-press flex h-12 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-5 text-[15px] font-semibold text-foreground"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
                {tr("action.back")}
              </button>
            ) : null}
            {step < TOTAL ? (
              <button
                type="button"
                disabled={!!blocker}
                onClick={() => goTo((step + 1) as Step)}
                className="gf-press flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
              >
                {step === 2 && draft.conditions.length === 0
                  ? tr("automations.ui.conditions.skip")
                  : tr("action.next")}
                <ArrowRight className="h-[18px] w-[18px]" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!!blocker}
                onClick={submit}
                className="gf-press flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
              >
                <Check className="h-[18px] w-[18px]" />
                {draft.id ? tr("action.save") : tr("automations.wizard.create")}
              </button>
            )}
          </div>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title={tr("automations.ui.discard.title")}
        description={tr("automations.ui.discard.desc")}
        confirmLabel={tr("automations.ui.discard.confirm")}
        danger
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          setInitial(draft);
          leave();
        }}
      />
    </AppShell>
  );
}

function EditorHeader({
  title,
  subtitle,
  step,
  onBack,
}: {
  title: string;
  subtitle?: string;
  step?: Step;
  onBack: () => void;
}) {
  const tr = useT();
  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background pt-safe">
      <div className="flex items-center gap-2 py-2 pl-2 pr-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={tr("action.back")}
          className="gf-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground"
        >
          <ArrowLeft className="h-[22px] w-[22px]" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold leading-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {step ? (
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL}
          aria-valuenow={step}
          aria-label={subtitle}
          className="grid grid-cols-5 gap-1 px-4 pb-3"
        >
          {Array.from({ length: TOTAL }, (_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-colors duration-300 ${
                i < step ? "bg-primary" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      ) : null}
    </header>
  );
}
