import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECENT_WINDOW_MINUTES,
  RECENT_WINDOW_OPTIONS,
  normalizeRecentWindow,
  recentWindowMs,
} from "./window";

describe("durée des fichiers récents", () => {
  it("va de quelques minutes à une semaine au maximum", () => {
    expect(RECENT_WINDOW_OPTIONS[0]).toBe(15);
    expect(Math.max(...RECENT_WINDOW_OPTIONS)).toBe(7 * 24 * 60);
  });

  it("garde une semaine par défaut, comme avant le réglage", () => {
    expect(DEFAULT_RECENT_WINDOW_MINUTES).toBe(10080);
  });

  it("ramène une valeur inconnue ou corrompue à la valeur par défaut", () => {
    expect(normalizeRecentWindow(99999)).toBe(10080);
    expect(normalizeRecentWindow("60")).toBe(10080);
    expect(normalizeRecentWindow(60)).toBe(60);
  });

  it("convertit une heure en millisecondes", () => {
    expect(recentWindowMs(60)).toBe(3_600_000);
  });
});
