/**
 * Supprime les comportements hérités du navigateur qui trahissent une
 * WebView : menu contextuel de sélection de texte au long-press, poignées
 * de sélection et drag d'images/liens. Le zoom est contrôlé par CSS,
 * jamais par annulation de touchend (qui peut supprimer le clic suivant).
 *
 * Les vrais champs de saisie (input / textarea / contenteditable) gardent
 * un comportement 100 % normal : sélection, curseur, copier/coller.
 */

const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
const SELECTABLE = "[data-gf-selectable='true'], [data-gf-reader='true']";

function isEditable(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  return !!el.closest(EDITABLE) || !!el.closest(SELECTABLE);
}

/* ------------------------------------------------------------------ */
/* Retour tactile immédiat                                             */
/* ------------------------------------------------------------------ */

/** Tout ce qui réagit à un appui : boutons, liens, lignes, onglets, choix. */
import { installKeyboardBehaviors } from "./keyboard";

export const PRESSABLE =
  "button, a[href], [role='button'], [role='menuitem'], [role='menuitemradio'], [role='tab'], [role='radio'], [role='checkbox'], [role='switch'], [role='option'], summary, label[for], [data-gf-pressable]";
export const PRESSED_ATTR = "data-gf-pressed";
/**
 * Délai avant d'afficher l'état pressé : comme le « tap timeout » d'Android,
 * il laisse le temps de reconnaître un défilement, pour qu'une liste qu'on
 * fait glisser ne clignote pas. Un appui bref est montré dès le relâchement.
 */
export const PRESS_SHOW_DELAY_MS = 60;
/** Durée minimale de l'état pressé après le relâchement (appui très bref). */
export const PRESS_HOLD_MS = 110;
/** Au-delà de ce déplacement, le doigt fait défiler : l'appui est annulé. */
const PRESS_SLOP_PX = 10;

function pressTarget(target: EventTarget | null): Element | null {
  if (typeof Element === "undefined" || !(target instanceof Element)) return null;
  const el = target.closest(PRESSABLE);
  if (!el) return null;
  if (el.matches(":disabled, [aria-disabled='true']")) return null;
  if (el.closest("[data-gf-no-press]")) return null;
  return el;
}

/**
 * Peint l'état « pressé » dès le contact du doigt, sans attendre le
 * `:active` tardif de la WebView. Aucun événement n'est annulé : le clic,
 * le défilement et l'appui long restent ceux du navigateur.
 */
function installPressFeedback(): () => void {
  let el: Element | null = null;
  let origin: { x: number; y: number } | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (showTimer) clearTimeout(showTimer);
    if (releaseTimer) clearTimeout(releaseTimer);
    showTimer = releaseTimer = null;
  };
  const reset = () => {
    clearTimers();
    el?.removeAttribute(PRESSED_ATTR);
    el = null;
    origin = null;
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    reset();
    const target = pressTarget(e.target);
    if (!target) return;
    el = target;
    origin = { x: e.clientX, y: e.clientY };
    showTimer = setTimeout(() => {
      showTimer = null;
      el?.setAttribute(PRESSED_ATTR, "");
    }, PRESS_SHOW_DELAY_MS);
  };
  const onMove = (e: PointerEvent) => {
    if (!el || !origin) return;
    if (
      Math.abs(e.clientX - origin.x) > PRESS_SLOP_PX ||
      Math.abs(e.clientY - origin.y) > PRESS_SLOP_PX
    )
      reset();
  };
  const onUp = () => {
    if (!el) return;
    const current = el;
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    current.setAttribute(PRESSED_ATTR, "");
    releaseTimer = setTimeout(() => {
      current.removeAttribute(PRESSED_ATTR);
      if (el === current) {
        el = null;
        origin = null;
      }
    }, PRESS_HOLD_MS);
  };

  document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  document.addEventListener("pointermove", onMove, { capture: true, passive: true });
  document.addEventListener("pointerup", onUp, { capture: true, passive: true });
  document.addEventListener("pointercancel", reset, { capture: true, passive: true });
  /* Application mise en arrière-plan pendant un appui : aucun état
     « pressé » ne doit survivre à la reprise. */
  const onHidden = () => {
    if (document.visibilityState === "hidden") reset();
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("blur", reset);
  return () => {
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("blur", reset);
    reset();
    document.removeEventListener("pointerdown", onDown, { capture: true });
    document.removeEventListener("pointermove", onMove, { capture: true });
    document.removeEventListener("pointerup", onUp, { capture: true });
    document.removeEventListener("pointercancel", reset, { capture: true });
  };
}

/** Installe les gardes globaux. Retourne une fonction de désinstallation. */
export function installNativeBehaviors(): () => void {
  if (typeof document === "undefined") return () => {};

  /* Dernier point de contact : Android émet parfois `selectstart` avec
     pour cible le document plutôt que le nœud texte touché. On se réfère
     alors à l'élément réellement pressé. */
  let lastTouchedSelectable = false;
  const previousModality = document.documentElement.getAttribute("data-gf-input");
  const setModality = (mode: "touch" | "keyboard" | "mouse") => {
    if (document.documentElement.getAttribute("data-gf-input") !== mode)
      document.documentElement.setAttribute("data-gf-input", mode);
  };
  const onPointerDown = (e: PointerEvent) => {
    lastTouchedSelectable = isEditable(e.target);
    setModality(e.pointerType === "touch" || e.pointerType === "pen" ? "touch" : "mouse");
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey || ["Shift", "Control", "Alt", "Meta"].includes(e.key))
      return;
    setModality("keyboard");
  };

  const onContextMenu = (e: Event) => {
    // Le menu contextuel du navigateur ne doit jamais apparaître, sauf
    // dans un champ de saisie ou un document, où il sert au copier/partager.
    if (isEditable(e.target) || lastTouchedSelectable) return;
    e.preventDefault();
  };

  const onSelectStart = (e: Event) => {
    if (isEditable(e.target) || lastTouchedSelectable) return;
    e.preventDefault();
  };

  const onDragStart = (e: Event) => {
    if (isEditable(e.target) || lastTouchedSelectable) return;
    e.preventDefault();
  };

  document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  document.addEventListener("keydown", onKeyDown, { capture: true });
  document.addEventListener("contextmenu", onContextMenu, { capture: true });
  document.addEventListener("selectstart", onSelectStart, { capture: true });
  document.addEventListener("dragstart", onDragStart, { capture: true });
  const stopPress = installPressFeedback();
  const stopKeyboard = installKeyboardBehaviors();

  return () => {
    stopPress();
    stopKeyboard();
    document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    document.removeEventListener("contextmenu", onContextMenu, { capture: true });

    document.removeEventListener("selectstart", onSelectStart, { capture: true });
    document.removeEventListener("dragstart", onDragStart, { capture: true });
    if (previousModality === null) document.documentElement.removeAttribute("data-gf-input");
    else document.documentElement.setAttribute("data-gf-input", previousModality);
  };
}
