/**
 * Google Analytics for Firebase — instrumentation GeniusFiles.
 *
 * Un seul émetteur de screen_view : ce module. Le suivi automatique Android
 * reste désactivé dans le manifeste pour ne jamais remonter MainActivity ou
 * AdActivity. Les routes, sections, lecteurs et éditeurs partagent une pile
 * d'écrans ; dialogues, menus, filtres et miniatures n'en font pas partie.
 *
 * Confidentialité : les paramètres texte ne sont pas « nettoyés » puis
 * transmis. Seules des valeurs techniques présentes dans les listes blanches
 * ci-dessous sont acceptées, côté WebView puis une seconde fois côté Kotlin.
 * Une valeur libre (nom de fichier, recherche, prompt…) est donc abandonnée.
 * Aucun texte du coffre-fort, code PIN, mot de passe ou donnée biométrique
 * n'est accepté. Les opérations groupées produisent un seul événement.
 */
import { isNativeRuntime, nativePlatform } from "./platform";
import { logBreadcrumb, setCrashRoute } from "./crashlytics";
import type { FileKind } from "@/lib/files/types";
import { getLocale } from "@/lib/i18n/store";

type PendingEvent = {
  name: AnalyticsEvent;
  params: Record<string, string>;
  count?: number;
  duration?: number;
};

type AnalyticsBridge = {
  logScreenView(options: { screen: string }): Promise<void>;
  logEvent(options: {
    name: string;
    params?: Record<string, string>;
    count?: number;
    duration?: number;
  }): Promise<void>;
  setUserProperty(options: { name: string; value: string }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
};

let bridge: AnalyticsBridge | null = null;

/** Ne jamais mémoriser l'absence du pont pendant le démarrage de Capacitor. */
function plugin(): AnalyticsBridge | null {
  if (bridge) return bridge;
  if (!isNativeRuntime() || nativePlatform() !== "android") return null;
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor?.Plugins;
  bridge = (plugins?.["GeniusFilesAnalytics"] as AnalyticsBridge | undefined) ?? null;
  return bridge;
}

/* ────────────────────────────────────────────────────────────────
   Écrans
   ──────────────────────────────────────────────────────────────── */

/** Identifiant stable → nom français utilisé dans screen_name ET screen_class. */
export const SCREENS = {
  home: "Accueil",
  file_manager: "Gestionnaire de fichiers",
  recent_files: "Fichiers récents",
  category_images: "Images",
  category_videos: "Vidéos",
  category_audio: "Audio",
  category_documents: "Documents",
  category_downloads: "Téléchargements",
  search: "Recherche",
  trash: "Corbeille",
  vault: "Coffre-fort",
  genius_ai: "Genius AI",
  automations: "Automatisations",
  automation_history: "Historique des automatisations",
  settings: "Paramètres",
  pdf_tools: "Outils PDF",
  photo_editor: "Éditeur photo",
  audio_editor: "Éditeur audio",
  document_editor: "Éditeur de documents",
  image_viewer: "Visionneuse d'images",
  video_player: "Lecteur vidéo",
  audio_player: "Lecteur audio",
  pdf_reader: "Lecteur PDF",
  document_reader: "Lecteur de documents",
  app_manager: "Gestionnaire d'applications",
  cleaner: "Nettoyeur",
  organizer: "Organisation",
  other: "Autre écran",
} as const;

export type ScreenId = keyof typeof SCREENS;

const ROUTE_SCREENS: Record<string, ScreenId> = {
  "": "home",
  "fichiers-recents": "recent_files",
  recherche: "search",
  corbeille: "trash",
  "coffre-fort": "vault",
  assistant: "genius_ai",
  automatisations: "automations",
  parametres: "settings",
  "pdf-outils": "pdf_tools",
  "editeur-audio": "audio_editor",
  applications: "app_manager",
  nettoyeur: "cleaner",
  organisation: "organizer",
};

const CATEGORY_SCREENS: Record<string, ScreenId> = {
  images: "category_images",
  videos: "category_videos",
  audio: "category_audio",
  documents: "category_documents",
  downloads: "category_downloads",
};

/** Aucun segment dynamique ou chemin réel ne devient un nom d'écran. */
export function screenForPath(pathname: string): ScreenId {
  const parts = pathname
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const first = parts[0] ?? "";
  if (first === "categorie") return CATEGORY_SCREENS[parts[1] ?? ""] ?? "other";
  if (first === "automatisations" && parts[1] === "historique") return "automation_history";
  if (first === "automatisations.historique") return "automation_history";
  return ROUTE_SCREENS[first] ?? "other";
}

export type ScreenLayer = "section" | "viewer" | "editor";
const LAYER_PRIORITY: Record<ScreenLayer, number> = { section: 1, viewer: 2, editor: 3 };
type Layer = { id: number; screen: ScreenId; priority: number };

export const SCREEN_SETTLE_MS = 400;
let routeScreen: ScreenId | null = null;
let layers: Layer[] = [];
let layerSeq = 0;
let lastLogged: ScreenId | null = null;
let screenInFlight: ScreenId | null = null;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export function currentScreen(): ScreenId {
  let top: Layer | null = null;
  for (const layer of layers) {
    if (
      !top ||
      layer.priority > top.priority ||
      (layer.priority === top.priority && layer.id > top.id)
    ) {
      top = layer;
    }
  }
  return top?.screen ?? routeScreen ?? "home";
}

function isHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function scheduleFlush(): void {
  if (typeof window === "undefined") return;
  if (flushTimer !== undefined) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushScreen, SCREEN_SETTLE_MS);
}

