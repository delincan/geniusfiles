import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ArrowUp,
  Square,
  Menu,
  PenSquare,
  ShieldCheck,
  WifiOff,
  Copy,
  Check,
  AlertTriangle,
} from "@/components/icons";
import { useT, t as translate } from "@/lib/i18n";
import { QuotaLimitNotice } from "@/components/quota/QuotaLimitNotice";
import { AppShell } from "@/components/AppShell";
import { AssistantMarkdown } from "@/components/assistant/AssistantMarkdown";
import { AssistantDrawer } from "@/components/assistant/AssistantDrawer";
import { PipelineTrace } from "@/components/assistant/PipelineTrace";
import { TemplateMarquee } from "@/components/assistant/TemplateMarquee";
import { describeChatError, describeChatErrorDetail } from "@/lib/ai/diagnostics";
import {
  getChat,
  getConversationId,
  getServerTask,
  getTask,
  openStoredConversation,
  resetSession,
  retryTask,
  sendUserMessage,
  setStorageProvider,
  startNewConversation,
  stopTask,
  subscribeChat,
  subscribeConversationId,
  subscribeTask,
} from "@/lib/ai/session";
import { clearConversations } from "@/lib/ai/conversations";
import { useRoots } from "@/lib/fs/useRoots";
import { useViewportInset } from "@/hooks/use-viewport-inset";
import { kbSentence } from "@/lib/keyboard-props";
import { Button } from "@/components/ui/button";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { shouldHoldAnswer } from "@/components/assistant/progress";
import { chatOfflineCopy } from "@/lib/copy/empty-illustrations";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: translate("meta.assistant.title") },
      {
        name: "description",
        content: translate("meta.assistant.description"),
      },
      { property: "og:title", content: translate("meta.assistant.title") },
      {
        property: "og:description",
        content: translate("meta.assistant.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
  errorComponent: AssistantError,
});

/**
 * Filet de sécurité local : si l'écran plante (conversation corrompue,
 * rendu inattendu), on reste dans Genius AI et on propose de repartir
 * d'une conversation vierge — au lieu de renvoyer vers l'erreur globale.
 */
function AssistantError({ error, reset }: ErrorComponentProps) {
  console.error("[assistant] render error", error);
  const t = useT();
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-lg font-bold text-foreground">
          {t("assistant.error.title")}
        </h1>
        <p className="max-w-xs text-[13px] text-muted-foreground">{t("assistant.error.desc")}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => reset()} className="btn-secondary gf-press">
            {t("action.retry")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              clearConversations();
              resetSession();
              reset();
            }}
            className="btn-primary gf-press"
          >
            {t("assistant.header.newChat")}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

/** Connexion réseau de l'appareil, suivie en direct (aucun redémarrage requis). */
function subscribeOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * État « hors connexion » affiché dans la conversation.
 */
