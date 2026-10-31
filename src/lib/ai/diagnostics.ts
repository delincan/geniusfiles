import { t } from "@/lib/i18n";
/**
 * Diagnostic et gestion d'erreurs de Genius AI.
 *
 * Objectifs :
 * - journaliser finement le cycle d'une requête IA (uniquement en dev) ;
 * - distinguer les causes réelles d'échec (réseau, délai, configuration,
 *   service indisponible, erreur interne) au lieu d'un message générique.
 */

const DEV = import.meta.env.DEV;

export function aiLog(event: string, data?: unknown) {
  if (!DEV) return;
  if (data === undefined) console.info(`[genius-ai] ${event}`);
  else console.info(`[genius-ai] ${event}`, data);
}

export type ChatFailureKind =
  | "offline"
  | "network"
  | "timeout"
  | "config"
  | "rate_limit"
  | "credits"
  | "unavailable"
  | "internal";

export class ChatRequestError extends Error {
  kind: ChatFailureKind;
  status?: number;
  detail?: string;

  constructor(kind: ChatFailureKind, message: string, status?: number, detail?: string) {
    super(message);
    this.name = "ChatRequestError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

const MESSAGE_KEYS: Record<ChatFailureKind, string> = {
  offline: "assistant.diag.offline",
  network: "assistant.diag.network",
  timeout: "assistant.diag.timeout",
  config: "assistant.diag.config",
  rate_limit: "assistant.diag.rateLimit",
  credits: "assistant.diag.credits",
  unavailable: "assistant.diag.unavailable",
  internal: "assistant.diag.internal",
};

/** Message localisé (langue active) pour un type d'échec donné. */
function messageFor(kind: ChatFailureKind): string {
  return t(MESSAGE_KEYS[kind]);
}

/** Message clair et exact affiché à l'utilisateur pour une erreur d'assistant. */
export function describeChatError(err: unknown): string {
  if (err instanceof ChatRequestError) return messageFor(err.kind);

  if (typeof navigator !== "undefined" && navigator.onLine === false) return messageFor("offline");

  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (/abort|timeout/i.test(raw)) return messageFor("timeout");
  if (/failed to fetch|network|load failed|connexion/i.test(raw)) return messageFor("network");
  if (/LOVABLE_API_KEY|not configured/i.test(raw)) return messageFor("config");
  if (/429|rate.?limit/i.test(raw)) return messageFor("rate_limit");
  if (/402|credit/i.test(raw)) return messageFor("credits");
  return messageFor("internal");
}

/**
 * Détail technique court (cause réelle + adresse contactée), affiché sous le
 * message pour qu'un échec puisse être diagnostiqué depuis le téléphone.
 * Ne contient jamais de clé ni de contenu de conversation.
 */
export function describeChatErrorDetail(err: unknown): string | null {
  let text = "";
  if (err instanceof ChatRequestError) {
    text = [err.kind, err.status ? `HTTP ${err.status}` : "", err.detail ?? ""]
      .filter(Boolean)
      .join(" · ");
  } else if (err instanceof Error) {
    text = err.message;
  } else if (typeof err === "string") {
    text = err;
  }
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

const TIMEOUT_MS = 120_000;
/** Délai maximal pour obtenir la réponse initiale d'une adresse avant de passer à la suivante. */
const CONNECT_TIMEOUT_MS = 30_000;

function hostOf(url: string): string {
  try {
    return new URL(url, "http://local").host || url;
  } catch {
    return url;
  }
}

/** Adresse principale puis secours ; sans secours, l'adresse principale est retentée une fois. */
export function buildAttemptList(primary: string, fallbacks: readonly string[]): string[] {
  const list = [primary, ...fallbacks.filter((u) => u && u !== primary)];
  return list.length > 1 ? list : [primary, primary];
}

type AttemptResult =
  | { ok: true; response: Response }
  | { ok: false; error: unknown; connectTimeout: boolean };

/**
 * Une tentative avec son propre délai de connexion. Le signal global reste
 * relié à la tentative réussie : « Arrêter » et le délai total coupent aussi
 * le flux de réponse.
 */
async function attemptFetch(
  url: string,
  init: RequestInit | undefined,
  global: AbortSignal,
): Promise<AttemptResult> {
  const local = new AbortController();
  const relay = () => local.abort();
  if (global.aborted) local.abort();
  else global.addEventListener("abort", relay, { once: true });
  let connectTimeout = false;
  const timer = setTimeout(() => {
    connectTimeout = true;
    local.abort();
  }, CONNECT_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: local.signal });
    clearTimeout(timer);
    return { ok: true, response };
  } catch (error) {
    clearTimeout(timer);
    global.removeEventListener("abort", relay);
    return { ok: false, error, connectTimeout: connectTimeout && !global.aborted };
  }
}

/**
 * `fetch` instrumenté utilisé par le transport de chat :
 * délai maximal, journalisation dev, et erreurs typées.
 */
export async function chatFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbacks: readonly string[] = [],
): Promise<Response> {
  const primary = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let url = primary;
  const started = Date.now();

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ChatRequestError("offline", messageFor("offline"));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const external = init?.signal;
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", () => controller.abort(), { once: true });
  }

  if (DEV) {
    let preview: unknown = undefined;
    try {
      const body = init?.body;
      if (typeof body === "string") {
        const parsed = JSON.parse(body) as { messages?: unknown[]; storages?: unknown[] };
        preview = {
          messages: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
          storages: Array.isArray(parsed.storages) ? parsed.storages.length : 0,
        };
      }
    } catch {
      /* corps non JSON : ignoré */
    }
    aiLog("requête démarrée", { url, ...(preview as object) });
  }

  const candidates = buildAttemptList(primary, fallbacks);
  let response: Response | null = null;
  let lastError: unknown = null;
  let lastWasConnectTimeout = false;

  for (let i = 0; i < candidates.length && !response; i += 1) {
    if (controller.signal.aborted) break;
    if (i > 0) {
      // Réseau mobile instable (changement Wi-Fi/4G, réveil de l'appareil,
      // adresse momentanément injoignable) : courte pause puis nouvelle
      // tentative, sur l'adresse de secours si elle existe.
      aiLog("nouvelle tentative après échec réseau", {
        next: candidates[i],
        detail: lastError instanceof Error ? lastError.message : String(lastError),
      });
      await new Promise((r) => setTimeout(r, 800));
      if (controller.signal.aborted) break;
    }
    url = candidates[i];
    const attempt = await attemptFetch(url, init, controller.signal);
    if (attempt.ok) response = attempt.response;
    else {
      lastError = attempt.error;
      lastWasConnectTimeout = attempt.connectTimeout;
    }
  }

  if (!response) {
    clearTimeout(timer);
    const aborted = controller.signal.aborted && !external?.aborted;
    const host = hostOf(url);
    const raw = lastError instanceof Error ? lastError.message : String(lastError ?? "");
    const failure =
      aborted || lastWasConnectTimeout
        ? new ChatRequestError(
            "timeout",
            messageFor("timeout"),
            undefined,
            `${lastWasConnectTimeout ? "connect timeout" : "timeout"} · ${host}`,
          )
        : typeof navigator !== "undefined" && navigator.onLine === false
          ? new ChatRequestError("offline", messageFor("offline"))
          : new ChatRequestError("network", messageFor("network"), undefined, `${raw} · ${host}`);
    aiLog("échec réseau", {
      url,
      ms: Date.now() - started,
      kind: failure.kind,
      detail: failure.detail,
    });
    throw failure;
  }


  if (!response.ok) {
    clearTimeout(timer);
    const detail = await response.text().catch(() => "");
    const kind: ChatFailureKind =
      response.status === 429
        ? "rate_limit"
        : response.status === 402
          ? "credits"
          : response.status === 500 && /LOVABLE_API_KEY|not configured/i.test(detail)
            ? "config"
            : response.status === 404
              ? "config"
              : response.status >= 500
                ? "unavailable"
                : "internal";
    aiLog("réponse en erreur", { url, status: response.status, ms: Date.now() - started, detail });
    throw new ChatRequestError(kind, messageFor(kind), response.status, detail);
  }

  // Garde-fou APK : si l'URL de l'API n'est pas joignable, la WebView native
  // renvoie l'index.html du SPA avec un statut 200 → le flux serait illisible.
  const contentType = response.headers.get("content-type") ?? "";
  if (/text\/html/i.test(contentType)) {
    clearTimeout(timer);
    aiLog("réponse non conforme (HTML)", { url, contentType });
    throw new ChatRequestError(
      "config",
      messageFor("config"),
      response.status,
      `Réponse HTML inattendue depuis ${url}`,
    );
  }

  aiLog("réponse reçue (flux ouvert)", { url, status: response.status, ms: Date.now() - started });

  // Le corps est un flux : on libère le minuteur quand il se termine.
  if (response.body) {
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async start(controllerOut) {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controllerOut.enqueue(value);
          }
          controllerOut.close();
          clearTimeout(timer);
          aiLog("flux terminé", { url, ms: Date.now() - started });
        } catch (err) {
          clearTimeout(timer);
          aiLog("flux interrompu", { url, ms: Date.now() - started, error: err });
          controllerOut.error(err);
        }
      },
      cancel(reason?: unknown) {
        clearTimeout(timer);
        return reader.cancel(reason);
      },
    });
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  clearTimeout(timer);
  return response;
}
