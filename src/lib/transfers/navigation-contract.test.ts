import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("transfer result navigation remains an explicit user action", () => {
  for (const route of ["index", "categorie.$kind", "fichiers-recents", "recherche"]) {
    it(`${route} never jumps to the destination after completion`, () => {
      const source = readFileSync(`src/routes/${route}.tsx`, "utf8");
      expect(source).not.toContain("openTransferDestination");
    });
  }
});