function ChatOfflineState({ onRetry }: { onRetry?: () => void }) {
  const copy = chatOfflineCopy();
  return (
    <div className="animate-fade-in flex flex-col items-center px-4 py-2 text-center">
      <WifiOff aria-hidden="true" className="h-10 w-10 shrink-0 text-muted-foreground" />
      <div className="mt-2 flex max-w-[320px] flex-col items-center gap-1.5">
        <p className="text-[17px] font-semibold leading-snug text-foreground">{copy.title}</p>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">{copy.description}</p>
        {onRetry ? (
          <div className="pt-3">
            <Button type="button" onClick={onRetry} className="btn-secondary gf-press">
              {copy.retry}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssistantPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const t = useT();
  const [input, setInput] = useState("");
  const isOnline = useIsOnline();
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { roots } = useRoots();
  const rootsRef = useRef(roots);
  useEffect(() => {
    rootsRef.current = roots;
  }, [roots]);

  const { height: viewportHeight, keyboardInset } = useViewportInset();

  // Le contexte de stockage est lu au moment de la requête, sans lier la
  // session au cycle de vie de cet écran.
  useEffect(() => {
    setStorageProvider(() =>
      rootsRef.current.map((r) => ({
        rootId: r.id,
        label: r.label,
        hint: r.hint ?? null,
        available: r.available,
      })),
    );
  }, []);

  // Session persistante : l'instance vit hors de React, donc quitter la
  // page n'interrompt jamais la tâche en cours. On s'abonne à l'instance
  // elle-même pour que « Nouvelle conversation » prenne effet aussitôt.
  const chatInstance = useSyncExternalStore(subscribeChat, getChat, getChat);
  const conversationId = useSyncExternalStore(subscribeConversationId, getConversationId, () => "");
  const chat = useChat({ chat: chatInstance });
  const { status, error } = chat;
  // Stored messages are browser-only; first paint must match the empty SSR transcript.
  const messages = hydrated ? chat.messages : [];

  const task = useSyncExternalStore(subscribeTask, getTask, getServerTask);
  const isBusy = status === "submitted" || status === "streaming";
  const taskRunning = task.phase !== "idle";

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }, []);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, []);

  const autoSize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  useEffect(() => {
    autoSize();
  }, [input, autoSize]);

  const handleSubmit = (e?: FormEvent) => {
    atBottomRef.current = true;
    e?.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    if (!navigator.onLine) {
      setOfflineBlocked(true);
      requestAnimationFrame(scrollToEnd);
      return;
    }
    setOfflineBlocked(false);
    /* Quota épuisé : le message reste dans la zone de saisie et l'écran
       propose l'annonce récompensée, rien n'est envoyé ni consommé. */
    if (!sendUserMessage(text)) {
      setLimitHit(true);
      return;
    }
    setLimitHit(false);
    setInput("");
    requestAnimationFrame(scrollToEnd);
  };

  useEffect(() => {
    if (isOnline) setOfflineBlocked(false);
  }, [isOnline]);

  const pickTemplate = (text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  };

  const startNew = () => {
    startNewConversation();
    setInput("");
  };

  useEffect(() => {
    if (!menuOpen && !isBusy && !limitHit) inputRef.current?.focus({ preventScroll: true });
  }, [conversationId, isBusy, menuOpen, limitHit]);

  // Pendant la rédaction, la pipeline reste au-dessus de la réponse en
  // cours : la structure « pipeline → réponse » ne bouge plus.
  const lastIsStreamingAssistant =
    shouldHoldAnswer(task, isBusy) && messages[messages.length - 1]?.role === "assistant";
  const head = lastIsStreamingAssistant ? messages.slice(0, -1) : messages;

  // Suivi du flux uniquement si l'utilisateur lit déjà le bas de l'écran.
  useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, task]);

  const canSend = Boolean(input.trim()) && !(offlineBlocked && !isOnline);
  const bottomSpace = keyboardInset > 0 ? 12 : undefined;
  /* Accueil : pas de défilement, tout doit tenir dans l'espace libre. */
  const isEmpty = messages.length === 0 && !taskRunning && !offlineBlocked && !error;

  return (
    <AppShell ownsHeaderInset>
      <div
        /* L'écran se limite toujours à la hauteur réellement visible : la
           conversation garde son propre espace de défilement, la saisie et
           le quota restent visibles, et quand le clavier s'ouvre le
           formulaire remonte juste au-dessus de lui. */
        className="flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden"
        style={
          viewportHeight
            ? { height: viewportHeight, maxHeight: viewportHeight, flex: "none" }
            : undefined
        }
      >
        <header
          className="flex shrink-0 items-center gap-1 px-2 pb-2"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
            paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.625rem)",
            paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.625rem)",
          }}
        >
          <Button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("assistant.header.menuLabel")}
            aria-expanded={menuOpen}
            variant="ghost"
            size="icon"
            title={t("assistant.header.menuLabel")}
            className="shrink-0 rounded-xl text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-display min-w-0 flex-1 truncate text-center text-[17px] font-semibold leading-tight tracking-tight text-foreground">
            {t("assistant.header.title")}
          </h1>
          <Button
            type="button"
            onClick={startNew}
            aria-label={t("assistant.header.newChat")}
            variant="ghost"
            size="icon"
            title={t("assistant.header.newChat")}
            className="shrink-0 rounded-xl text-muted-foreground"
          >
            <PenSquare className="h-5 w-5" />
          </Button>
        </header>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={`gf-chat-safe min-h-0 flex-1 px-4 ${
            isEmpty
              ? "flex flex-col justify-center overflow-y-auto overscroll-contain py-5"
              : "space-y-6 overflow-y-auto overscroll-contain pb-5 pt-5"
          }`}
          style={{
            paddingLeft: "calc(env(safe-area-inset-left, 0px) + 1rem)",
            paddingRight: "calc(env(safe-area-inset-right, 0px) + 1rem)",
          }}
        >
          {messages.length === 0 && !taskRunning ? (
            <Welcome privacyOpen={privacyOpen} onPrivacy={() => setPrivacyOpen((open) => !open)} />
          ) : (
            head.map((m) => <MessageBubble key={m.id} message={m} />)
          )}

          {offlineBlocked ? <ChatOfflineState onRetry={() => handleSubmit()} /> : null}

          <PipelineTrace task={task} />

          {error ? (
            <div className="gf-appear gf-chat-safe flex gap-3 rounded-2xl border border-destructive/30 bg-surface px-3.5 py-3 text-[13px]">
              <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-medium text-foreground">{describeChatError(error)}</p>
                {describeChatErrorDetail(error) ? (
                  <p className="mb-2 break-words text-[11px] text-muted-foreground">
                    {describeChatErrorDetail(error)}
                  </p>
                ) : (
                  <div className="mb-1" />
                )}
                <Button
                  type="button"
                  onClick={() => retryTask()}
                  variant="secondary"
                  size="sm"
                  className="mt-1 min-h-11"
                >
                  {t("action.retry")}
                </Button>
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div
          /* Barre de saisie et bandeau de suggestions : jamais recouverts
             par une annonce. */
          data-gf-ad-blocker
          className="shrink-0 bg-background pt-1.5"
          style={{
            paddingBottom:
              bottomSpace !== undefined
                ? 12
                : "calc(env(safe-area-inset-bottom) + 5rem)",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
          {/* Quota du jour : toujours visible au-dessus de la saisie,
              jamais recouvert par une annonce. */}
          {limitHit ? (
            <div className="mb-2 px-3">
              <QuotaLimitNotice feature="assistant" onClose={() => setLimitHit(false)} />
            </div>
          ) : null}

          {keyboardInset === 0 && !isBusy ? (
            <div className="px-4 pb-1">
              <TemplateMarquee onPick={pickTemplate} />
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className={`mx-4 flex items-end gap-2 rounded-2xl border bg-surface-2 p-2 transition-colors duration-200 ${
              focused ? "border-primary/40" : "border-transparent"
            }`}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              placeholder={t("assistant.input.placeholder")}
              aria-label={t("assistant.input.ariaLabel")}
              {...kbSentence}
              className="max-h-32 min-h-[44px] w-full min-w-0 flex-1 resize-none self-center bg-transparent px-3 py-[11px] text-[15px] leading-[22px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {isBusy ? (
              <Button
                type="button"
                onClick={() => stopTask()}
                aria-label={t("assistant.input.stop")}
                variant="secondary"
                size="icon"
                title={t("assistant.input.stop")}
                className="shrink-0 rounded-xl bg-surface-elevated"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!canSend}
                aria-label={t("assistant.input.send")}
                size="icon"
                title={t("assistant.input.send")}
                className={`shrink-0 rounded-xl transition-colors duration-150 ${
                  canSend
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-muted-foreground"
                }`}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            )}
          </form>
        </div>
      </div>

      <AssistantDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeId={conversationId}
        onOpenConversation={openStoredConversation}
        onNewConversation={startNew}
      />
    </AppShell>
  );
}

function Welcome({ privacyOpen, onPrivacy }: { privacyOpen: boolean; onPrivacy: () => void }) {
  const t = useT();
  return (
    <div className="gf-appear gf-chat-safe mx-auto flex w-full max-w-sm flex-col items-center text-center">
      <img
        src="/brand/geniusfiles-logo-128.png"
        alt="GeniusFiles"
        className="mb-5 h-16 w-16 object-contain"
      />
      <h2 className="font-display text-[24px] font-semibold leading-tight text-foreground">
        {t("assistant.header.title")}
      </h2>
      <p className="mt-3 text-[17px] font-medium leading-snug text-foreground">
        {t("assistant.welcome.title")}
      </p>
      <p className="mt-2 max-w-[20rem] text-[14px] leading-relaxed text-muted-foreground">
        {t("assistant.welcome.desc")}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onPrivacy}
        aria-expanded={privacyOpen}
        className="mt-4 h-auto min-h-11 whitespace-normal text-[12px] font-normal text-muted-foreground"
      >
        <ShieldCheck className="shrink-0 text-primary" />
        {t("assistant.welcome.privacy1")}
      </Button>
      {privacyOpen ? (
        <div className="gf-appear mt-2 space-y-2 text-left text-[13px] leading-relaxed text-muted-foreground">
          <p>{t("assistant.welcome.privacy2")}</p>
          <p>{t("assistant.welcome.privacy3")}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Bouton « Copier » discret placé sous chaque message. La zone tactile
 * reste confortable (32 px) sans allonger la carte du message.
 */
function CopyButton({ text, align }: { text: string; align: "start" | "end" }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={`mt-1 flex ${align === "end" ? "justify-end" : "justify-start"}`}>
      <Button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? t("assistant.message.copiedAria") : t("assistant.message.copyAria")}
        variant="ghost"
        size="icon"
        title={copied ? t("assistant.message.copiedAria") : t("assistant.message.copyAria")}
        className="rounded-xl text-muted-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const text = parts.map((p) => (p?.type === "text" ? p.text : "")).join("");
  if (!text) return null;
  return (
    <Message
      from={message.role}
      className={`gf-appear gf-chat-safe ${isUser ? "max-w-[88%]" : "max-w-full"}`}
    >
      <MessageContent
        className={
          isUser
            ? "gf-chat-safe rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-foreground"
            : "gf-chat-safe w-full overflow-visible py-1"
        }
      >
        {isUser ? <p className="whitespace-pre-wrap">{text}</p> : <AssistantMarkdown text={text} />}
      </MessageContent>
      <CopyButton text={text} align={isUser ? "end" : "start"} />
    </Message>
  );
}
