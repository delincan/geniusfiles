import { describe, expect, it } from "vitest";
import { shouldDismissSheet } from "./sheet-gesture";

describe("Glisser un panneau vers le bas", () => {
  it("un petit glissement lent ne ferme pas le panneau", () => {
    expect(shouldDismissSheet(30, 400, 500)).toBe(false);
  });
  it("tiré sur plus d'un tiers de sa hauteur, il se ferme", () => {
    expect(shouldDismissSheet(170, 600, 500)).toBe(true);
  });
  it("un lancer rapide vers le bas le ferme", () => {
    expect(shouldDismissSheet(60, 80, 600)).toBe(true);
  });
  it("vers le haut, rien ne se passe", () => {
    expect(shouldDismissSheet(0, 50, 600)).toBe(false);
  });
});
