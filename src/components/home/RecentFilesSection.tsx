/**
 * Section « Fichiers récents » de la page d'accueil.
 *
 * Affiche les fichiers réellement ajoutés au stockage (téléchargement
 * terminé, photo prise, réception Bluetooth / Quick Share, copie,
 * extraction, document créé…), du plus récent au plus ancien.
 * L'ouverture d'un fichier dans GeniusFiles n'influence jamais cette
 * liste : seule la date réelle d'ajout compte.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Clock3 } from "@/components/icons";
import { FileIcon } from "@/components/files/FileIcon";
import { UniversalViewer } from "@/components/viewer/UniversalViewer";
import { canPreview } from "@/lib/viewer/kinds";
import { openWithSystem } from "@/lib/viewer/openWith";
import type { PathRef } from "@/lib/files/types";
import {
  addedAbsPath,
  addedId,
  addedLocationLabel,
  loadAddedFiles,
  subscribeAdded,
  watchAddedFiles,
  type AddedFile,
} from "@/lib/recents/added";
import { formatRecentTime } from "@/lib/recents/store";
import { useT } from "@/lib/i18n";

const MAX_ITEMS = 2;

function parentOf(f: AddedFile): PathRef {
  return { rootId: f.rootId, segments: f.folderSegments };
}

export function RecentFilesSection() {
  const t = useT();
  const navigate = useNavigate();
  const [files, setFiles] = useState<AddedFile[]>([]);
  const [viewerName, setViewerName] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setFiles(loadAddedFiles().slice(0, MAX_ITEMS));
    refresh();
    const unsubscribe = subscribeAdded(refresh);
    const stop = watchAddedFiles();
    return () => {
      unsubscribe();
      stop();
    };
  }, []);

  const previewable = useMemo(() => files.filter((f) => canPreview(f)), [files]);
  const viewerIndex = useMemo(
    () => (viewerName ? previewable.findIndex((f) => f.name === viewerName) : -1),
    [previewable, viewerName],
  );

  const open = useCallback(async (f: AddedFile) => {
    if (canPreview(f)) setViewerName(f.name);
    else await openWithSystem(parentOf(f), f);
  }, []);

  return (
    <section aria-label={t("home.recent.aria")}>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="type-overline">{t("home.recent.title")}</h2>
        <button
          type="button"
          onClick={() => navigate({ to: "/fichiers-recents" })}
          className="inline-flex min-h-7 items-center gap-1 -mr-2 rounded-lg px-2 text-[12.5px] font-medium text-primary transition-colors active:bg-primary/10"
        >
          {t("home.recent.viewMore")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {files.length === 0 ? (
        <div className="flex items-center gap-3 gf-tile px-3.5 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
            <Clock3 className="h-5 w-5" />
          </span>
          <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">
            {t("home.recent.empty")}
          </p>
        </div>
      ) : (
        <ul className="gf-tile overflow-hidden active:scale-100">
          {files.map((f, i) => (
            <li key={addedId(f)} className={i > 0 ? "border-t border-border/50" : ""}>
              <button
                type="button"
                onClick={() => open(f)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface-2"
              >
                <FileIcon kind={f.kind} size="sm" path={addedAbsPath(f)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium leading-tight">
                    {f.name}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                    {addedLocationLabel(f)}
                  </span>
                </span>
                <span className="shrink-0 self-start pt-0.5 text-[11.5px] tabular-nums text-muted-foreground">
                  {formatRecentTime(f.at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <UniversalViewer
        open={viewerIndex >= 0}
        entries={previewable}
        parent={
          previewable[viewerIndex >= 0 ? viewerIndex : 0]
            ? parentOf(previewable[viewerIndex >= 0 ? viewerIndex : 0])
            : null
        }
        index={viewerIndex >= 0 ? viewerIndex : 0}
        onIndexChange={(i) => {
          const next = previewable[i];
          if (next) setViewerName(next.name);
        }}
        onClose={() => setViewerName(null)}
        parentOf={(e) => parentOf(e as never)}
        onAction={async (entry, action) => {
          const f = entry as AddedFile;
          if (action === "openWith") await openWithSystem(parentOf(f), f);
          else navigate({ to: "/fichiers-recents" });
        }}
      />
    </section>
  );
}
