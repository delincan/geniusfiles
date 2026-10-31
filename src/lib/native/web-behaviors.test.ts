import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installNativeBehaviors } from "./web-behaviors";

describe("native input modality", () => {
  let doc: EventTarget & { documentElement: HTMLElement };
  let stop: () => void;
  const attributes = new Map<string, string>();
  const dispatch = (type: string, properties: Record<string, unknown> = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    doc.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    attributes.clear();
    const root = {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    };
    doc = Object.assign(new EventTarget(), { documentElement: root as unknown as HTMLElement });
    vi.stubGlobal("document", doc);
    vi.stubGlobal("Element", class {});
    stop = installNativeBehaviors();
  });

  afterEach(() => {
    stop();
    vi.unstubAllGlobals();
  });

  it("switches from touch to keyboard on Tab without cancelling either event", () => {
    expect(dispatch("pointerdown", { pointerType: "touch" }).defaultPrevented).toBe(false);
    expect(attributes.get("data-gf-input")).toBe("touch");
    expect(dispatch("keydown", { key: "Tab" }).defaultPrevented).toBe(false);
    expect(attributes.get("data-gf-input")).toBe("keyboard");
  });

  it("treats pen input like touch and mouse input independently", () => {
    dispatch("pointerdown", { pointerType: "pen" });
    expect(attributes.get("data-gf-input")).toBe("touch");
    dispatch("pointerdown", { pointerType: "mouse" });
    expect(attributes.get("data-gf-input")).toBe("mouse");
  });

  it("does not swallow two rapid touch releases or a scroll gesture", () => {
    dispatch("pointerdown", { pointerType: "touch" });
    expect(dispatch("touchend").defaultPrevented).toBe(false);
    expect(dispatch("touchend").defaultPrevented).toBe(false);
    expect(dispatch("touchmove").defaultPrevented).toBe(false);
    expect(dispatch("pointercancel").defaultPrevented).toBe(false);
  });

  it("does not mistake modifier keys for keyboard navigation", () => {
    dispatch("pointerdown", { pointerType: "touch" });
    dispatch("keydown", { key: "Shift" });
    expect(attributes.get("data-gf-input")).toBe("touch");
  });

  it("removes listeners and restores the original modality on cleanup", () => {
    dispatch("pointerdown", { pointerType: "touch" });
    stop();
    dispatch("keydown", { key: "Tab" });
    expect(attributes.has("data-gf-input")).toBe(false);
  });
});
