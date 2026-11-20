import documents from "@/assets/illustrations/Aucun_document.webp.asset.json";
import favorites from "@/assets/illustrations/Aucun_favori.webp.asset.json";
import files from "@/assets/illustrations/Aucun_fichier.webp.asset.json";
import search from "@/assets/illustrations/Aucun_résultat_de_recherche.webp.asset.json";
import images from "@/assets/illustrations/Aucune_image.webp.asset.json";
import audio from "@/assets/illustrations/Aucune_musique.webp.asset.json";
import videos from "@/assets/illustrations/Aucune_vidéo.webp.asset.json";
import androidPermission from "@/assets/illustrations/Autorisations_Android.webp.asset.json";
import copyDone from "@/assets/illustrations/Copie_terminée.webp.asset.json";
import trash from "@/assets/illustrations/Corbeille_vide.webp.asset.json";
import folder from "@/assets/illustrations/Dossier_vide.webp.asset.json";
import moveDone from "@/assets/illustrations/Déplacement_terminé.webp.asset.json";
import unknownError from "@/assets/illustrations/Erreur_inconnue.webp.asset.json";
import network from "@/assets/illustrations/Erreur_réseau.webp.asset.json";
import notFound from "@/assets/illustrations/Fichier_introuvable.webp.asset.json";
import lowSpace from "@/assets/illustrations/Mémoire_insuffisante.webp.asset.json";
import openFailed from "@/assets/illustrations/Ouverture_impossible.webp.asset.json";
import permission from "@/assets/illustrations/Permission_refusée.webp.asset.json";
import storage from "@/assets/illustrations/Stockage_inaccessible.webp.asset.json";
import operationFailed from "@/assets/illustrations/Échec_d_une_opération.webp.asset.json";
import type { EmptyIllustrationId } from "@/lib/copy/empty-illustrations";

export type IllustrationId = EmptyIllustrationId | "androidPermission" | "copyDone" | "moveDone";

/** Downloads deliberately retains its own icon; never substitute a different mascot. */
export const ILLUSTRATIONS: Partial<Record<IllustrationId, { url: string }>> = {
  files,
  documents,
  images,
  videos,
  audio,
  favorites,
  trash,
  search,
  folder,
  storage,
  permission,
  network,
  notFound,
  openFailed,
  lowSpace,
  unknownError,
  operationFailed,
  androidPermission,
  copyDone,
  moveDone,
};