const SCREEN_OPEN_EVENT: Partial<Record<ScreenId, AnalyticsEvent>> = {
  recent_files: "recent_files_opened",
  trash: "trash_opened",
  category_images: "category_opened",
  category_videos: "category_opened",
  category_audio: "category_opened",
  category_documents: "category_opened",
  category_downloads: "category_opened",
};

function flushScreen(): void {
  flushTimer = undefined;
  if (isHidden()) return;
  const screen = currentScreen();
  if (screen === lastLogged || screen === screenInFlight) return;
  const native = plugin();
  if (!native) {
    retryInstall();
    return;
  }

  const previous = lastLogged;
  screenInFlight = screen;
  void native
    .logScreenView({ screen: SCREENS[screen] })
    .then(() => {
      if (screenInFlight === screen) screenInFlight = null;
      lastLogged = screen;
      setCrashRoute(screen);
      logBreadcrumb(`screen:${screen}`);
      if (screen !== previous) {
        const event = SCREEN_OPEN_EVENT[screen];
        if (event) trackEvent(event, { tool_type: screen });
      }
      if (currentScreen() !== screen) scheduleFlush();
    })
    .catch(() => {
      if (screenInFlight === screen) screenInFlight = null;
      // Ne pas marquer l'écran comme livré : le prochain retour au premier
      // plan ou la prochaine navigation pourra réellement le comptabiliser.
      if (lastLogged === screen) lastLogged = null;
    });
}

export function trackRoute(pathname: string): void {
  routeScreen = screenForPath(pathname);
  scheduleFlush();
}

export const trackScreen = trackRoute;

export function pushScreen(screen: ScreenId, layer: ScreenLayer): () => void {
  const entry: Layer = { id: ++layerSeq, screen, priority: LAYER_PRIORITY[layer] };
  layers = [...layers, entry];
  scheduleFlush();
  return () => {
    const before = layers.length;
    layers = layers.filter((candidate) => candidate !== entry);
    if (layers.length !== before) scheduleFlush();
  };
}

/* ────────────────────────────────────────────────────────────────
   Événements et listes blanches
   ──────────────────────────────────────────────────────────────── */

