import type { ReactNode } from "react";
import {
  GfDocument,
  GfDownload,
  GfEmptyFiles,
  GfFavorite,
  GfFolder,
  GfImage,
  GfInternalStorage,
  GfLowSpace,
  GfNoResults,
  GfNotFound,
  GfOffline,
  GfOpenFailed,
  GfPermission,
  GfAudio,
  GfTrash,
  GfVideo,
  GfWarning,
  GfError,
  type GfIconComponent,
} from "@/components/icons";
import { EmptyStateAd } from "@/components/ads/EmptyStateAd";
import { type EmptyIllustrationId } from "@/lib/copy/empty-illustrations";
import { useT } from "@/lib/i18n";
import { StateIllustration } from "./StateIllustration";

/**
 * État vide de GeniusFiles.
 *
 * Illustrations dédiées sur une surface neutre commune. Les états dont
 * l'image n'a pas encore été fournie conservent leur pictogramme propre.
 * Les textes suivent immédiatement la langue active.
 */
const ICONS: Record<EmptyIllustrationId, GfIconComponent> = {
  files: GfEmptyFiles,
  documents: GfDocument,
  images: GfImage,
  videos: GfVideo,
  audio: GfAudio,
  downloads: GfDownload,
  favorites: GfFavorite,
  trash: GfTrash,
  search: GfNoResults,
  folder: GfFolder,
  storage: GfInternalStorage,
  permission: GfPermission,
  network: GfOffline,
  notFound: GfNotFound,
  openFailed: GfOpenFailed,
  lowSpace: GfLowSpace,
  unknownError: GfWarning,
  operationFailed: GfError,
};

export function IllustratedEmptyState({
  id,
  title,
  description,
  action,
  tone = "default",
  className = "",
  adSlot,
}: {
  id: EmptyIllustrationId;
  /** Surcharge facultative (chaînes déjà localisées). */
  title?: string;
  description?: string;
  action?: ReactNode;
  /** « inverted » : posé sur un fond sombre de lecteur (contraste inversé). */
  tone?: "default" | "inverted";
  className?: string;
  /**
   * Emplacement publicitaire facultatif, posé *après* le contenu de l'écran
   * vide, action comprise. Le pavé n'est posé que si la place restante
   * sous ce contenu le permet : le message et son bouton gardent toujours
   * leur position et leur accessibilité.
   */
  adSlot?: string;
}) {
  const t = useT();
  const copy = {
    title: t(`copy.empty.${id}.title`),
    description: t(`copy.empty.${id}.description`),
  };
  const Icon = ICONS[id];

  return (
    <div
      className={`flex min-h-[42vh] w-full flex-col items-center justify-center px-6 pb-[8vh] pt-6 text-center sm:min-h-[58vh] sm:pb-[12vh] ${className}`}
    >
      <StateIllustration id={id} fallback={<Icon size={44} />} />
      <div className="gf-empty-copy mt-4 flex max-w-[320px] shrink-0 flex-col items-center gap-1.5">
        <p
          className={`text-[16px] font-semibold leading-snug ${
            tone === "inverted" ? "text-reader-backdrop-foreground" : "text-foreground"
          }`}
        >
          {title ?? copy.title}
        </p>
        <p
          className={`text-[13.5px] leading-relaxed ${
            tone === "inverted" ? "text-reader-backdrop-foreground/70" : "text-muted-foreground"
          }`}
        >
          {description ?? copy.description}
        </p>
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
      {adSlot ? <EmptyStateAd slot={adSlot} /> : null}
    </div>
  );
}
