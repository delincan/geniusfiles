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

  return () => {
    document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    document.removeEventListener("contextmenu", onContextMenu, { capture: true });

    document.removeEventListener("selectstart", onSelectStart, { capture: true });
    document.removeEventListener("dragstart", onDragStart, { capture: true });
    if (previousModality === null) document.documentElement.removeAttribute("data-gf-input");
    else document.documentElement.setAttribute("data-gf-input", previousModality);
  };
}
