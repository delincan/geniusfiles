/**
 * Paramètres — organisation par catégories.
 *
 * Général, Fichiers, Stockage, Automatisations, Notifications, À propos.
 * Chaque ligne pilote un réglage réel (appliqué à l'application ou au
 * téléphone) ou ouvre un écran existant : aucun réglage fictif.
 *
 * Tous les textes proviennent de `@/lib/i18n`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { InlineAdBanner } from "@/components/ads/InlineAdBanner";
import { useAdSlot } from "@/lib/ads/useAdSlot";
import {
  ArrowUpDown,
  Bell,
  Check,
  Clock3,
  Eraser,
  Eye,
  FileText,
  Folder,
  LayoutGrid,
  LayoutList,
  Type,
  HardDrive,
  History,
  Mail,
  MonitorSmartphone,
  Moon,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  Waves,
  Zap,
} from "@/components/icons";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import {
  SettingsAction,
  SettingsChoiceRow,
  SettingsLink,
  SettingsNavRow,
  SettingsRow,
  SettingsSection,
  SettingsStackedRow,
} from "@/components/settings/SettingsCard";
import { ChoiceSheet, Segmented, Toggle } from "@/components/settings/controls";
import {
  trashRetentionOptions,
  loadFoldersFirst,
  loadSort,
  loadTrashRetention,
  loadView,
  saveFoldersFirst,
  saveSort,
  saveTrashRetention,
  saveView,
  type TrashRetentionDays,
} from "@/lib/files/preferences";
import type { SortKey, SortOrder, ViewMode } from "@/lib/files/types";
import { DEFAULT_PREFS, usePrefs, type ThemeMode } from "@/lib/personalization";
import {
  LOCALES,
  LOCALE_LABELS,
  formatBytes,
  translate,
  t as tr,
  resolveLocale,
  useLocalePreference,
  useT,
  type LocalePreference,
} from "@/lib/i18n";
import { clearThumbnailCache } from "@/lib/native/thumbnails";
import { sweepTempFiles } from "@/lib/native/temp-sweep";
import {
  RECENT_WINDOW_OPTIONS,
  normalizeRecentWindow,
  recentWindowLabel,
} from "@/lib/recents/window";
import {
  checkStoragePermission,
  isStorageManaged,
  requestStoragePermission,
  type StoragePermissionState,
} from "@/lib/native/storage-permission";
import { useStorageStats } from "@/lib/native/use-storage-stats";
import { useQuota } from "@/lib/quota/useQuota";

/* Injectée au build depuis `package.json` (voir vite.config.ts). */
const APP_VERSION = __APP_VERSION__;

/** Identifiant Android de GeniusFiles (voir capacitor.config.ts). */
const APP_PACKAGE = "app.geniusfiles.mobile";
const SUPPORT_EMAIL = "geniusfiles.contact@gmail.com";

const SORT_KEYS: SortKey[] = ["name", "date", "size", "type"];
const SORT_ORDERS: SortOrder[] = ["asc", "desc"];

