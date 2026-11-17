import { useState } from "react";
import type { FileKind } from "@/lib/files/types";
import { useThumbnail } from "@/hooks/use-thumbnail";
import { isAndroidNative } from "@/lib/native/geniusfiles-native";
import { canThumbnail, forgetThumbnail } from "@/lib/native/thumbnails";
import { FILE_KIND_ICON, Play, type GfIconComponent } from "@/components/icons";

/**
 * Chaque catégorie possède sa propre silhouette dessinée (jamais la même
 * icône recolorée). La teinte, définie par jeton (`.gf-file-tile`), ne
 * colore que le pictogramme sur un fond neutre à peine teinté.
 */
const ICONS: Record<FileKind, GfIconComponent> = FILE_KIND_ICON;

/**
 * Tailles partagées : liste compacte (sm/md), feuilles de détails (lg) et
 * grille (fill, la vignette occupe toute sa zone).
 */
const DIMS = {
  sm: { box: "h-10 w-10", icon: "h-5 w-5", px: 80 },
  md: { box: "h-11 w-11", icon: "h-[22px] w-[22px]", px: 96 },
  lg: { box: "h-14 w-14", icon: "h-7 w-7", px: 128 },
  fill: { box: "", icon: "h-8 w-8", px: 240 },
} as const;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Aperçu déterministe pour la prévisualisation web (aucun fichier réel). */
function webPreviewUrl(path: string, px: number): string {
  return `https://picsum.photos/seed/gf-${hash(path) % 1000}/${px}/${px}`;
}

export function FileIcon({
  kind,
  size = "md",
  className = "",
  path,
}: {
  kind: FileKind;
  size?: "sm" | "md" | "lg" | "fill";
  className?: string;
  /**
   * Chemin absolu du fichier. Fourni pour les images/vidéos, il déclenche
   * la génération (et la mise en cache disque) de la vraie miniature.
   */
  path?: string | null;
}) {
  const { box, icon, px } = DIMS[size];
  const media = (kind === "image" || kind === "video") && !!path && canThumbnail(path, kind);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const thumb = useThumbnail(media ? (path as string) : null, px);
  const candidate = media
    ? (thumb ?? (isAndroidNative() ? null : webPreviewUrl(path as string, px)))
    : null;
  const src = candidate && candidate !== failedSrc ? candidate : null;
  const Icon = ICONS[kind];

  if (src) {
    // L'icône reste sous l'image jusqu'à son décodage asynchrone : aucun
    // changement d'état React pour chacune des miniatures pendant le scroll.
    return (
      <span data-kind={kind} data-size={size} className={`gf-file-tile ${box} ${className}`}>
        <Icon className={`${icon} opacity-60`} />
        <img
          src={src}
          alt=""
          loading={thumb ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={() => {
            // Vignette disparue (fichier supprimé, cache purgé) : on oublie
            // l'association pour qu'elle soit régénérée à la prochaine vue.
            forgetThumbnail(src);
            setFailedSrc(src);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {kind === "video" ? (
          <span
            aria-hidden
            className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-scrim/60 text-media-foreground"
          >
            <Play className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span data-kind={kind} data-size={size} className={`gf-file-tile ${box} ${className}`}>
      <Icon className={icon} />
    </span>
  );
}
