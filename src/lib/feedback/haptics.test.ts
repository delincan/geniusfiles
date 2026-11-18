import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS } from "@/lib/personalization/types";
import { savePrefs } from "@/lib/personalization/store";
import { HAPTIC_FALLBACK_MS, haptic, resetHapticClockForTests, vibrate } from "./haptics";

describe("Paramètres → Vibrations", () => {
  afterEach(() => savePrefs(DEFAULT_PREFS));

  it("vibre quand les vibrations sont activées", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    savePrefs({ ...DEFAULT_PREFS, feedback: { haptics: true } });
    vibrate(8);
    expect(spy).toHaveBeenCalledWith(8);
  });

  it("ne vibre jamais quand l'utilisateur les a coupées", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    savePrefs({ ...DEFAULT_PREFS, feedback: { haptics: false } });
    vibrate([12, 60, 12]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("retours haptiques ciblés", () => {
  afterEach(() => {
    savePrefs(DEFAULT_PREFS);
    resetHapticClockForTests();
  });

  it("chaque retour est une vibration courte", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    savePrefs({ ...DEFAULT_PREFS, feedback: { haptics: true } });
    haptic("select");
    expect(spy).toHaveBeenCalledWith(HAPTIC_FALLBACK_MS.select);
    for (const ms of Object.values(HAPTIC_FALLBACK_MS)) expect(ms).toBeLessThanOrEqual(15);
  });

  it("deux retours rapprochés n'en produisent qu'un", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    savePrefs({ ...DEFAULT_PREFS, feedback: { haptics: true } });
    haptic("toggle");
    haptic("toggle");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("respecte l'interrupteur Vibrations", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    savePrefs({ ...DEFAULT_PREFS, feedback: { haptics: false } });
    haptic("confirm");
    expect(spy).not.toHaveBeenCalled();
  });
});