/** Drapeaux associés à chaque option de langue (système = globe). */
const LOCALE_FLAGS: Record<LocalePreference, string> = {
  system: "🌐",
  fr: "🇫🇷",
  en: "🇺🇸",
  es: "🇪🇸",
  de: "🇩🇪",
  pt: "🇵🇹",
  it: "🇮🇹",
  tr: "🇹🇷",
};

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: tr("meta.settings.title") },
      {
        name: "description",
        content: tr("meta.settings.description"),
      },
      { property: "og:title", content: tr("meta.settings.title") },
      {
        property: "og:description",
        content: tr("meta.settings.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

type Sheet = "language" | "recent" | "trash" | "sort" | null;

function SettingsPage() {
  const t = useT();
  const [localePref, changeLocalePref] = useLocalePreference();
  const [prefs, setPrefs] = usePrefs();
  const [hydrated, setHydrated] = useState(false);
  const [retention, setRetention] = useState<TrashRetentionDays>(30);
  const [clearing, setClearing] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: "name",
    order: "asc",
  });
  const [foldersFirst, setFoldersFirst] = useState(true);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setRetention(loadTrashRetention());
    setView(loadView());
    setSort(loadSort());
    setFoldersFirst(loadFoldersFirst());
    setAndroid(isStorageManaged());
  }, []);

  const theme = hydrated ? prefs.appearance.theme : DEFAULT_PREFS.appearance.theme;
  const recentMinutes = normalizeRecentWindow(
    hydrated ? prefs.files.recentWindowMinutes : DEFAULT_PREFS.files.recentWindowMinutes,
  );

  const setShowHidden = (showHidden: boolean) =>
    setPrefs((p) => ({ ...p, files: { ...p.files, showHidden } }));

  const setNotifications = (enabled: boolean) =>
    setPrefs((p) => ({ ...p, notifications: { ...p.notifications, enabled } }));

  const setHaptics = (haptics: boolean) =>
    setPrefs((p) => ({ ...p, feedback: { ...p.feedback, haptics } }));

  const sortLabel = (key: SortKey, order: SortOrder) =>
    `${t(`files.sort.${key}`)} · ${order === "asc" ? t("files.sort.ascending") : t("files.sort.descending")}`;
  const sortValue = `${sort.key}:${sort.order}`;

  const viewOptions: { value: ViewMode; label: string; icon: typeof Moon }[] = [
    { value: "list", label: t("settings.view.list"), icon: LayoutList },
    { value: "grid", label: t("settings.view.grid"), icon: LayoutGrid },
  ];

  const openAndroidSettings = async () => {
    const { openAppSettings } = await import("@/lib/apps/api");
    const ok = await openAppSettings(APP_PACKAGE);
    if (!ok) toast.error(t("settings.android.unavailable"));
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      const thumbs = await clearThumbnailCache().catch(() => ({ deleted: 0, bytesFreed: 0 }));
      const temp = await sweepTempFiles(0).catch(() => null);
      const bytes = thumbs.bytesFreed + (temp?.bytesReclaimed ?? 0);
      toast.success(t("settings.cache.done"), {
        description:
          bytes > 0
            ? t("settings.cache.freed", { size: formatBytes(bytes) })
            : t("settings.cache.nothing"),
      });
    } finally {
      setClearing(false);
    }
  };

  const retentionLabel = (value: TrashRetentionDays) =>
    value === -1
      ? t("settings.trash.option.manual")
      : t("settings.trash.option.days", { count: value });

  const systemLocale = resolveLocale("system");
  const localeLabel = (code: LocalePreference) =>
    code === "system"
      ? `${t("settings.language.system")} · ${LOCALE_LABELS[systemLocale]}`
      : LOCALE_LABELS[code];

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Moon }[] = [
    { value: "system", label: t("settings.theme.system"), icon: MonitorSmartphone },
    { value: "light", label: t("settings.theme.light"), icon: Sun },
    { value: "dark", label: t("settings.theme.dark"), icon: Moon },
  ];

  return (
    <AppShell>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="animate-page-in flex flex-col gap-6 pb-6 pt-4">
        <SettingsSection title={t("settings.group.general")}>
          <SettingsChoiceRow
            icon={Type}
            label={t("settings.language.label")}
            value={
              <span suppressHydrationWarning>
                {LOCALE_FLAGS[localePref]} {localeLabel(localePref)}
              </span>
            }
            onClick={() => setSheet("language")}
          />
          <SettingsStackedRow
            icon={MonitorSmartphone}
            label={t("settings.theme.label")}
            desc={t("settings.theme.desc")}
          >
            <Segmented
              ariaLabel={t("settings.theme.aria")}
              value={theme}
              options={themeOptions}
              onChange={(next) => {
                setPrefs((p) => ({ ...p, appearance: { ...p.appearance, theme: next } }));
                const label = themeOptions.find((o) => o.value === next)?.label ?? "";
                toast.success(t("settings.theme.applied", { theme: label.toLowerCase() }));
              }}
            />
          </SettingsStackedRow>
          <SettingsRow
            icon={Waves}
            label={t("settings.haptics.label")}
            desc={t("settings.haptics.desc")}
          >
            <Toggle
              checked={hydrated ? prefs.feedback.haptics : DEFAULT_PREFS.feedback.haptics}
              onChange={setHaptics}
              ariaLabel={t("settings.haptics.label")}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title={t("settings.group.files")}>
          <SettingsStackedRow
            icon={LayoutList}
            label={t("settings.view.label")}
            desc={t("settings.view.desc")}
          >
            <Segmented
              ariaLabel={t("settings.view.label")}
              value={view}
              options={viewOptions}
              onChange={(next) => {
                setView(next);
                saveView(next);
              }}
            />
          </SettingsStackedRow>
          <SettingsChoiceRow
            icon={ArrowUpDown}
            label={t("files.sort.by")}
            value={<span suppressHydrationWarning>{sortLabel(sort.key, sort.order)}</span>}
            onClick={() => setSheet("sort")}
          />
          <SettingsRow icon={Folder} label={t("files.sort.foldersFirst")}>
            <Toggle
              checked={foldersFirst}
              onChange={(next) => {
                setFoldersFirst(next);
                saveFoldersFirst(next);
              }}
              ariaLabel={t("files.sort.foldersFirst")}
            />
          </SettingsRow>
          <SettingsRow
            icon={Eye}
            label={t("settings.hidden.label")}
            desc={t("settings.hidden.desc")}
          >
            <Toggle
              checked={hydrated ? prefs.files.showHidden : DEFAULT_PREFS.files.showHidden}
              onChange={setShowHidden}
              ariaLabel={t("settings.hidden.label")}
            />
          </SettingsRow>
          <SettingsChoiceRow
            icon={Clock3}
            label={t("settings.recentWindow.label")}
            desc={t("settings.recentWindow.desc")}
            value={<span suppressHydrationWarning>{recentWindowLabel(recentMinutes, t)}</span>}
            onClick={() => setSheet("recent")}
          />
          <SettingsChoiceRow
            icon={Trash2}
            label={t("settings.trash.rowLabel")}
            desc={t("settings.trash.hint")}
            value={<span suppressHydrationWarning>{retentionLabel(retention)}</span>}
            onClick={() => setSheet("trash")}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.group.storage")}>
          <StorageAccessRow />
          <StorageSpaceRow />
          <SettingsRow
            icon={Eraser}
            label={t("settings.cache.label")}
            desc={t("settings.cache.desc")}
          >
            <SettingsAction onClick={clearCache} disabled={clearing}>
              {clearing ? t("settings.cache.working") : t("settings.cache.action")}
            </SettingsAction>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title={t("settings.group.automations")}>
          <AutomationQuotaRow />
          <SettingsNavRow
            icon={History}
            label={t("automations.history.section")}
            desc={t("settings.automations.historyDesc")}
            to="/automatisations/historique"
          />
        </SettingsSection>

        <SettingsSection title={t("settings.group.notifications")}>
          <SettingsRow
            icon={Bell}
            label={t("settings.notifications.label")}
            desc={t("settings.notifications.hint")}
          >
            <Toggle
              checked={hydrated ? prefs.notifications.enabled : DEFAULT_PREFS.notifications.enabled}
              onChange={setNotifications}
              ariaLabel={t("settings.notifications.label")}
            />
          </SettingsRow>
          {android ? (
            <SettingsChoiceRow
              icon={SlidersHorizontal}
              label={t("settings.android.label")}
              desc={t("settings.android.desc")}
              onClick={() => void openAndroidSettings()}
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("settings.group.about")}>
          <div className="gf-settings-row flex items-center gap-4 px-4 py-4">
            <img
              src="/brand/geniusfiles-logo-128.png"
              alt=""
              className="h-11 w-11 shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">GeniusFiles</p>
              <p className="text-[12px] text-muted-foreground">
                {t("settings.about.version", { version: APP_VERSION })}
              </p>
            </div>
          </div>
          <SettingsLink
            icon={Shield}
            label={t("settings.about.privacy")}
            href="https://alphafxstudio.github.io/geniusfiles-legal-docs/politique-de-confidentialite"
          />
          <SettingsLink
            icon={FileText}
            label={t("settings.about.terms")}
            href="https://alphafxstudio.github.io/geniusfiles-legal-docs/conditions-d-utilisation"
          />
          <SettingsLink
            icon={Mail}
            label={t("settings.about.contact")}
            desc={SUPPORT_EMAIL}
            href={`mailto:${SUPPORT_EMAIL}`}
          />
        </SettingsSection>
      </div>

      <SettingsAdBanner />

      <ChoiceSheet
        open={sheet === "language"}
        title={t("settings.language.label")}
        value={localePref}
        onClose={() => setSheet(null)}
        options={(["system", ...LOCALES] as const).map((code) => ({
          value: code,
          label: localeLabel(code),
          leading: (
            <span aria-hidden className="text-lg leading-none">
              {LOCALE_FLAGS[code]}
            </span>
          ),
        }))}
        onChange={(next) => {
          changeLocalePref(next);
          // Confirmation immédiatement dans la nouvelle langue.
          toast.success(translate(resolveLocale(next), "settings.language.applied"));
        }}
      />
      <ChoiceSheet
        open={sheet === "recent"}
        title={t("settings.recentWindow.label")}
        value={recentMinutes}
        onClose={() => setSheet(null)}
        options={RECENT_WINDOW_OPTIONS.map((m) => ({
          value: m,
          label: recentWindowLabel(m, t),
        }))}
        onChange={(minutes) => {
          setPrefs((p) => ({ ...p, files: { ...p.files, recentWindowMinutes: minutes } }));
          toast.success(t("settings.recentWindow.updated"));
        }}
      />
      <ChoiceSheet
        open={sheet === "trash"}
        title={t("settings.trash.rowLabel")}
        value={retention}
        onClose={() => setSheet(null)}
        options={trashRetentionOptions().map((o) => ({
          value: o.value,
          label: retentionLabel(o.value),
        }))}
        onChange={(v) => {
          setRetention(v);
          saveTrashRetention(v);
          toast.success(t("settings.trash.updated"));
        }}
      />
      <ChoiceSheet
        open={sheet === "sort"}
        title={t("files.sort.by")}
        value={sortValue}
        onClose={() => setSheet(null)}
        options={SORT_KEYS.flatMap((key) =>
          SORT_ORDERS.map((order) => ({ value: `${key}:${order}`, label: sortLabel(key, order) })),
        )}
        onChange={(next) => {
          const [key, order] = next.split(":") as [SortKey, SortOrder];
          const value = { key, order };
          setSort(value);
          saveSort(value);
        }}
      />
    </AppShell>
  );
}

