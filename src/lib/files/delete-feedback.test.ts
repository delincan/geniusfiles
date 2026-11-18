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
      unit: "file",
    });
    expect(msg).toBe("« photo.jpg » supprimé définitivement");
  });

  it("plusieurs fichiers supprimés définitivement", () => {
    setLocale("fr");
    const msg = deleteDoneMessage({ permanent: true, count: 3, name: "a", unit: "file" });
    expect(msg).toBe("3 fichiers supprimés définitivement");
  });

  it("le mot « fichiers » est traduit, jamais le code interne", () => {
    setLocale("fr");
    expect(deleteDoneMessage({ permanent: false, count: 2, name: "a", unit: "file" })).toBe(
      "2 fichiers déplacés dans la Corbeille",
    );
    expect(deleteDoneMessage({ permanent: true, count: 2, name: "a", unit: "folder" })).toBe(
      "2 dossiers supprimés définitivement",
    );
  });

  it("sans la case, le message parle toujours de la Corbeille", () => {
    setLocale("fr");
    const msg = deleteDoneMessage({
      permanent: false,
      count: 1,
      name: "photo.jpg",
      unit: "file",
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
    expect(deleteCancelledMessage({ permanent: true, count: 2, unit: "file" })).not.toMatch(
      /Corbeille|déplacé/,
    );
    expect(deleteCancelledMessage({ permanent: true, count: 2, unit: "file" })).toBe(
      "Suppression annulée — 2 fichiers déjà supprimé(s) définitivement",
    );
    expect(deleteHistorySummary({ permanent: true, count: 2, name: "a" })).not.toMatch(/Corbeille/);
  });
});
