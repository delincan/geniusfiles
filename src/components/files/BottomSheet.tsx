import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "@/components/icons";
import { Portal } from "@/components/common/Portal";
import { useInPickLayer } from "@/components/files/pick-layer-context";
import { BACK_PRIORITY, registerBackHandler } from "@/lib/navigation/back-stack";
import { useT } from "@/lib/i18n";
import { SHEET_EXIT_MS, SHEET_SLOP_PX, shouldDismissSheet } from "./sheet-gesture";

// Shared stack of currently-open BottomSheet ids. Only the topmost entry
// consumes hardware-back / Escape events so nested sheets do not
// cascade-close their parents.
const overlayStack: string[] = [];

const BottomSheetDefaultsContext = createContext({ fullScreen: false });

export function BottomSheetDefaultsProvider({
  fullScreen,
  children,
}: {
  fullScreen: boolean;
  children: ReactNode;
}) {
  return (
    <BottomSheetDefaultsContext.Provider value={{ fullScreen }}>
      {children}
    </BottomSheetDefaultsContext.Provider>
  );
}

/**
 * Unified modal used across GeniusFiles.
 *
 * Centered compact dialog (Android-style) that:
 *  - preserves the underlying page context (subtle backdrop dim + blur);
 *  - opens/closes with a very short fade + zoom animation;
 *  - integrates with the hardware back button via le registre unifié de
 *    navigation (aucune entrée d'historique n'est empilée, donc la pile
 *    de navigation reste exacte) ;
 *  - closes on backdrop tap, Escape, or the always-visible close button;
 *  - scrolls the panel body independently of the page underneath.
 *
 * Every dialog / picker / confirmation / context menu in the app uses
 * this component, so tweaking it here is the single source of truth for
 * all "secondary window" behaviour.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  label,
  children,
  footer,
  fullScreen,
  sheet,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible title when the illustrated body contains its own visible heading. */
  label?: string;
  children: ReactNode;
  footer?: ReactNode;
  fullScreen?: boolean;
  /**
   * Panneau inférieur (menus d'actions, listes de choix) : glisse depuis le
   * bas, se referme d'un glissement vers le bas, du bouton ✕ ou d'un appui
   * sur le fond. Les confirmations restent des dialogues centrés.
   */
  sheet?: boolean;
}) {
  const tr = useT();
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  /* Le panneau est rendu dans un portail monté après coup : on suit
     l'élément réel pour brancher le geste dès qu'il existe. */
  const [sheetEl, setSheetEl] = useState<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const stateId = useId();
  const defaults = useContext(BottomSheetDefaultsContext);
  const isFullScreen = fullScreen ?? defaults.fullScreen;
  const isSheet = Boolean(sheet) && !isFullScreen;
  const exitMs = isSheet ? SHEET_EXIT_MS : 140;

  // Keep the element mounted briefly while the exit animation plays.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // next tick so the enter animation actually plays.
      requestAnimationFrame(() => setVisible(true));
    } else if (mounted) {
      setVisible(false);
      const t = window.setTimeout(() => setMounted(false), exitMs);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted, exitMs]);

  // Escape + retour matériel + verrou de défilement.
  //
  // Le retour passe par le registre unifié : la feuille la plus récemment
  // ouverte absorbe le retour (LIFO), sans jamais empiler d'entrée
  // d'historique. Les anciennes entrées « fantômes » (poussées à
  // l'ouverture puis jamais dépilées lors d'une fermeture programmatique)
  // faussaient la pile et donnaient l'impression d'un retour vers
  // l'accueil : elles n'existent plus.
  //
  // `onClose` est souvent une fonction fléchée recréée à chaque rendu :
  // on garde une référence stable pour ne pas ré-enregistrer l'effet.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /* Une feuille ouverte pendant une session de sélection doit passer
     au-dessus de la couche de sélection (elle en fait partie). */
  const inPick = useInPickLayer();

  useEffect(() => {
    if (!open) return;

    const isTop = () => overlayStack[overlayStack.length - 1] === stateId;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTop()) {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    overlayStack.push(stateId);

    // Retour matériel / geste système : seule la feuille du dessus ferme.
    const unregister = registerBackHandler(() => {
      if (!isTop()) return false;
      onCloseRef.current();
      return true;
    }, BACK_PRIORITY.overlay);

    // Prevent background scroll while any overlay is up.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      unregister();
      document.body.style.overflow = prevOverflow;
      const idx = overlayStack.lastIndexOf(stateId);
      if (idx >= 0) overlayStack.splice(idx, 1);
    };
  }, [open, stateId]);

  // Glisser vers le bas pour fermer (panneau inférieur uniquement). Le
  // geste ne démarre que s'il est clairement vertical et que la liste est
  // en haut : faire défiler le contenu ne ferme jamais le panneau.
  useEffect(() => {
    if (!isSheet || !sheetEl) return;
    const panel = sheetEl;
    let start: { x: number; y: number; t: number; fromBody: boolean } | null = null;
    let dragging = false;
    let ignore = false;
    let dy = 0;
    let suppressClickUntil = 0;

    const setOffset = (y: number, animate: boolean) => {
      panel.style.transition = animate ? "" : "none";
      panel.style.transform = y > 0 ? `translateY(${y}px)` : "";
      const backdrop = backdropRef.current;
      if (backdrop) {
        const h = panel.offsetHeight || 1;
        backdrop.style.transition = animate ? "" : "none";
        backdrop.style.opacity = y > 0 ? String(Math.max(0, 1 - y / h)) : "";
      }
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const tch = e.touches[0];
      const body = bodyRef.current;
      start = {
        x: tch.clientX,
        y: tch.clientY,
        t: performance.now(),
        fromBody: !!body && body.contains(e.target as Node),
      };
      dragging = false;
      ignore = false;
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!start || ignore) return;
      const tch = e.touches[0];
      const ddx = tch.clientX - start.x;
      const ddy = tch.clientY - start.y;
      if (!dragging) {
        if (Math.abs(ddx) < SHEET_SLOP_PX && Math.abs(ddy) < SHEET_SLOP_PX) return;
        const body = bodyRef.current;
        const atTop = !start.fromBody || !body || body.scrollTop <= 0;
        if (ddy > 0 && Math.abs(ddy) > Math.abs(ddx) && atTop) {
          dragging = true;
          start = { ...start, y: tch.clientY, t: performance.now() };
        } else {
          ignore = true;
          return;
        }
      }
      dy = Math.max(0, tch.clientY - start.y);
      if (e.cancelable) e.preventDefault();
      setOffset(dy, false);
    };
    const onEnd = () => {
      if (!start) return;
      const s0 = start;
      start = null;
      if (!dragging) return;
      dragging = false;
      suppressClickUntil = performance.now() + 350;
      const elapsed = Math.max(1, performance.now() - s0.t);
      const h = panel.offsetHeight || 1;
      if (shouldDismissSheet(dy, elapsed, h)) {
        panel.style.transition = "";
        panel.style.transform = "translateY(100%)";
        onCloseRef.current();
      } else {
        setOffset(0, true);
      }
    };
    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd, { passive: true });
    panel.addEventListener("touchcancel", onEnd, { passive: true });
    panel.addEventListener("click", onClickCapture, { capture: true });
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
      panel.removeEventListener("click", onClickCapture, { capture: true });
      panel.style.transform = "";
      panel.style.transition = "";
    };
  }, [isSheet, sheetEl]);

  if (!mounted) return null;

  if (isSheet) {
    return (
      <Portal>
        <div
          className={`fixed inset-0 ${inPick ? "z-[3800]" : "z-[3000]"} flex items-end justify-center`}
          role="presentation"
        >
          <button
            ref={backdropRef}
            aria-label={tr("action.close")}
            onClick={onClose}
            tabIndex={-1}
            className={`absolute inset-0 h-full w-full cursor-default bg-scrim/70 transition-opacity duration-200 ease-out ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            ref={setSheetEl}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? label}
            data-gf-sheet
            className={`relative z-10 flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top,0px)-24px))] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border/70 bg-surface shadow-elevated will-change-transform ${
              visible
                ? "translate-y-0 transition-transform duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)]"
                : "translate-y-full transition-transform duration-[180ms] ease-[cubic-bezier(0.3,0,1,1)]"
            }`}
          >
            {/* Poignée : indique qu'on peut faire glisser le panneau vers le bas. */}
            <div aria-hidden className="flex h-5 shrink-0 items-end justify-center">
              <span className="h-1 w-9 rounded-full bg-muted-foreground/45" />
            </div>
            {title ? (
              <div className="flex items-center justify-between gap-3 pb-1 pl-6 pr-4 pt-1.5">
                <h3 className="min-w-0 truncate text-[17px] font-semibold text-foreground">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={tr("action.close")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label={tr("action.close")}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            )}
            <div
              ref={bodyRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3"
            >
              {children}
            </div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 bg-surface px-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </Portal>
    );
  }

  const hasHeader = Boolean(title);

  return (
    <Portal>
      <div
        className={`fixed inset-0 ${inPick ? "z-[3800]" : "z-[3000]"} flex transition-opacity duration-150 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        } ${isFullScreen ? "items-stretch justify-stretch" : "items-center justify-center px-4"}`}
        style={{
          paddingTop: isFullScreen ? 0 : "max(1.5rem, env(safe-area-inset-top, 0px))",
          paddingBottom: isFullScreen ? 0 : "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        }}
        role="presentation"
      >
        <button
          aria-label={tr("action.close")}
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default bg-scrim/70"
          tabIndex={-1}
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={title ?? label}
          className={`relative z-10 flex w-full flex-col overflow-hidden bg-surface transition-[opacity,transform] duration-150 ease-out ${
            visible ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
          } ${
            isFullScreen
              ? "h-full max-h-none max-w-none rounded-none border-0 bg-background shadow-none"
              : "max-h-full max-w-[440px] rounded-2xl border border-border/70 shadow-elevated"
          }`}
        >
          {hasHeader ? (
            <div
              className="flex items-center justify-between gap-3 px-6 pb-3 pt-5"
              style={
                isFullScreen
                  ? { paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }
                  : undefined
              }
            >
              <h3 className="min-w-0 truncate text-[17px] font-semibold text-foreground">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={tr("action.close")}
                className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all duration-150 active:scale-95 hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : (
            // Floating close button when there is no title, so every dialog
            // consistently exposes a visible way out.
            <button
              type="button"
              onClick={onClose}
              aria-label={tr("action.close")}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground transition-all duration-150 active:scale-95 hover:bg-surface-3 hover:text-foreground"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            {children}
          </div>
          {footer ? (
            <div
              className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 bg-surface px-6 py-4"
              style={
                isFullScreen
                  ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }
                  : undefined
              }
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
}) {
  const cls =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:brightness-105"
      : variant === "danger"
        ? "bg-destructive text-destructive-foreground hover:brightness-105"
        : "text-foreground hover:bg-surface-2 active:bg-surface-2";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-[15px] font-semibold transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      // Clavier Android natif : suggestions + correction + majuscule auto.
      // Voir src/lib/keyboard-props.ts pour la logique complète.
      autoCorrect="on"
      autoCapitalize="sentences"
      spellCheck
      enterKeyHint={onSubmit ? "done" : undefined}
      inputMode="text"
      onKeyDown={(e) => {
        if (e.key === "Enter" && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }}
      className="w-full rounded-xl border border-transparent bg-input px-4 h-[52px] text-[15px] text-foreground outline-none transition-all duration-150 focus:border-primary/70 focus:bg-surface placeholder:text-muted-foreground-2"
    />
  );
}

/** Controlled name-input dialog used for "new folder" and "rename". */
export function NamePrompt({
  open,
  title,
  label,
  initial,
  cta,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  initial: string;
  cta: string;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const t = useT();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setValue(initial);
      setBusy(false);
    }
  }, [open, initial]);
  const submit = async () => {
    if (busy || !value.trim()) return;
    setBusy(true);
    await onSubmit(value.trim());
    setBusy(false);
  };
  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <PrimaryButton variant="ghost" onClick={onCancel}>
            {t("action.cancel")}
          </PrimaryButton>
          <PrimaryButton onClick={submit} disabled={busy || !value.trim()}>
            {cta}
          </PrimaryButton>
        </>
      }
    >
      <label className="mb-2 block text-[13px] font-medium text-muted-foreground">{label}</label>
      <TextField
        value={value}
        onChange={setValue}
        autoFocus
        onSubmit={submit}
        placeholder={t("files.nom")}
      />
    </BottomSheet>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  extra,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Contenu complémentaire (ex. case « Supprimer définitivement »). */
  extra?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const t = useT();
  useEffect(() => {
    if (open) setBusy(false);
  }, [open]);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    await onConfirm();
    setBusy(false);
  };
  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        /* Empilés pleine largeur : un libellé long (« Déplacer vers la
           corbeille ») ne passe jamais à la ligne de façon bancale. */
        <div className="grid w-full gap-2">
          <PrimaryButton variant={danger ? "danger" : "primary"} onClick={go} disabled={busy}>
            {confirmLabel ?? t("action.confirm")}
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={onCancel}>
            {t("action.cancel")}
          </PrimaryButton>
        </div>
      }
    >
      <div className="text-[15px] leading-relaxed text-muted-foreground">{description}</div>
      {extra}
    </BottomSheet>
  );
}