/** Accès « Tous les fichiers » : état réel et demande d'autorisation (Android). */
function StorageAccessRow() {
  const t = useT();
  const [state, setState] = useState<StoragePermissionState | null>(null);
  const [asking, setAsking] = useState(false);

  const refresh = useCallback(() => {
    void checkStoragePermission()
      .then(setState)
      .catch(() => setState("unavailable"));
  }, []);

  useEffect(() => {
    if (!isStorageManaged()) return;
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!state || state === "unavailable") return null;

  return (
    <SettingsRow
      icon={ShieldCheck}
      label={t("settings.storageAccess.label")}
      desc={
        state === "granted"
          ? t("settings.storageAccess.granted")
          : t("settings.storageAccess.denied")
      }
    >
      {state === "granted" ? (
        <Check className="h-5 w-5 text-primary" aria-label={t("settings.storageAccess.granted")} />
      ) : (
        <SettingsAction
          disabled={asking}
          onClick={async () => {
            setAsking(true);
            try {
              await requestStoragePermission();
            } finally {
              setAsking(false);
              refresh();
            }
          }}
        >
          {t("settings.storageAccess.action")}
        </SettingsAction>
      )}
    </SettingsRow>
  );
}

/** Espace disponible réel de l'appareil (Android uniquement). */
function StorageSpaceRow() {
  const t = useT();
  const { stats, supported } = useStorageStats();
  if (!supported || !stats || stats.total <= 0) return null;
  return (
    <SettingsStackedRow
      icon={HardDrive}
      label={t("settings.storageSpace.label")}
      desc={t("settings.storageSpace.value", {
        free: formatBytes(stats.free),
        total: formatBytes(stats.total),
      })}
    >
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(stats.usedPct)}
        aria-label={t("settings.storageSpace.label")}
        className="ml-9 h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${stats.usedPct}%` }}
        />
      </div>
    </SettingsStackedRow>
  );
}

/** Utilisations quotidiennes des automatisations (lecture seule). */
function AutomationQuotaRow() {
  const t = useT();
  const quota = useQuota("automations");
  return (
    <SettingsRow
      icon={Zap}
      label={t("settings.automations.quota")}
      desc={t("settings.automations.quotaDesc")}
    >
      <span
        suppressHydrationWarning
        className="text-[13px] font-semibold tabular-nums text-foreground"
      >
        {t("settings.automations.quotaValue", { remaining: quota.remaining, total: quota.total })}
      </span>
    </SettingsRow>
  );
}

/**
 * Bannière publicitaire de bas de page Paramètres.
 *
 * Rendue uniquement sur l'APK (pont natif présent) : un séparateur discret
 * puis la bannière dans le flux normal, après le pied de page. Sans annonce
 * ou hors APK, rien ne s'affiche (ni séparateur, ni espace vide).
 */
function SettingsAdBanner() {
  const allowed = useAdSlot("settings");
  if (!allowed) return null;
  return (
    <>
      <div aria-hidden="true" className="mx-auto mb-3 h-px w-full max-w-sm bg-border/60" />
      <InlineAdBanner slot="settings" />
    </>
  );
}
