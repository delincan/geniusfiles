import { describe, expect, it } from "vitest";
import { KEYBOARD_MIN_PX, isKeyboardHeight, nextBaseline } from "./keyboard";

describe("détection du clavier Android", () => {
  it("une fenêtre réduite d'au moins la hauteur d'un clavier = clavier ouvert", () => {
    expect(isKeyboardHeight(740, 740 - KEYBOARD_MIN_PX)).toBe(true);
    expect(isKeyboardHeight(740, 420)).toBe(true);
  });

  it("une petite variation (barre système, zoom) n'est pas un clavier", () => {
    expect(isKeyboardHeight(740, 700)).toBe(false);
  });

  it("la référence garde la plus grande hauteur, et repart à la rotation", () => {
    expect(nextBaseline({ width: 360, height: 740 }, 360, 420)).toEqual({
      width: 360,
      height: 740,
    });
    expect(nextBaseline({ width: 360, height: 740 }, 740, 360)).toEqual({
      width: 740,
      height: 360,
    });
  });
});
