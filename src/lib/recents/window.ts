/**
 * Durée couverte par la liste « Fichiers récents ».
 *
 * Réglable dans Paramètres, de quelques minutes à une semaine. La valeur
 * vit dans les préférences (`files.recentWindowMinutes`) ; toute valeur
 * inconnue ou corrompue retombe sur la valeur par défaut (7 jours), la
 * durée historique de l'application.
 */
import { DEFAULT_PREFS, loadPrefs } from "@/lib/personalization";
import type { TFunction } from "@/lib/i18n";

/** Choix proposés, en minutes, du plus court au plus long. */
export const RECENT_WINDOW_OPTIONS = [15, 30, 60, 180, 360, 720, 1440, 2880, 4320, 10080] as const;

export const DEFAULT_RECENT_WINDOW_MINUTES = DEFAULT_PREFS.files.recentWindowMinutes;

/** Ramène une valeur enregistrée à l'un des choix proposés. */
export function normalizeRecentWindow(minutes: unknown): number {
  return typeof minutes === "number" &&
    (RECENT_WINDOW_OPTIONS as readonly number[]).includes(minutes)
    ? minutes
    : DEFAULT_RECENT_WINDOW_MINUTES;
}

/** Durée en millisecondes pour une valeur en minutes. */
export function recentWindowMs(minutes: number): number {
  return normalizeRecentWindow(minutes) * 60 * 1000;
}

/** Durée actuellement choisie, en millisecondes. */
export function currentRecentWindowMs(): number {
  return recentWindowMs(loadPrefs().files.recentWindowMinutes);
}

/** Libellé lisible : « 15 minutes », « 3 heures », « 2 jours », « 1 semaine ». */
export function recentWindowLabel(minutes: number, t: TFunction): string {
  const m = normalizeRecentWindow(minutes);
  if (m === 10080) return t("settings.recentWindow.week");
  if (m < 60) return t("settings.recentWindow.minutes", { count: m });
  if (m < 1440) return t("settings.recentWindow.hours", { count: m / 60 });
  return t("settings.recentWindow.days", { count: m / 1440 });
}