export const ANALYTICS_EVENTS = [
  "app_opened",
  "category_opened",
  "recent_files_opened",
  "favorites_opened",
  "trash_opened",
  "search_performed",
  "file_opened",
  "media_player_used",
  "document_viewer_used",
  "file_shared",
  "folder_created",
  "file_copied",
  "file_moved",
  "file_renamed",
  "file_deleted",
  "file_restored",
  "files_compressed",
  "files_extracted",
  "cleaner_completed",
  "organization_completed",
  "application_action_completed",
  "pdf_tool_used",
  "pdf_created",
  "pdf_merged",
  "pdf_compressed",
  "pdf_converted",
  "pdf_signed",
  "pdf_extracted",
  "pdf_edited",
  "ai_conversation_started",
  "ai_request_completed",
  "ai_command_executed",
  "vault_opened",
  "vault_operation_completed",
  "automation_created",
  "automation_enabled",
  "automation_disabled",
  "automation_executed",
  "automation_completed",
  "editor_used",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
const EVENT_SET = new Set<string>(ANALYTICS_EVENTS);
export type AnalyticsResult = "success" | "failure" | "cancelled";

const PDF_TOOLS = [
  "images_to_pdf",
  "scan",
  "text_to_pdf",
  "merge",
  "compress",
  "files_to_pdf",
  "pdf_to_images",
  "signature",
  "extract",
  "extract_text",
  "split",
  "delete_pages",
  "reorder",
  "rotate",
  "watermark",
  "add_text",
  "add_image",
  "fill_form",
  "duplicate",
  "search",
  "info",
] as const;

const AI_OPERATIONS = [
  "list_storage_roots",
  "list",
  "search",
  "analyze",
  "properties",
  "create",
  "rename",
  "delete",
  "copy",
  "move",
  "organize",
  "compress",
  "extract",
  "share",
  "sort",
  "filter",
] as const;

const AUTOMATION_TRIGGERS = [
  "scheduled_time",
  "daily",
  "weekly",
  "app_open",
  "file_added",
  "folder_changed",
  "storage_low",
  "device_connected",
] as const;

const AUTOMATION_CATEGORIES = [
  "copy",
  "move",
  "rename",
  "trash",
  "compress",
  "extract",
  "backup",
  "mkdir",
  "organize",
  "cleaner_scan",
  "notify",
  "open_module",
] as const;

export const EVENT_PARAM_VALUES = {
  operation: [
    "cold_start",
    "resume",
    "open",
    "setup",
    "unlock",
    "folder",
    "all_storage",
    "one_storage",
    "permanent",
    "trash",
    "encrypted",
    "standard",
    "partial_selection",
    "all",
    "from_trash",
    "permanent_from_trash",
    "empty_trash",
    "message",
    "retry",
    "manual",
    "ai",
    "template",
    "recommendation",
    "ok",
    "partial",
    "failed",
    "simulated",
    "save_new",
    "save_replace",
    "save_split",
    "add",
    "restore",
    "delete",
    "execute",
    "cleanup",
    "apply_plan",
    "settings",
    "backup",
    "uninstall_request",
    "unknown",
    ...AI_OPERATIONS,
  ],
  result: ["success", "failure", "cancelled"],
  file_type: [
    "folder",
    "image",
    "video",
    "audio",
    "document",
    "pdf",
    "archive",
    "apk",
    "other",
    "mixed",
  ],
  source_screen: Object.keys(SCREENS),
  tool_type: [
    ...Object.keys(SCREENS),
    ...PDF_TOOLS,
    ...AUTOMATION_TRIGGERS,
    "zip",
    "7z",
    "tar",
    "gz",
    "tgz",
    "rar",
    "archive",
    "other",
  ],
  action_category: [
    "navigation",
    "file_management",
    "browse",
    "search",
    "analyze",
    "archive",
    "pdf",
    "ai",
    "vault",
    "automation",
    "editor",
    "media",
    "document",
    "cleaner",
    "application",
    "mixed",
    "none",
    "other",
    ...AUTOMATION_CATEGORIES,
  ],
  error_category: [
    "network_error",
    "permission_error",
    "storage_error",
    "processing_error",
    "quota_exceeded",
    "invalid_input",
    "unsupported_format",
    "cancelled",
    "unknown_error",
  ],
} as const;

export const EVENT_PARAM_KEYS = [
  "operation",
  "result",
  "file_type",
  "source_screen",
  "tool_type",
  "action_category",
  "error_category",
] as const;

type TextParamKey = (typeof EVENT_PARAM_KEYS)[number];

export type EventParams = {
  operation?: string;
  result?: AnalyticsResult;
  file_type?: string;
  source_screen?: ScreenId;
  tool_type?: string;
  action_category?: string;
  error_category?: string;
  item_count?: number;
  duration_ms?: number;
};

const EVENT_CATEGORY: Partial<Record<AnalyticsEvent, string>> = {
  app_opened: "navigation",
  category_opened: "navigation",
  recent_files_opened: "navigation",
  favorites_opened: "navigation",
  trash_opened: "navigation",
  search_performed: "search",
  file_opened: "browse",
  media_player_used: "media",
  document_viewer_used: "document",
  file_shared: "file_management",
  folder_created: "file_management",
  file_copied: "file_management",
  file_moved: "file_management",
  file_renamed: "file_management",
  file_deleted: "file_management",
  file_restored: "file_management",
  files_compressed: "archive",
  files_extracted: "archive",
  cleaner_completed: "cleaner",
  organization_completed: "organize",
  application_action_completed: "application",
  pdf_tool_used: "pdf",
  pdf_created: "pdf",
  pdf_merged: "pdf",
  pdf_compressed: "pdf",
  pdf_converted: "pdf",
  pdf_signed: "pdf",
  pdf_extracted: "pdf",
  pdf_edited: "pdf",
  ai_conversation_started: "ai",
  ai_request_completed: "ai",
  ai_command_executed: "ai",
  vault_opened: "vault",
  vault_operation_completed: "vault",
  automation_created: "automation",
  automation_enabled: "automation",
  automation_disabled: "automation",
  automation_executed: "automation",
  automation_completed: "automation",
  editor_used: "editor",
};

function allowedToken(key: TextParamKey, value: string | undefined): string | null {
  if (!value) return null;
  return (EVENT_PARAM_VALUES[key] as readonly string[]).includes(value) ? value : null;
}

function nonNegativeInt(value: number | undefined, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(Math.round(value), max);
}

/** Paramètres réellement transmis. Toute valeur libre est ignorée, jamais transformée. */
export function buildEventParams(
  params: EventParams,
  name?: AnalyticsEvent,
): Pick<PendingEvent, "params" | "count" | "duration"> {
  const enriched: EventParams = {
    source_screen: currentScreen(),
    action_category: name ? EVENT_CATEGORY[name] : undefined,
    ...params,
  };
  if (enriched.result === "failure" && !enriched.error_category) {
    enriched.error_category = "unknown_error";
  }
  if (enriched.result === "cancelled" && !enriched.error_category) {
    enriched.error_category = "cancelled";
  }

  const out: Record<string, string> = {};
  for (const key of EVENT_PARAM_KEYS) {
    const value = allowedToken(key, enriched[key]);
    if (value) out[key] = value;
  }
  return {
    params: out,
    count: nonNegativeInt(params.item_count, 100000),
    duration: nonNegativeInt(params.duration_ms, 86_400_000),
  };
}

/* File bornée : les actions effectuées pendant le démarrage du pont ne sont
   plus perdues. Elle ne tourne pas en boucle et ne fabrique aucun événement. */
let pendingEvents: PendingEvent[] = [];
let drainingEvents = false;

function drainEvents(): void {
  if (drainingEvents) return;
  const native = plugin();
  if (!native) return;
  drainingEvents = true;
  void (async () => {
    while (pendingEvents.length > 0) {
      const event = pendingEvents[0];
      try {
        await native.logEvent(event);
        pendingEvents.shift();
      } catch {
        break;
      }
    }
    drainingEvents = false;
  })();
}

export function trackEvent(name: AnalyticsEvent, params: EventParams = {}): void {
  if (!EVENT_SET.has(name) || !isNativeRuntime() || nativePlatform() !== "android") return;
  const built = buildEventParams(params, name);
  pendingEvents.push({ name, ...built });
  if (pendingEvents.length > 100) pendingEvents = pendingEvents.slice(-100);
  drainEvents();
}

export function resultOf(ok: boolean, cancelled = false): AnalyticsResult {
  return cancelled ? "cancelled" : ok ? "success" : "failure";
}

export function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

/** Convertit une erreur en code général ; son message n'est jamais transmis. */
export function errorCategoryOf(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  const normalized = text.toLowerCase();
  if (normalized.includes("aborterror") || normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("quota")) return "quota_exceeded";
  if (normalized.includes("permission") || normalized.includes("denied")) {
    return "permission_error";
  }
  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("http")) {
    return "network_error";
  }
  if (normalized.includes("storage") || normalized.includes("disk") || normalized.includes("space")) {
    return "storage_error";
  }
  if (normalized.includes("invalid") || normalized.includes("params")) return "invalid_input";
  if (normalized.includes("unsupported") || normalized.includes("format")) {
    return "unsupported_format";
  }
  return "processing_error";
}

