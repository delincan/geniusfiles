/**
 * Google Analytics for Firebase — instrumentation GeniusFiles.
 *
 * ── Écrans ──────────────────────────────────────────────────────────────
 * Le suivi automatique des écrans du SDK Android est DÉSACTIVÉ dans le
 * manifeste (`google_analytics_automatic_screen_reporting_enabled=false`) :
 * sans cela Firebase remontait « MainActivity » (l'unique activité qui
 * héberge la WebView) et « AdActivity » (activité du SDK publicitaire) au
 * lieu des vrais écrans. Le seul `screen_view` envoyé est donc celui de ce
 * module : un nom lisible, stable, en français, issu d'une liste blanche.
 *
 * L'écran courant est la couche de plus haute priorité d'une petite pile :
 *   route (ex. Corbeille) < section (Accueil ↔ Gestionnaire de fichiers)
 *   < lecteur (visionneuse, lecteur vidéo…) < éditeur (photo, document…).
 * Les changements sont regroupés sur un court délai : un écran affiché
 * moins de `SCREEN_SETTLE_MS` (transition, redirection, ouverture/fermeture
 * immédiate) n'est jamais compté, et un même écran n'est jamais compté deux
 * fois de suite. Les dialogues, feuilles, miniatures et changements visuels
 * internes ne poussent aucune couche : ils ne créent pas de vue d'écran.
 *
 * ── Événements ──────────────────────────────────────────────────────────
 * Noms en liste blanche et paramètres standardisés (voir `EventParams`).
 * Chaque opération est enregistrée UNE fois, après son exécution réelle,
 * avec son issue ; une sélection multiple produit un seul événement portant
 * `item_count`. Les opérations déclenchées par Genius AI, les automatisations
 * ou le rangement automatique ne sont pas recomptées comme des actions
 * manuelles de fichiers : elles ont leurs propres événements.
 *
 * ── Confidentialité ─────────────────────────────────────────────────────
 * Jamais transmis : nom, chemin ou contenu de fichier, terme de recherche,
 * texte Genius AI (demande comme réponse), PIN / mot de passe / biométrie,
 * toute information du coffre-fort, identifiant utilisateur. Les valeurs
 * texte sont des jetons courts (a-z, 0-9, `_`) et le pont natif refuse à
 * nouveau tout nom ou clé hors liste blanche.
 *
 * Hors runtime Android natif (web, SSR, aperçu Lovable) : entièrement no-op.
 */
import { isNativeRuntime, nativePlatform } from "./platform";
import { logBreadcrumb, setCrashRoute } from "./crashlytics";
import type { FileKind } from "@/lib/files/types";
import { getLocale } from "@/lib/i18n/store";

