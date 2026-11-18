import { describe, expect, it } from "vitest";
import { createTapGuard } from "./tap-guard";

describe("Double appui accidentel", () => {
  it("un second appui dans la fenêtre est ignoré", () => {
    let now = 1000;
    const accept = createTapGuard(450, () => now);
    expect(accept()).toBe(true);
    now += 120;
    expect(accept()).toBe(false);
  });

  it("un nouvel appui après la fenêtre est accepté", () => {
    let now = 1000;
    const accept = createTapGuard(450, () => now);
    accept();
    now += 460;
    expect(accept()).toBe(true);
  });
});
