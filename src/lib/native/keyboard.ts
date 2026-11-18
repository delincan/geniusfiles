/**
 * Clavier Android.
 *
 * Avec l'affichage bord à bord, Capacitor réduit la WebView de la hauteur
 * du clavier : `innerHeight` diminue et `visualViewport` reste égal à la
 * fenêtre. On repère donc le clavier en comparant la hauteur courante à la
 * plus grande hauteur connue pour la même largeur (une rotation repart de
 * zéro).
 *
 * Quand le clavier s'ouvre, le champ en cours de saisie est ramené dans la
 * zone visible s'il se retrouve dessous — sans saut si il est déjà visible,
 * sans toucher à son contenu ni au curseur.
 */

/** Écart minimal de hauteur attribuable au clavier (px CSS). */
export const KEYBOARD_MIN_PX = 150;

const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']";

let baseline = { width: 0, height: 0 };

/** Fonction pure : nouvelle référence de hauteur après un redimensionnement. */
export function nextBaseline(
  prev: { width: number; height: number },
  width: number,
  height: number,
): { width: number; height: number } {
  if (prev.width !== width) return { width, height };
  return { width, height: Math.max(prev.height, height) };
}

/** Fonction pure : la différence de hauteur correspond-elle au clavier ? */
export function isKeyboardHeight(baselineHeight: number, height: number): boolean {
  return baselineHeight - height >= KEYBOARD_MIN_PX;
}

function viewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

/** Le clavier logiciel semble ouvert sur un champ de saisie. */
export function keyboardLikelyOpen(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !el.matches(EDITABLE)) return false;
  if (baseline.width !== window.innerWidth) return false;
  return isKeyboardHeight(baseline.height, viewportHeight());
}

function keepFocusedFieldVisible(): void {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !el.matches(EDITABLE)) return;
  const rect = el.getBoundingClientRect();
  const bottom = viewportHeight();
  if (rect.bottom <= bottom - 8 && rect.top >= 0) return;
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function installKeyboardBehaviors(): () => void {
  if (typeof window === "undefined") return () => {};
  baseline = { width: window.innerWidth, height: viewportHeight() };
  let raf = 0;
  const onResize = () => {
    const width = window.innerWidth;
    const height = viewportHeight();
    const opened = baseline.width === width && isKeyboardHeight(baseline.height, height);
    baseline = nextBaseline(baseline, width, height);
    if (!opened) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(keepFocusedFieldVisible);
  };
  const vv = window.visualViewport;
  window.addEventListener("resize", onResize);
  vv?.addEventListener("resize", onResize);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    vv?.removeEventListener("resize", onResize);
  };
}
