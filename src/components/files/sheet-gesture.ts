/**
 * Règles du glissement qui referme un panneau inférieur (BottomSheet `sheet`).
 */
/** Durée de la sortie du panneau inférieur (ms). */
export const SHEET_EXIT_MS = 190;
/** Déplacement minimal avant de décider si le geste est un glissement. */
export const SHEET_SLOP_PX = 8;

/**
 * Faut-il refermer le panneau au relâchement ? Oui s'il a été tiré sur plus
 * d'un tiers de sa hauteur (au plus 160 px), ou lancé franchement vers le bas.
 */
export function shouldDismissSheet(dy: number, elapsedMs: number, height: number): boolean {
  if (dy <= 0) return false;
  const distance = Math.min(160, height / 3);
  const velocity = dy / Math.max(1, elapsedMs);
  return dy >= distance || (velocity > 0.5 && dy > 40);
}
