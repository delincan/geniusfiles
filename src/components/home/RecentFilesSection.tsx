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
import { Button } from "@/components/ui/button";

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
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h2 className="min-w-0 type-subtitle">{t("home.recent.title")}</h2>
        <Button
          variant="ghost"
          type="button"
          onClick={() => navigate({ to: "/fichiers-recents" })}
          className="-mr-2 h-11 shrink-0 gap-1 px-2 type-label text-primary"
        >
          {t("home.recent.viewMore")} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="flex items-center gap-3 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
            <Clock3 className="h-5 w-5" />
          </span>
          <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">
            {t("home.recent.empty")}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden">
          {files.map((f, i) => (
            <li key={addedId(f)} className={i > 0 ? "border-t border-border/50" : ""}>
              <Button
                variant="ghost"
                type="button"
                onClick={() => open(f)}
                className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0 whitespace-normal rounded-xl px-1 py-3 text-left active:bg-surface-2"
              >
                <FileIcon kind={f.kind} size="sm" path={addedAbsPath(f)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-body font-medium">
                    {f.name}
                  </span>
                  <span className="mt-1 block truncate type-meta">
                    {addedLocationLabel(f)}
                  </span>
                </span>
                <span className="col-start-2 type-meta tabular-nums">
                  {formatRecentTime(f.at)}
                </span>
              </Button>
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
