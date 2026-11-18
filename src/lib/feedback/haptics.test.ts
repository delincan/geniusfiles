import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS } from "@/lib/personalization/types";
import { savePrefs } from "@/lib/personalization/store";
import { vibrate } from "./haptics";

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