type AnalyticsBridge = {
  logScreenView(options: { screen: string }): Promise<void>;
  logEvent(options: {
    name: string;
    params?: Record<string, string>;
    count?: number;
  }): Promise<void>;
  setUserProperty(options: { name: string; value: string }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
};

let bridge: AnalyticsBridge | null = null;

/**
 * Résolution paresseuse du pont. Le résultat n'est mis en cache QUE s'il est
 * trouvé : au tout premier rendu, `window.Capacitor.Plugins` peut ne pas
 * encore être peuplé.
 */
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

/**
 * Identifiant technique stable (utilisé dans `source_screen`) → nom
 * affiché dans Firebase (`screen_name` / `screen_class`). Les noms ne sont
 * PAS traduits selon la langue de l'interface : un écran garde le même nom
 * dans les rapports quelle que soit la langue de l'utilisateur.
 *
 * Toute modification doit être reportée dans `ALLOWED_SCREENS` de
 * `GeniusFilesAnalyticsPlugin.kt` (un test vérifie la cohérence).
 */
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

/** Écran logique d'une URL (jamais de segment dynamique, jamais de chemin). */
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

/** Priorité des couches d'écran (la plus haute est l'écran consulté). */
export type ScreenLayer = "section" | "viewer" | "editor";
const LAYER_PRIORITY: Record<ScreenLayer, number> = { section: 1, viewer: 2, editor: 3 };

type Layer = { id: number; screen: ScreenId; priority: number };

/** Durée minimale d'affichage avant qu'une vue d'écran soit comptée. */
export const SCREEN_SETTLE_MS = 400;

let routeScreen: ScreenId | null = null;
let layers: Layer[] = [];
let layerSeq = 0;
let lastLogged: ScreenId | null = null;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

/** Écran actuellement affiché (avant même qu'il soit compté). */
export function currentScreen(): ScreenId {
  let top: Layer | null = null;
  for (const l of layers) {
    if (!top || l.priority > top.priority || (l.priority === top.priority && l.id > top.id)) {
      top = l;
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

function flushScreen(): void {
  flushTimer = undefined;
  // En arrière-plan, rien n'est consulté : la vue sera comptée au retour.
  if (isHidden()) return;
  const screen = currentScreen();
  if (screen === lastLogged) return;
  lastLogged = screen;
  setCrashRoute(screen);
  logBreadcrumb(`screen:${screen}`);
  const p = plugin();
  if (!p) return;
  void p.logScreenView({ screen: SCREENS[screen] }).catch(() => {});
}

/** Écran de base, déduit de la route. */
export function trackRoute(pathname: string): void {
  routeScreen = screenForPath(pathname);
  scheduleFlush();
}

/** Compatibilité : ancien point d'entrée. */
export const trackScreen = trackRoute;

/**
 * Pousse une couche d'écran (section, lecteur, éditeur). Renvoie la
 * fonction de retrait — à appeler quand l'écran se ferme.
 */
export function pushScreen(screen: ScreenId, layer: ScreenLayer): () => void {
  const entry: Layer = { id: ++layerSeq, screen, priority: LAYER_PRIORITY[layer] };
  layers = [...layers, entry];
  scheduleFlush();
  return () => {
    const before = layers.length;
    layers = layers.filter((l) => l !== entry);
    if (layers.length !== before) scheduleFlush();
  };
}

/* ────────────────────────────────────────────────────────────────
   Événements
   ──────────────────────────────────────────────────────────────── */

/**
 * Événements autorisés. Toute modification doit être reportée dans
 * `ALLOWED_EVENTS` de `GeniusFilesAnalyticsPlugin.kt`.
 */
export const ANALYTICS_EVENTS = [
  // Utilisation générale
  "application_opened",
  "search_performed",
  "file_opened",
  "file_shared",
  "folder_created",
  // Gestionnaire de fichiers
  "file_copied",
  "file_moved",
  "file_renamed",
  "file_deleted",
  "file_restored",
  "file_compressed",
  "file_extracted",
  // PDF
  "pdf_tool_used",
  "pdf_created",
  "pdf_merged",
  "pdf_compressed",
  "pdf_converted",
  "pdf_signed",
  "pdf_extracted",
  "pdf_edited",
  // Genius AI
  "ai_conversation_started",
  "ai_request_completed",
  "ai_command_executed",
  // Coffre-fort
  "vault_opened",
  "vault_file_added",
  "vault_file_restored",
  "vault_file_deleted",
  // Automatisations
  "automation_created",
  "automation_enabled",
  "automation_disabled",
  "automation_executed",
  // Éditeurs
  "editor_used",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
const EVENT_SET = new Set<string>(ANALYTICS_EVENTS);

export type AnalyticsResult = "success" | "failure" | "cancelled";

/** Clés texte autorisées (reportées dans `ALLOWED_KEYS` côté Kotlin). */
export const EVENT_PARAM_KEYS = [
  "operation",
  "result",
  "file_type",
  "source_screen",
  "tool_type",
  "action_category",
] as const;

export type EventParams = {
  /** Variante de l'opération (trash, permanent, new_copy, open, save…). */
  operation?: string;
  /** Issue : success, failure ou cancelled (annulation volontaire). */
  result?: AnalyticsResult;
  /** Type générique : image, video, audio, document, pdf, archive, folder, mixed… */
  file_type?: string;
  /** Écran d'origine — rempli automatiquement avec l'écran courant. */
  source_screen?: ScreenId;
  /** Module ou outil : pdf_reader, photo_editor, merge, zip… */
  tool_type?: string;
  /** Catégorie générale (commandes Genius AI, actions d'automatisation). */
  action_category?: string;
  /** Nombre d'éléments concernés par l'opération globale. */
  item_count?: number;
};

/** Jeton court et neutre : impossible d'y loger un nom ou un chemin. */
function token(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean ? clean.slice(0, 40) : null;
}

/** Paramètres réellement transmis (exporté pour les tests). */
export function buildEventParams(params: EventParams): {
  params: Record<string, string>;
  count?: number;
} {
  const out: Record<string, string> = {};
  const withScreen: EventParams = { source_screen: currentScreen(), ...params };
  for (const key of EVENT_PARAM_KEYS) {
    const value = token(withScreen[key] as string | undefined);
    if (value) out[key] = value;
  }
  const n = params.item_count;
  const count =
    typeof n === "number" && Number.isFinite(n) && n > 0
      ? Math.min(Math.round(n), 100000)
      : undefined;
  return { params: out, count };
}

/**
 * Enregistre un événement. No-op hors Android natif ; appel asynchrone non
 * bloquant (le SDK met en file d'attente), aucune I/O côté WebView.
 */
export function trackEvent(name: AnalyticsEvent, params: EventParams = {}): void {
  const p = plugin();
  if (!p || !EVENT_SET.has(name)) return;
  const built = buildEventParams(params);
  void p.logEvent({ name, params: built.params, count: built.count }).catch(() => {});
}

/** Issue standard d'une opération. */
export function resultOf(ok: boolean, cancelled = false): AnalyticsResult {
  return cancelled ? "cancelled" : ok ? "success" : "failure";
}

/** Catégorie générique d'un type de fichier. */
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

/** Type générique d'une sélection : un seul type, ou `mixed`. */
export function fileTypeOf(entries: readonly { kind: FileKind }[]): string | undefined {
  let type: string | undefined;
  for (const e of entries) {
    const k = coarseKind(e.kind);
    if (type === undefined) type = k;
    else if (type !== k) return "mixed";
  }
  return type;
}

/* ────────────────────────────────────────────────────────────────
   Initialisation, ouvertures de l'application
   ──────────────────────────────────────────────────────────────── */

/** Au-delà de cette absence, un retour au premier plan est une ouverture. */
const RESUME_AS_OPEN_MS = 30 * 60 * 1000;

let installed = false;
let hiddenAt: number | null = null;

/**
 * Initialise la mesure : collecte activée, langue d'interface, écran courant,
 * ouverture de l'application (une seule fois par démarrage du processus).
 *
 * Si le pont natif n'est pas encore exposé, l'installation est retentée
 * quelques fois (sans cela aucun écran ni événement ne remontait).
 */
export function installAnalytics(): void {
  if (installed || typeof window === "undefined") return;
  const p = plugin();
  if (!p) {
    retryInstall();
    return;
  }
  installed = true;

  void p.setEnabled({ enabled: true }).catch(() => {});
  // Langue choisie dans GeniusFiles (la langue du système est déjà
  // collectée automatiquement par le SDK).
  void p.setUserProperty({ name: "app_language", value: safeLocale() }).catch(() => {});
  // Ancienne propriété redondante avec la dimension intégrée « Version de
  // l'application » : elle est effacée (valeur vide = suppression).
  void p.setUserProperty({ name: "app_version", value: "" }).catch(() => {});

  trackEvent("application_opened", { operation: "cold_start" });
  scheduleFlush();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      if (flushTimer !== undefined) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
      return;
    }
    const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (away >= RESUME_AS_OPEN_MS) {
      // Nouvelle session côté Firebase : l'écran affiché est recompté pour
      // qu'elle ait un écran d'arrivée. Un aller-retour bref (sélecteur de
      // fichiers, partage, notification) ne compte ni ouverture ni écran.
      lastLogged = null;
      trackEvent("application_opened", { operation: "resume" });
    }
    scheduleFlush();
  });
}

function safeLocale(): string {
  try {
    return getLocale().slice(0, 12).replace(/[^\w-]/g, "") || "unknown";
  } catch {
    return "unknown";
  }
}

let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function retryInstall(): void {
  if (installed || retryTimer !== undefined || retries >= 5) return;
  if (!isNativeRuntime()) return;
  retries += 1;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    installAnalytics();
  }, 400 * retries);
}

/** Réinitialisation de l'état (tests uniquement). */
export function __resetAnalyticsForTests(): void {
  routeScreen = null;
  layers = [];
  layerSeq = 0;
  lastLogged = null;
  if (flushTimer !== undefined) clearTimeout(flushTimer);
  flushTimer = undefined;
  bridge = null;
  installed = false;
  retries = 0;
}
