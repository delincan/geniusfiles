import {
  GfUploadTo as ArrowUpFromLine,
  GfExternalApp as ExternalLink,
  GfCompress as FileArchive,
  GfDocument as FileText,
  GfInfo as Info,
  GfVault as Lock,
  GfUnpinned as PinOff,
  GfPinned as Pin,
  GfCut as Scissors,
  GfShareNodes as Share2,
  GfHome as Home,
  GfHidden as EyeOff,
  type AppIcon,
} from "@/components/icons";
import { BottomSheet } from "./BottomSheet";
import { SheetActionRow } from "./SheetActionRow";
import type { MoreAction, MoreActionId } from "@/lib/files/selection-actions";
import { useT } from "@/lib/i18n";

const ICONS: Record<MoreActionId, AppIcon> = {
  share: Share2,
  openWith: ExternalLink,
  compress: FileArchive,
  moveToVault: Lock,
  openAs: FileText,
  properties: Info,
  cut: Scissors,
  pin: Pin,
  hide: EyeOff,
  addToHome: Home,
};

/**
 * Renders the "Plus" sheet for a selection. The list of actions is
 * computed upstream by the selection-actions rules engine so this
 * component only handles presentation. No disabled items are shown —
 * upstream must omit unavailable actions.
 */
export function MoreActionsSheet({
  open,
  actions,
  onClose,
  isPinned,
}: {
  open: boolean;
  actions: MoreAction[];
  onClose: () => void;
  isPinned?: boolean;
}) {
  const t = useT();
  return (
    <BottomSheet sheet open={open} onClose={onClose} title={t("action.more")}>
      <div className="-mx-2.5 -mt-3 flex flex-col">
        {actions.map((a) => {
          let Icon: AppIcon = ICONS[a.id];
          if (a.id === "pin" && isPinned) Icon = PinOff;
          if (a.id === "addToHome") Icon = ArrowUpFromLine;
          return (
            <SheetActionRow
              key={a.id}
              icon={Icon}
              label={a.label}
              danger={a.danger}
              onClick={() => {
                onClose();
                a.onClick();
              }}
            />
          );
        })}
        {actions.length === 0 ? (
          <p className="px-2 py-4 text-center text-[12px] text-muted-foreground">
            {t("files.more.empty")}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}
