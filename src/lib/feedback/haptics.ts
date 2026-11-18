/**
 * Vibrations de l'application — un seul interrupteur (Paramètres →
 * « Vibrations ») coupe tous les retours haptiques, où qu'ils soient émis.
 */
import { Capacitor } from "@capacitor/core";
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

/**
 * Retours haptiques à sens précis, volontairement peu nombreux :
 *  - `select`  : la sélection démarre (appui long) ;
 *  - `toggle`  : un interrupteur change d'état ;
 *  - `confirm` : une opération longue s'est réellement terminée.
 */
export type HapticKind = "select" | "toggle" | "confirm";

/** Repli navigateur (ms) — courts, jamais une vibration continue. */
export const HAPTIC_FALLBACK_MS: Record<HapticKind, number> = {
  select: 10,
  toggle: 6,
  confirm: 14,
};
/** Deux retours plus rapprochés que ceci n'en font qu'un. */
export const HAPTIC_MIN_GAP_MS = 60;

type NativeImpact = (kind: HapticKind) => void;
let nativeImpact: NativeImpact | null = null;
let loading = false;
let last = -Infinity;

/* Moteur haptique Android (plugin officiel @capacitor/haptics déjà
   installé), chargé à la demande pour ne rien coûter au web. */
function ensureNative(): void {
  if (nativeImpact || loading) return;
  if (!Capacitor.isNativePlatform()) return;
  loading = true;
  void import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle }) => {
      nativeImpact = (kind) => {
        void Haptics.impact({
          style: kind === "confirm" ? ImpactStyle.Medium : ImpactStyle.Light,
        }).catch(() => {});
      };
    })
    .catch(() => {
      nativeImpact = null;
    });
}

export function haptic(kind: HapticKind): void {
  if (!hapticsEnabled()) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - last < HAPTIC_MIN_GAP_MS) return;
  last = now;
  ensureNative();
  if (nativeImpact) {
    nativeImpact(kind);
    return;
  }
  vibrate(HAPTIC_FALLBACK_MS[kind]);
}

/** Tests uniquement : oublie le dernier retour émis. */
export function resetHapticClockForTests(): void {
  last = -Infinity;
}
