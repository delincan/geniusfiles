import { afterEach, describe, expect, it } from "vitest";
import { getLocale, setLocale } from "@/lib/i18n";
import {
  deleteCancelledMessage,
  deleteDoneMessage,
  deleteHistorySummary,
  deleteVerb,
} from "./delete-feedback";

describe("Message après « Supprimer définitivement »", () => {
  const initial = getLocale();
  afterEach(() => setLocale(initial));

  it("un fichier supprimé définitivement n'est pas annoncé dans la Corbeille", () => {
    setLocale("fr");
    const msg = deleteDoneMessage({
      permanent: true,
      count: 1,
      name: "photo.jpg",
      unit: "fichier",
    });
    expect(msg).toBe("« photo.jpg » supprimé définitivement");
  });

  it("plusieurs fichiers supprimés définitivement", () => {
    setLocale("fr");
    const msg = deleteDoneMessage({ permanent: true, count: 3, name: "a", unit: "fichier" });
    expect(msg).toBe("3 fichiers supprimés définitivement");
  });

  it("sans la case, le message parle toujours de la Corbeille", () => {
    setLocale("fr");
    const msg = deleteDoneMessage({
      permanent: false,
      count: 1,
      name: "photo.jpg",
      unit: "fichier",
    });
    expect(msg).toBe("« photo.jpg » déplacé dans la Corbeille");
  });

  it("recherche, catégories et récents utilisent le bon verbe", () => {
    setLocale("fr");
    expect(deleteVerb(true)).toBe("supprimé(s) définitivement");
    expect(deleteVerb(false)).toBe("déplacé(s) dans la Corbeille");
  });

  it("annulation et historique ne parlent pas de Corbeille pour une suppression définitive", () => {
    setLocale("fr");
    expect(deleteCancelledMessage({ permanent: true, count: 2, unit: "fichier" })).not.toMatch(
      /Corbeille|déplacé/,
    );
    expect(deleteHistorySummary({ permanent: true, count: 2, name: "a" })).not.toMatch(/Corbeille/);
  });
});
