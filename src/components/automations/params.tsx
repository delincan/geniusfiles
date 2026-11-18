/**
 * Réglages détaillés d'un déclencheur, d'une condition ou d'une action.
 * Les valeurs enregistrées gardent exactement leur format d'origine.
 */
import { TextField } from "@/components/files/BottomSheet";
import { Segmented } from "@/components/settings/controls";
import { getOpenableModules, getWeekDays } from "@/lib/automations/catalog";
import { useT } from "@/lib/i18n";
import type { Action, Condition, Trigger } from "@/lib/automations/types";
import { DestinationField, Field, SelectField, SelectionField } from "./fields";

const MB = 1024 * 1024;
const GB = 1024 * MB;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function TriggerParams({
  trigger,
  onChange,
}: {
  trigger: Trigger;
  onChange: (t: Trigger) => void;
}) {
  const tr = useT();
  const WEEK_DAYS = getWeekDays(tr);
  if (trigger.kind === "scheduled_time" || trigger.kind === "daily") {
    return (
      <Field label={tr("automations.field.time")}>
        <input
          type="time"
          value={trigger.at}
          onChange={(e) => onChange({ ...trigger, at: e.target.value })}
          className="gf-input"
        />
      </Field>
    );
  }
  if (trigger.kind === "weekly") {
    return (
      <div className="flex flex-col gap-4">
        <Field label={tr("automations.field.days")}>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map((label, idx) => {
              const active = trigger.days.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    const set = new Set(trigger.days);
                    if (active) set.delete(idx);
                    else set.add(idx);
                    onChange({ ...trigger, days: Array.from(set).sort() });
                  }}
                  className={`gf-press flex h-11 items-center justify-center rounded-xl text-[12.5px] font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={tr("automations.field.time")}>
          <input
            type="time"
            value={trigger.at}
            onChange={(e) => onChange({ ...trigger, at: e.target.value })}
            className="gf-input"
          />
        </Field>
      </div>
    );
  }
  if (trigger.kind === "file_added" || trigger.kind === "folder_changed") {
    return (
      <Field label={tr("automations.trigger.folderLabel")}>
        <TextField
          value={trigger.folder}
          onChange={(folder) => onChange({ ...trigger, folder })}
          placeholder="/DCIM/Camera"
        />
      </Field>
    );
  }
  if (trigger.kind === "storage_low") {
    return (
      <Field label={tr("automations.trigger.thresholdLabel")}>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={trigger.thresholdPct}
          onChange={(e) =>
            onChange({
              ...trigger,
              thresholdPct: Math.max(1, Math.min(99, Number(e.target.value) || 10)),
            })
          }
          className="gf-input"
        />
      </Field>
    );
  }
  return null;
}

/** Réglages d'une action. Toutes les sélections de fichiers sont typées. */
export function ActionParams({
  action,
  onChange,
}: {
  action: Action;
  onChange: (a: Action) => void;
}) {
  const tr = useT();
  const OPENABLE_MODULES = getOpenableModules(tr);
  switch (action.kind) {
    case "copy":
    case "move":
    case "backup":
      return (
        <div className="flex flex-col gap-4">
          <SelectionField
            label={tr("automations.field.sourceGeneric")}
            selection={action.source}
            onChange={(source) => onChange({ ...action, source })}
          />
          <DestinationField
            label={tr("automations.field.destination")}
            path={action.destination}
            onChange={(destination) => onChange({ ...action, destination })}
          />
        </div>
      );
    case "trash":
      return (
        <SelectionField
          label={tr("automations.field.sourceTrash")}
          selection={action.source}
          onChange={(source) => onChange({ ...action, source })}
        />
      );
    case "rename":
      return (
        <div className="flex flex-col gap-4">
          <SelectionField
            label={tr("automations.field.sourceRename")}
            selection={action.source}
            onChange={(source) => onChange({ ...action, source })}
          />
          <Field
            label={tr("automations.ui.renamePattern")}
            hint={tr("automations.ui.renameVars", { vars: "{name} {ext} {date} {time}" })}
          >
            <TextField
              value={action.pattern}
              onChange={(pattern) => onChange({ ...action, pattern })}
              placeholder="{date}-{name}"
            />
          </Field>
        </div>
      );
    case "compress":
      return (
        <div className="flex flex-col gap-4">
          <SelectionField
            label={tr("automations.field.sourceCompress")}
            selection={action.source}
            onChange={(source) => onChange({ ...action, source })}
          />
          <DestinationField
            label={tr("automations.field.archiveFolder")}
            path={action.destination}
            onChange={(destination) => onChange({ ...action, destination })}
          />
          <Field label={tr("automations.field.archiveName")}>
            <TextField
              value={action.archiveName}
              onChange={(archiveName) => onChange({ ...action, archiveName })}
              placeholder="archive.zip"
            />
          </Field>
        </div>
      );
    case "extract":
      return (
        <div className="flex flex-col gap-4">
          <SelectionField
            label={tr("automations.field.archiveToExtract")}
            selection={action.archive}
            onChange={(archive) => onChange({ ...action, archive })}
            singleFileOnly
          />
          <DestinationField
            label={tr("automations.field.destination")}
            path={action.destination}
            onChange={(destination) => onChange({ ...action, destination })}
          />
        </div>
      );
    case "mkdir":
      return (
        <div className="flex flex-col gap-4">
          <DestinationField
            label={tr("automations.field.createIn")}
            path={action.parent}
            onChange={(parent) => onChange({ ...action, parent })}
          />
          <Field label={tr("automations.field.folderName")}>
            <TextField
              value={action.name}
              onChange={(name) => onChange({ ...action, name })}
              placeholder={tr("action.newFolder")}
            />
          </Field>
        </div>
      );
    case "organize":
      return (
        <div className="flex flex-col gap-4">
          <DestinationField
            label={tr("automations.field.folderToOrganize")}
            path={action.folder}
            onChange={(folder) => onChange({ ...action, folder })}
          />
          <Field label={tr("automations.field.rule")}>
            <Segmented
              ariaLabel={tr("automations.field.rule")}
              value={action.rule}
              onChange={(rule) => onChange({ ...action, rule })}
              options={[
                { value: "type", label: tr("automations.ui.rule.type") },
                { value: "date", label: tr("automations.ui.rule.date") },
                { value: "name", label: tr("automations.ui.rule.name") },
              ]}
            />
          </Field>
        </div>
      );
    case "cleaner_scan":
      return (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {tr("automations.field.cleanerHint")}
        </p>
      );
    case "notify":
      return (
        <Field label={tr("automations.field.notifyMessage")}>
          <TextField
            value={action.message}
            onChange={(message) => onChange({ ...action, message })}
            placeholder={tr("automations.field.notifyPlaceholder")}
          />
        </Field>
      );
    case "open_module":
      return (
        <Field label={tr("automations.ui.module")}>
          <SelectField
            ariaLabel={tr("automations.ui.module")}
            value={action.route}
            onChange={(route) => onChange({ ...action, route })}
            options={OPENABLE_MODULES.map((m) => ({ value: m.route, label: m.label }))}
          />
        </Field>
      );
  }
}

export function ConditionParams({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
}) {
  const tr = useT();
  switch (condition.kind) {
    case "file_type":
      return (
        <TextField
          value={condition.types.join(", ")}
          onChange={(v) =>
            onChange({
              ...condition,
              types: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder={tr("automations.condition.fileTypePlaceholder")}
        />
      );
    case "size_min":
    case "size_max":
      return (
        <UnitNumber
          value={round2(condition.bytes / MB)}
          unit={tr("automations.ui.unit.mb")}
          onChange={(n) => onChange({ ...condition, bytes: Math.round(n * MB) })}
        />
      );
    case "name_contains":
      return (
        <TextField
          value={condition.text}
          onChange={(text) => onChange({ ...condition, text })}
          placeholder={tr("automations.condition.nameContainsPlaceholder")}
        />
      );
    case "location":
      return (
        <TextField
          value={condition.folder}
          onChange={(folder) => onChange({ ...condition, folder })}
          placeholder={tr("automations.condition.locationPlaceholder")}
        />
      );
    case "created_after":
    case "modified_after":
      return (
        <input
          type="date"
          value={condition.date}
          onChange={(e) => onChange({ ...condition, date: e.target.value })}
          className="gf-input"
        />
      );
    case "storage_available":
      return (
        <UnitNumber
          value={round2(condition.minBytes / GB)}
          unit={tr("automations.ui.unit.gb")}
          onChange={(n) => onChange({ ...condition, minBytes: Math.round(n * GB) })}
        />
      );
  }
}

function UnitNumber({
  value,
  unit,
  onChange,
}: {
  value: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="gf-input pr-14"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}
