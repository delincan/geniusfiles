import { ACTION_ICON, GfApk as Package, GfAudioEditor as Waves } from "@/components/icons";
import type { FileEntry } from "@/lib/files/types";
import { FileIcon } from "./FileIcon";
import { SheetActionRow as ActionRow, SheetDivider } from "./SheetActionRow";
import { fileMetaLine, formatDate } from "@/lib/files/format";
import { BottomSheet } from "./BottomSheet";
import { canReadArchive } from "@/lib/files/archive";
import { packageKindOf } from "@/lib/files/package";
import { canOpenInViewer, canPreview } from "@/lib/viewer/kinds";
import { useT } from "@/lib/i18n";

export type EntryAction =
  | "info"
  | "rename"
  | "share"
  | "copy"
  | "move"
  | "delete"
  | "compress"
  | "openArchive"
  | "extract"
  | "open"
  | "openWith"
  | "editAudio";

/**
 * Long-press / more-menu action sheet for a single entry.
 *
 * Canonical action order (identical across the app so users build muscle
 * memory) : Ouvrir · Ouvrir avec… · Partager · Renommer · Copier ·
 * Déplacer · Compresser · Informations · Supprimer. Archive-specific
 * actions are grouped at the top when the entry is an archive.
 */
export function EntryActionSheet({
  open,
  entry,
  onClose,
  onAction,
}: {
  open: boolean;
  entry: FileEntry | null;
  onClose: () => void;
  onAction: (action: EntryAction) => void;
}) {
  const t = useT();
  const pkgKind = entry ? packageKindOf(entry) : null;
  const isArchive = entry ? canReadArchive(entry) && !pkgKind : false;
  const showOpen = entry ? !pkgKind && canOpenInViewer(entry) && canPreview(entry) : false;
  const showOpenWith = entry ? !entry.isDirectory : false;
  const showEditAudio = entry ? !entry.isDirectory && entry.kind === "audio" : false;
  return (
    <BottomSheet sheet open={open && !!entry} onClose={onClose}>
      {entry ? (
        <>
          <div className="mb-2 flex items-center gap-3 pr-10">
            <FileIcon kind={entry.kind} path={entry.path} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">
                {entry.name}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground tabular-nums">
                {entry.isDirectory ? formatDate(entry.mtime) : fileMetaLine(entry)}
              </p>
            </div>
          </div>
          <SheetDivider />
          <div className="-mx-2.5 flex flex-col">
            {pkgKind ? (
              <>
                <ActionRow
                  icon={Package}
                  label={
                    pkgKind === "apk"
                      ? t("files.actions.installApp")
                      : t("files.actions.openPackage")
                  }
                  onClick={() => onAction("open")}
                />
                {canReadArchive(entry) ? (
                  <>
                    <ActionRow
                      icon={ACTION_ICON.extract}
                      label={t("files.actions.exploreContent")}
                      onClick={() => onAction("openArchive")}
                    />
                    <ActionRow
                      icon={Package}
                      label={t("files.actions.extractEllipsis")}
                      onClick={() => onAction("extract")}
                    />
                  </>
                ) : null}
                <SheetDivider />
              </>
            ) : null}
            {isArchive ? (
              <>
                <ActionRow
                  icon={ACTION_ICON.extract}
                  label={t("files.actions.openArchive")}
                  onClick={() => onAction("openArchive")}
                />
                <ActionRow
                  icon={Package}
                  label={t("files.actions.extractEllipsis")}
                  onClick={() => onAction("extract")}
                />
                <SheetDivider />
              </>
            ) : null}
            {showOpen ? (
              <ActionRow
                icon={ACTION_ICON.open}
                label={t("files.actions.openWithApp")}
                onClick={() => onAction("open")}
              />
            ) : null}
            {showOpenWith ? (
              <ActionRow
                icon={ACTION_ICON.openWith}
                label={t("files.actions.openWithOther")}
                onClick={() => onAction("openWith")}
              />
            ) : null}
            {showEditAudio ? (
              <ActionRow
                icon={Waves}
                label={t("files.actions.editAudio")}
                onClick={() => onAction("editAudio")}
              />
            ) : null}
            {!entry.isDirectory ? (
              <ActionRow
                icon={ACTION_ICON.share}
                label={t("action.share")}
                onClick={() => onAction("share")}
              />
            ) : null}
            <ActionRow
              icon={ACTION_ICON.rename}
              label={t("action.rename")}
              onClick={() => onAction("rename")}
            />
            <ActionRow
              icon={ACTION_ICON.copy}
              label={t("files.actions.copyTo")}
              onClick={() => onAction("copy")}
            />
            <ActionRow
              icon={ACTION_ICON.move}
              label={t("files.actions.moveTo")}
              onClick={() => onAction("move")}
            />
            <ActionRow
              icon={ACTION_ICON.compress}
              label={t("files.actions.compressEllipsis")}
              onClick={() => onAction("compress")}
            />
            <ActionRow
              icon={ACTION_ICON.info}
              label={t("action.details")}
              onClick={() => onAction("info")}
            />
            <SheetDivider />
            <ActionRow
              icon={ACTION_ICON.delete}
              label={t("action.delete")}
              onClick={() => onAction("delete")}
              danger
            />
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}