function coarseKind(kind: FileKind): string {
  switch (kind) {
    case "text":
    case "code":
      return "document";
    case "font":
      return "other";
    default:
      return kind;
  }
}

export function fileTypeOf(entries: readonly { kind: FileKind }[]): string | undefined {
  let type: string | undefined;
  for (const entry of entries) {
    const kind = coarseKind(entry.kind);
    if (type === undefined) type = kind;
    else if (type !== kind) return "mixed";
  }
  return type;
}

export function archiveTypeOf(extension: string | null | undefined): string {
  const value = (extension ?? "archive").toLowerCase();
  return (EVENT_PARAM_VALUES.tool_type as readonly string[]).includes(value) ? value : "other";
}

/* ────────────────────────────────────────────────────────────────
   Initialisation et cycle de vie
   ──────────────────────────────────────────────────────────────── */

const RESUME_AS_OPEN_MS = 30 * 60 * 1000;
let installed = false;
let lifecycleInstalled = false;
let appOpenTracked = false;
let hiddenAt: number | null = null;
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    hiddenAt = Date.now();
    if (flushTimer !== undefined) clearTimeout(flushTimer);
    flushTimer = undefined;
    return;
  }

  if (!installed) installAnalytics();
  drainEvents();
  const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
  hiddenAt = null;
  if (away >= RESUME_AS_OPEN_MS) {
    lastLogged = null;
    trackEvent("app_opened", { operation: "resume" });
  }
  scheduleFlush();
}

