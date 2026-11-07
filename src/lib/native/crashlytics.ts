/**
 * Crashlytics capture nativement les crashs et ANR. Ce module ajoute les
 * erreurs JavaScript non fatales avec des codes fixes et leurs cadres techniques.
 * Les messages d'erreur complets ne sont jamais envoyés : ils peuvent contenir
 * un nom de fichier, un chemin, une recherche ou du texte utilisateur.
 */
import { isNativeRuntime, nativePlatform } from "./platform";

type CrashlyticsBridge = {
  log(options: { message: string }): Promise<void>;
  recordError(options: { name: string; message: string; stack?: string }): Promise<void>;
  setKeys(options: { keys: Record<string, string> }): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
};

let bridge: CrashlyticsBridge | null = null;

function plugin(): CrashlyticsBridge | null {
  if (bridge) return bridge;
  if (!isNativeRuntime() || nativePlatform() !== "android") return null;
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor?.Plugins;
  bridge = (plugins?.["GeniusFilesCrashlytics"] as CrashlyticsBridge | undefined) ?? null;
  return bridge;
}

/** Utilitaire de fil d'Ariane ; seules des valeurs techniques sont acceptées à l'appel. */
export function sanitizeDiagnostic(input: unknown, max = 240): string {
  let text = typeof input === "string" ? input : String(input ?? "");
  text = text
    .replace(/(content|file|blob):\/\/\S+/gi, "[uri]")
    .replace(/(\/[\w.\-% ]+){2,}/g, "[path]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/"[^"]{0,400}"/g, '"[redacted]"')
    .replace(/'[^']{0,400}'/g, "'[redacted]'")
    .replace(
      /\b[\w.\- ]{1,80}\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|heic|mp[34]|m4a|wav|mkv|avi|mov|zip|rar|7z|apk|txt|csv|epub)\b/gi,
      "[file]",
    )
    .replace(/\b\d{6,}\b/g, "[num]");
  text = text.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Conserve uniquement les lignes qui sont réellement des cadres de pile. */
function sanitizeStack(stack: unknown): string | undefined {
  if (typeof stack !== "string" || !stack) return undefined;
  const lines = stack
    .split("\n")
    .filter((line) => /(?:^\s*at\s+|[\w$]+@).+\.m?js:\d+:\d+/.test(line))
    .slice(0, 12)
    .map((line) =>
      line
        .replace(/https?:\/\/[^\s)]+\/(?=[\w.-]+:\d+:\d+)/g, "")
        .replace(/(content|file|blob):\/\/\S+/gi, "[uri]")
        .trim(),
    )
    .filter(Boolean);
  const joined = lines.join(" | ");
  if (!joined) return undefined;
  return joined.length > 900 ? joined.slice(0, 900) : joined;
}

export function logBreadcrumb(message: string): void {
  const native = plugin();
  if (!native || !/^screen:[a-z0-9_-]{1,40}$/.test(message)) return;
  void native.log({ message }).catch(() => {});
}

const ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "SyntaxError",
  "RangeError",
  "EvalError",
  "URIError",
  "DOMException",
  "AbortError",
  "NetworkError",
]);

/** Le contexte est un code fixe ; le message brut de l'erreur est ignoré. */
export function recordNonFatal(error: unknown, context?: string): void {
  const native = plugin();
  if (!native) return;
  const err = error instanceof Error ? error : undefined;
  const name = ERROR_NAMES.has(err?.name ?? "") ? (err?.name ?? "Error") : "Error";
  const code = context === "window.onerror" ? "window_onerror" : "unhandledrejection";
  void native
    .recordError({ name, message: code, stack: sanitizeStack(err?.stack) })
    .catch(() => {});
}

let installed = false;
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/** Branche aussi les rapports lorsque Capacitor expose son pont après le premier rendu. */
export function installCrashReporting(): () => void {
  if (typeof window === "undefined") return () => {};
  let disposed = false;

  const onError = (event: ErrorEvent) => {
    recordNonFatal(event.error ?? event.message, "window.onerror");
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    recordNonFatal(event.reason, "unhandledrejection");
  };

  const attach = () => {
    if (disposed || installed) return;
    const native = plugin();
    if (!native) {
      if (retries < 8) {
        retries += 1;
        retryTimer = setTimeout(attach, 400 * retries);
      }
      return;
    }
    installed = true;
    retries = 0;
    void native
      .setKeys({
        keys: {
          app_version: __APP_VERSION__,
          language: (navigator.language || "unknown").slice(0, 12),
        },
      })
      .catch(() => {});
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
  };

  attach();
  return () => {
    disposed = true;
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    retryTimer = undefined;
    retries = 0;
    if (installed) {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      installed = false;
    }
  };
}

export function setCrashRoute(screenId: string): void {
  const native = plugin();
  if (!native) return;
  const screen = /^[a-z0-9_-]{1,40}$/.test(screenId) ? screenId : "other";
  void native.setKeys({ keys: { webview_screen: screen } }).catch(() => {});
}

export function __resetCrashlyticsForTests(): void {
  if (retryTimer !== undefined) clearTimeout(retryTimer);
  retryTimer = undefined;
  retries = 0;
  installed = false;
  bridge = null;
}
