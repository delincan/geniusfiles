import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BottomSheet, PrimaryButton } from "@/components/files/BottomSheet";
import { StateIllustration } from "@/components/ui/StateIllustration";
import { SHEET_EXIT_MS } from "@/components/files/sheet-gesture";
import {
  getTransferSnapshot,
  subscribeTransfers,
  openTransferDestination,
  type TransferTask,
} from "@/lib/transfers/manager";
import { transferResultKind } from "@/lib/transfers/result";
import { useT } from "@/lib/i18n";

/** One root host: queue confirmed outcomes, independent of the source page and task lifetime. */
export function TransferResultHost() {
  const [queue, setQueue] = useState<TransferTask[]>([]);
  const [foreground, setForeground] = useState(true);
  const [closing, setClosing] = useState(false);
  const navigate = useNavigate();
  const t = useT();
  useEffect(() => {
    const seen = new Set<string>();
    const collect = () => {
      const completed = getTransferSnapshot().filter((task) => {
        if (seen.has(task.id) || !transferResultKind(task)) return false;
        seen.add(task.id);
        return true;
      });
      if (completed.length) setQueue((prev) => [...prev, ...completed]);
    };
    const visibility = () => setForeground(document.visibilityState === "visible");
    visibility();
    collect();
    const off = subscribeTransfers(collect);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      off();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      setClosing(false);
    }, SHEET_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);
  const task = queue[0];
  const kind = task ? transferResultKind(task) : null;
  const close = () => setClosing(true);
  if (!task || !kind) return null;
  const title =
    kind === "lowSpace" ? t("illustrations.space.title") : t(`ops.transfer.${task.mode}Done`);
  return (
    <BottomSheet
      open={foreground && !closing}
      sheet
      fullScreen={false}
      label={title}
      onClose={close}
    >
      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <StateIllustration id={kind} compact />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t(`illustrations.${kind}.message`)}
        </p>
        <dl className="w-full space-y-2 py-2 text-sm text-left">
          {kind !== "lowSpace" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("illustrations.transfer.count")}</dt>
              <dd className="font-medium">{task.succeeded}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("illustrations.transfer.destination")}</dt>
            <dd className="min-w-0 break-words text-right font-medium">{task.destLabel}</dd>
          </div>
          {kind !== "lowSpace" && task.skipped > 0 ? (
            <div className="text-muted-foreground">
              {t("ops.transfer.skippedCount", { count: task.skipped })}
            </div>
          ) : null}
        </dl>
        <PrimaryButton
          disabled={closing}
          onClick={() => {
            if (kind === "lowSpace") {
              close();
              void navigate({ to: "/nettoyeur" });
            } else {
              openTransferDestination(task);
              close();
              void navigate({ to: "/" });
            }
          }}
        >
          {t(kind === "lowSpace" ? "illustrations.space.clean" : `illustrations.${kind}.view`)}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