function installLifecycle(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
}

export function installAnalytics(): void {
  if (installed || typeof window === "undefined") return;
  installLifecycle();
  const native = plugin();
  if (!native) {
    retryInstall();
    return;
  }
  installed = true;
  retries = 0;

  // Le SDK est aussi initialisé dans GeniusFilesApplication, avant la WebView,
  // pour les signaux automatiques app_open/session_start/user_engagement.
  void native.setEnabled({ enabled: true }).catch(() => {});
  void native.setUserProperty({ name: "app_language", value: safeLocale() }).catch(() => {});
  void native.setUserProperty({ name: "app_version", value: "" }).catch(() => {});

  if (!appOpenTracked) {
    appOpenTracked = true;
    trackEvent("app_opened", { operation: "cold_start" });
  }
  drainEvents();
  scheduleFlush();
}

function safeLocale(): string {
  try {
    return getLocale().slice(0, 12).replace(/[^\w-]/g, "") || "unknown";
  } catch {
    return "unknown";
  }
}

function retryInstall(): void {
  if (installed || retryTimer !== undefined || retries >= 8 || !isNativeRuntime()) return;
  retries += 1;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    installAnalytics();
  }, 400 * retries);
}

export function __resetAnalyticsForTests(): void {
  routeScreen = null;
  layers = [];
  layerSeq = 0;
  lastLogged = null;
  screenInFlight = null;
  if (flushTimer !== undefined) clearTimeout(flushTimer);
  flushTimer = undefined;
  if (retryTimer !== undefined) clearTimeout(retryTimer);
  retryTimer = undefined;
  if (lifecycleInstalled) document.removeEventListener("visibilitychange", onVisibilityChange);
  lifecycleInstalled = false;
  bridge = null;
  installed = false;
  appOpenTracked = false;
  hiddenAt = null;
  retries = 0;
  pendingEvents = [];
  drainingEvents = false;
}
