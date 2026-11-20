import documents from "@/assets/illustrations/Aucun_document.webp.asset.json";
import search from "@/assets/illustrations/Aucun_résultat_de_recherche.webp.asset.json";
import audio from "@/assets/illustrations/Aucune_musique.webp.asset.json";
import videos from "@/assets/illustrations/Aucune_vidéo.webp.asset.json";
import copyDone from "@/assets/illustrations/Copie_terminée.webp.asset.json";
import trash from "@/assets/illustrations/Corbeille_vide.webp.asset.json";
import folder from "@/assets/illustrations/Dossier_vide.webp.asset.json";
import moveDone from "@/assets/illustrations/Déplacement_terminé.webp.asset.json";
import lowSpace from "@/assets/illustrations/Mémoire_insuffisante.webp.asset.json";
import storage from "@/assets/illustrations/Stockage_inaccessible.webp.asset.json";
import type { EmptyIllustrationId } from "@/lib/copy/empty-illustrations";

export type IllustrationId = EmptyIllustrationId | "androidPermission" | "copyDone" | "moveDone";

/** Missing uploads deliberately retain their own icon; never substitute a different mascot. */
export const ILLUSTRATIONS: Partial<Record<IllustrationId, { url: string }>> = {
  documents,
  search,
  audio,
  videos,
  copyDone,
  trash,
  folder,
  moveDone,
  lowSpace,
  storage,
};
