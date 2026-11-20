import { describe, expect, it } from "vitest";
import { ILLUSTRATIONS, type IllustrationId } from "./illustrations";

const EXPECTED_FILES = {
  files: "Aucun_fichier.webp",
  documents: "Aucun_document.webp",
  images: "Aucune_image.webp",
  videos: "Aucune_vidéo.webp",
  audio: "Aucune_musique.webp",
  favorites: "Aucun_favori.webp",
  trash: "Corbeille_vide.webp",
  search: "Aucun_résultat_de_recherche.webp",
  folder: "Dossier_vide.webp",
  storage: "Stockage_inaccessible.webp",
  permission: "Permission_refusée.webp",
  network: "Erreur_réseau.webp",
  notFound: "Fichier_introuvable.webp",
  openFailed: "Ouverture_impossible.webp",
  lowSpace: "Mémoire_insuffisante.webp",
  unknownError: "Erreur_inconnue.webp",
  operationFailed: "Échec_d_une_opération.webp",
  androidPermission: "Autorisations_Android.webp",
  copyDone: "Copie_terminée.webp",
  moveDone: "Déplacement_terminé.webp",
} satisfies Partial<Record<IllustrationId, string>>;

describe("official situation illustrations", () => {
  it("associates each of the twenty supplied images with its exact situation", () => {
    expect(Object.keys(ILLUSTRATIONS)).toHaveLength(20);
    for (const [id, filename] of Object.entries(EXPECTED_FILES)) {
      const url = ILLUSTRATIONS[id as IllustrationId]?.url;
      expect(url, id).toMatch(/^\/__l5e\/assets-v1\//);
      expect(url?.endsWith(`/${filename}`), id).toBe(true);
    }
  });

  it("does not substitute another mascot for the distinct Downloads state", () => {
    expect(ILLUSTRATIONS.downloads).toBeUndefined();
  });
});
