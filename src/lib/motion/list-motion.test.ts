import { describe, expect, it } from "vitest";
import { LIST_MOTION_MAX_CHANGES, planListMotion } from "./list-motion";

describe("mouvement des listes de fichiers", () => {
  it("une suppression confirmée fait glisser les éléments suivants", () => {
    const plan = planListMotion(["a", "b", "c"], ["a", "c"]);
    expect(plan).toEqual({
      kind: "update",
      added: [],
      removed: [{ key: "b", index: 1 }],
      moved: [{ key: "c", from: 2, to: 1 }],
    });
  });

  it("un renommage efface l'ancien nom et fait apparaître le nouveau", () => {
    const plan = planListMotion(["a", "b"], ["a", "z"]);
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.added).toEqual(["z"]);
    expect(plan.removed).toEqual([{ key: "b", index: 1 }]);
  });

  it("changer de dossier remplace la liste sans mouvement d'éléments", () => {
    expect(planListMotion(["a", "b"], ["x", "y"])).toEqual({ kind: "replace" });
  });

  it("un tri ou un rafraîchissement identique n'anime rien", () => {
    expect(planListMotion(["a", "b", "c"], ["c", "b", "a"])).toEqual({ kind: "none" });
    expect(planListMotion(["a", "b"], ["a", "b"])).toEqual({ kind: "none" });
  });

  it("une mise à jour massive ou une liste vide n'anime rien", () => {
    const prev = ["keep", ...Array.from({ length: LIST_MOTION_MAX_CHANGES + 1 }, (_, i) => `d${i}`)];
    expect(planListMotion(prev, ["keep"])).toEqual({ kind: "none" });
    expect(planListMotion([], ["a"])).toEqual({ kind: "none" });
    expect(planListMotion(["a"], [])).toEqual({ kind: "none" });
  });
});
