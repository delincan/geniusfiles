/**
 * Brouillon d'automatisation et règles de validation de l'éditeur.
 *
 * Partagé par la liste (création / modification) et l'éditeur pleine page :
 * le format enregistré reste strictement celui de `store.ts`.
 */
import { getWeekDays } from "./catalog";
import { t as translateNow } from "@/lib/i18n";
import type {
  Action,
  ActionKind,
  Automation,
  Condition,
  ConditionKind,
  Trigger,
  TriggerKind,
} from "./types";

export type Draft = {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
};

export function emptyDraft(): Draft {
  return {
    name: "",
    description: "",
    enabled: true,
    trigger: { kind: "daily", at: "09:00" },
    conditions: [],
    actions: [],
  };
}

export function fromAutomation(a: Automation): Draft {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? "",
    enabled: a.enabled,
    trigger: a.trigger,
    conditions: a.conditions.map((c) => ({ ...c })),
    actions: a.actions.map((c) => ({ ...c })),
  };
}

export function defaultTrigger(kind: TriggerKind): Trigger {
  switch (kind) {
    case "scheduled_time":
      return { kind, at: nextRoundTime() };
    case "daily":
      return { kind, at: "09:00" };
    case "weekly":
      return { kind, at: "09:00", days: [1, 2, 3, 4, 5] };
    case "app_open":
      return { kind };
    case "file_added":
      return { kind, folder: "" };
    case "folder_changed":
      return { kind, folder: "" };
    case "storage_low":
      return { kind, thresholdPct: 10 };
    case "device_connected":
      return { kind, deviceType: "any" };
  }
}

function nextRoundTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}`;
}

export function triggerSummary(t: Trigger): string {
  switch (t.kind) {
    case "scheduled_time":
      return translateNow("automations.summary.once", { at: t.at });
    case "daily":
      return translateNow("automations.summary.daily", { at: t.at });
    case "weekly":
      return translateNow("automations.summary.weekly", {
        days:
          t.days.map((d) => getWeekDays(translateNow)[d]).join(", ") ||
          translateNow("automations.summary.weeklyNoDay"),
        at: t.at,
      });
    case "app_open":
      return translateNow("automations.summary.appOpen");
    case "file_added":
      return t.folder
        ? translateNow("automations.summary.fileAddedFolder", { folder: t.folder })
        : translateNow("automations.summary.fileAdded");
    case "folder_changed":
      return t.folder
        ? translateNow("automations.summary.folderChanged", { folder: t.folder })
        : translateNow("automations.summary.folderChangedGeneric");
    case "storage_low":
      return translateNow("automations.summary.storageLow", { pct: t.thresholdPct });
    case "device_connected":
      return translateNow("automations.summary.deviceConnected");
  }
}

export function validateTrigger(t: Trigger): string | undefined {
  const validHM = (s: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim());
  switch (t.kind) {
    case "scheduled_time":
    case "daily":
      return validHM(t.at) ? undefined : translateNow("automations.trigger.err.time");
    case "weekly":
      if (!validHM(t.at)) return translateNow("automations.trigger.err.time");
      if (!t.days.length) return translateNow("automations.trigger.err.days");
      return undefined;
    case "file_added":
    case "folder_changed":
      return t.folder.trim() ? undefined : translateNow("automations.trigger.err.folder");
    case "storage_low":
      return t.thresholdPct >= 1 && t.thresholdPct <= 99
        ? undefined
        : translateNow("automations.trigger.err.threshold");
    default:
      return undefined;
  }
}

export function defaultAction(kind: ActionKind): Action {
  switch (kind) {
    case "copy":
    case "move":
    case "backup":
      return { kind };
    case "rename":
      return { kind, pattern: "{date}-{name}" };
    case "trash":
      return { kind };
    case "compress":
      return { kind, archiveName: "archive.zip" };
    case "extract":
      return { kind };
    case "mkdir":
      return { kind, name: "" };
    case "organize":
      return { kind, rule: "type" };
    case "cleaner_scan":
      return { kind };
    case "notify":
      return { kind, message: "" };
    case "open_module":
      return { kind, route: "/" };
  }
}

export function validateAction(a: Action): string | undefined {
  switch (a.kind) {
    case "copy":
    case "move":
    case "backup":
      if (!a.source || a.source.entries.length === 0)
        return translateNow("automations.action.err.selectItem");
      if (!a.destination) return translateNow("automations.action.err.selectDestination");
      return undefined;
    case "trash":
      if (!a.source || a.source.entries.length === 0)
        return translateNow("automations.action.err.selectItem");
      return undefined;
    case "rename":
      if (!a.source || a.source.entries.length === 0)
        return translateNow("automations.action.err.selectFile");
      if (!a.pattern.trim()) return translateNow("automations.action.err.pattern");
      return undefined;
    case "compress":
      if (!a.source || a.source.entries.length === 0)
        return translateNow("automations.action.err.selectFile");
      if (!a.destination) return translateNow("automations.action.err.archiveFolder");
      if (!a.archiveName.trim()) return translateNow("automations.action.err.archiveName");
      return undefined;
    case "extract":
      if (!a.archive || a.archive.entries.length === 0)
        return translateNow("automations.action.err.selectArchive");
      if (!a.destination) return translateNow("automations.action.err.selectDestination");
      return undefined;
    case "mkdir":
      if (!a.parent) return translateNow("automations.action.err.location");
      if (!a.name.trim()) return translateNow("automations.action.err.folderName");
      return undefined;
    case "organize":
      if (!a.folder) return translateNow("automations.action.err.folderToOrganize");
      return undefined;
    case "notify":
      if (!a.message.trim()) return translateNow("automations.action.err.notifyMessage");
      return undefined;
    default:
      return undefined;
  }
}

export function validateActions(actions: Action[]): string | undefined {
  if (!actions.length) return translateNow("automations.actions.err.needOne");
  for (let i = 0; i < actions.length; i++) {
    const err = validateAction(actions[i]);
    if (err) return translateNow("automations.actions.err.numbered", { index: i + 1, error: err });
  }
  return undefined;
}

export function defaultCondition(kind: ConditionKind): Condition {
  switch (kind) {
    case "file_type":
      return { kind, types: [] };
    case "size_min":
      return { kind, bytes: 1024 * 1024 };
    case "size_max":
      return { kind, bytes: 100 * 1024 * 1024 };
    case "name_contains":
      return { kind, text: "" };
    case "location":
      return { kind, folder: "" };
    case "created_after":
    case "modified_after":
      return { kind, date: new Date().toISOString().slice(0, 10) };
    case "storage_available":
      return { kind, minBytes: 1024 * 1024 * 1024 };
  }
}

export function validateCondition(c: Condition): string | undefined {
  switch (c.kind) {
    case "file_type":
      return c.types.length ? undefined : translateNow("automations.conditions.err.types");
    case "name_contains":
      return c.text.trim() ? undefined : translateNow("automations.conditions.err.keyword");
    case "location":
      return c.folder.trim() ? undefined : translateNow("automations.conditions.err.folder");
    default:
      return undefined;
  }
}

export function validateConditions(conditions: Condition[]): string | undefined {
  for (const c of conditions) {
    const err = validateCondition(c);
    if (err) return err;
  }
  return undefined;
}
