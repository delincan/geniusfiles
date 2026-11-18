import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRESSED_ATTR,
  PRESS_HOLD_MS,
  PRESS_SHOW_DELAY_MS,
  installNativeBehaviors,
} from "./web-behaviors";

const down = (el: Element, x = 10, y = 10) =>
  el.dispatchEvent(
    Object.assign(new Event("pointerdown", { bubbles: true, cancelable: true }), {
      pointerType: "touch",
      clientX: x,
      clientY: y,
    }),
  );
const move = (el: Element, x: number, y: number) =>
  el.dispatchEvent(
    Object.assign(new Event("pointermove", { bubbles: true }), { clientX: x, clientY: y }),
  );
const up = (el: Element) => el.dispatchEvent(new Event("pointerup", { bubbles: true }));

describe("Retour visuel au toucher", () => {
  let stop: () => void;
  let button: HTMLButtonElement;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `<button id="b"><span id="s">Copier</span></button><button id="d" disabled>X</button>`;
    button = document.getElementById("b") as HTMLButtonElement;
    stop = installNativeBehaviors();
  });
  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it("le bouton touché passe à l'état pressé presque immédiatement", () => {
    down(document.getElementById("s")!);
    vi.advanceTimersByTime(PRESS_SHOW_DELAY_MS);
    expect(button.hasAttribute(PRESSED_ATTR)).toBe(true);
  });

  it("un appui très bref reste visible un court instant puis disparaît", () => {
    down(button);
    up(button);
    expect(button.hasAttribute(PRESSED_ATTR)).toBe(true);
    vi.advanceTimersByTime(PRESS_HOLD_MS);
    expect(button.hasAttribute(PRESSED_ATTR)).toBe(false);
  });

  it("faire défiler annule l'état pressé", () => {
    down(button, 10, 10);
    move(button, 10, 40);
    vi.advanceTimersByTime(PRESS_SHOW_DELAY_MS);
    expect(button.hasAttribute(PRESSED_ATTR)).toBe(false);
  });

  it("un bouton désactivé ne réagit pas", () => {
    const d = document.getElementById("d")!;
    down(d);
    vi.advanceTimersByTime(PRESS_SHOW_DELAY_MS);
    expect(d.hasAttribute(PRESSED_ATTR)).toBe(false);
  });
});
