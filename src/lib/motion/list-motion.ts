/**
 * Mouvement des listes de fichiers après une VRAIE mise à jour.
 *
 * La liste ne change qu'une fois l'opération confirmée (suppression,
 * copie, déplacement, renommage, nouvelle analyse du dossier) : l'animation
 * accompagne donc un résultat réel, jamais une promesse. Elle ne retarde
 * rien — les nouvelles lignes sont déjà en place, seul leur rendu glisse.
 *
 *  - élément retiré  : son dernier rendu s'efface (fondu court) ;
 *  - éléments restants : glissent vers leur nouvelle place (FLIP) ;
 *  - élément ajouté  : apparaît en fondu, très légère montée ;
 *  - liste remplacée (autre dossier) : simple fondu d'opacité.
 *
 * Uniquement `transform`/`opacity` via Web Animations (composité, sans
 * recalcul de mise en page), positions déduites des index — les hauteurs
 * sont fixes —, aucune mesure pendant le défilement, rien quand la
 * réduction des animations est demandée.
 */
import { useLayoutEffect, useEffect, useRef, type RefObject } from "react";

export const LIST_MOTION_MS = 190;
/** Au-delà, la mise à jour n'est plus « locale » : pas de mouvement. */
export const LIST_MOTION_MAX_CHANGES = 12;

export type ListMotionPlan =
  | { kind: "none" }
  | { kind: "replace" }
  | {
      kind: "update";
      added: string[];
      removed: { key: string; index: number }[];
      moved: { key: string; from: number; to: number }[];
    };

/** Fonction pure : décrit le mouvement entre deux listes de clés. */
export function planListMotion(prev: readonly string[], next: readonly string[]): ListMotionPlan {
  if (prev.length === 0 || next.length === 0) return { kind: "none" };
  const nextIndex = new Map<string, number>();
  next.forEach((k, i) => nextIndex.set(k, i));
  const prevIndex = new Map<string, number>();
  prev.forEach((k, i) => prevIndex.set(k, i));

  const removed: { key: string; index: number }[] = [];
  const moved: { key: string; from: number; to: number }[] = [];
  let retained = 0;
  prev.forEach((k, i) => {
    const j = nextIndex.get(k);
    if (j === undefined) removed.push({ key: k, index: i });
    else {
      retained++;
      if (j !== i) moved.push({ key: k, from: i, to: j });
    }
  });
  const added = next.filter((k) => !prevIndex.has(k));

  if (retained === 0) return { kind: "replace" };
  // Tri ou rafraîchissement sans ajout ni retrait : rien à raconter.
  if (added.length + removed.length === 0) return { kind: "none" };
  if (added.length + removed.length > LIST_MOTION_MAX_CHANGES) return { kind: "none" };
  return { kind: "update", added, removed, moved };
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export type ListGeometry = {
  /** Colonnes (1 pour une liste). */
  cols: number;
  /** Écart horizontal entre deux cellules (px). */
  gapX: number;
  /** Écart vertical entre deux rangées (px). */
  gapY: number;
};

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * Branche le mouvement sur un conteneur. Les éléments animés portent
 * `data-flip-key` ; le conteneur doit être `position: relative`.
 */
export function useListMotion(
  rootRef: RefObject<HTMLElement | null>,
  keys: readonly string[],
  geometry: ListGeometry,
): void {
  const prevKeys = useRef<readonly string[] | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const ghosts = useRef(new Set<HTMLElement>());
  const { cols, gapX, gapY } = geometry;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const before = prevKeys.current;
    if (before && sameKeys(before, keys)) return;
    prevKeys.current = keys;

    const previousNodes = nodes.current;
    const current = new Map<string, HTMLElement>();
    root?.querySelectorAll<HTMLElement>("[data-flip-key]").forEach((n) => {
      const k = n.dataset.flipKey;
      if (k) current.set(k, n);
    });
    nodes.current = current;

    if (!root || !before || reducedMotion() || typeof root.animate !== "function") return;
    const plan = planListMotion(before, keys);
    if (plan.kind === "none") return;
    if (plan.kind === "replace") {
      root.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 140, easing: EASE });
      return;
    }

    // Géométrie des emplacements, lue une seule fois sur une ligne affichée.
    const ref = current.values().next().value as HTMLElement | undefined;
    if (!ref) return;
    const refIndex = keys.indexOf(ref.dataset.flipKey ?? "");
    const rootBox = root.getBoundingClientRect();
    const box = ref.getBoundingClientRect();
    const pitchX = box.width + gapX;
    const pitchY = box.height + gapY;
    const slot = (i: number) => ({ x: (i % cols) * pitchX, y: Math.floor(i / cols) * pitchY });
    const refSlot = slot(Math.max(0, refIndex));
    const originX = box.left - rootBox.left - refSlot.x;
    const originY = box.top - rootBox.top - refSlot.y;

    for (const m of plan.moved) {
      const n = current.get(m.key);
      if (!n) continue;
      const a = slot(m.from);
      const b = slot(m.to);
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (!dx && !dy) continue;
      n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration: LIST_MOTION_MS,
        easing: EASE,
      });
    }
    for (const k of plan.added) {
      current.get(k)?.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: LIST_MOTION_MS, easing: EASE },
      );
    }
    for (const r of plan.removed) {
      const old = previousNodes.get(r.key);
      if (!old || old.isConnected) continue;
      const s = slot(r.index);
      const ghost = old.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-flip-key");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      Object.assign(ghost.style, {
        position: "absolute",
        left: `${originX + s.x}px`,
        top: `${originY + s.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        margin: "0",
        pointerEvents: "none",
      });
      // Premier enfant : peint SOUS les lignes qui glissent vers sa place.
      root.insertBefore(ghost, root.firstChild);
      ghosts.current.add(ghost);
      const anim = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160,
        easing: "cubic-bezier(0.3, 0, 1, 1)",
        fill: "forwards",
      });
      const done = () => {
        ghost.remove();
        ghosts.current.delete(ghost);
      };
      anim.onfinish = done;
      anim.oncancel = done;
    }
  });

  useEffect(() => {
    const live = ghosts.current;
    return () => {
      live.forEach((g) => g.remove());
      live.clear();
    };
  }, []);
}
