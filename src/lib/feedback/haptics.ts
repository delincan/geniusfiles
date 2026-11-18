/**
 * Vibrations de l'application — un seul interrupteur (Paramètres →
 * « Vibrations ») coupe tous les retours haptiques, où qu'ils soient émis.
 */
import { loadPrefs } from "@/lib/personalization/store";

export function hapticsEnabled(): boolean {
  return loadPrefs().feedback?.haptics !== false;
}

/** Vibration brève, ignorée si l'utilisateur a coupé les vibrations. */
export function vibrate(pattern: number | number[]): void {
  if (!hapticsEnabled()) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* navigateur sans vibration */
  }
}
