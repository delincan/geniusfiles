/**
 * Garde anti double-déclenchement : une action qui ouvre un écran (fichier,
 * dossier, action d'un menu) n'est acceptée qu'une fois par fenêtre de temps.
 * Un double appui accidentel n'ouvre donc pas deux lecteurs ni deux dialogues,
 * tandis que les appuis rapides de sélection restent libres.
 */
export const TAP_GUARD_MS = 450;

export function createTapGuard(windowMs: number = TAP_GUARD_MS, now: () => number = Date.now) {
  let last = -Infinity;
  return function accept(): boolean {
    const t = now();
    if (t - last < windowMs) return false;
    last = t;
    return true;
  };
}

/** Garde partagée par toutes les ouvertures de fichiers et de dossiers. */
export const acceptOpenTap = createTapGuard();

/** Garde partagée par les rangées des menus d'actions (une action par appui). */
export const acceptMenuTap = createTapGuard(400);
