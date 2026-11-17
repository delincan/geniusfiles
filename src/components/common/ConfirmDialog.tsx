import type { ReactNode } from "react";
import { AlertTriangle, Info } from "@/components/icons";
import { BottomSheet, PrimaryButton } from "@/components/files/BottomSheet";
import type { ConfirmCopy } from "@/lib/copy";
import { useT } from "@/lib/i18n";

/**
 * Confirmation avant une action importante.
 *
 * Toujours trois informations, jamais une question vague :
 *  1. l'action qui va être effectuée ;
 *  2. les éléments concernés ;
 *  3. la conséquence (réversible ou non).
 */
export function ConfirmDialog({
  open,
  copy,
  extra,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  copy: ConfirmCopy;
  /** Détail facultatif : liste des éléments, destination, espace libéré… */
  extra?: ReactNode;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const danger = copy.tone === "danger";
  const Icon = danger ? AlertTriangle : Info;
  return (
    <BottomSheet
      open={open}
      onClose={busy ? () => {} : onCancel}
      fullScreen={false}
      footer={
        <div className="grid w-full gap-2">
          <PrimaryButton
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t("home.confirm.working") : copy.confirmLabel}
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={onCancel} disabled={busy}>
            {t("action.cancel")}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4 pr-8">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              danger ? "bg-destructive/10 text-destructive" : "bg-primary-softer text-primary"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <p className="text-[17px] font-semibold leading-snug text-foreground">{copy.title}</p>
            <p className="text-[14px] leading-relaxed text-muted-foreground">{copy.description}</p>
          </div>
        </div>
        {extra ? <div className="rounded-xl bg-surface-2 p-3.5 text-[13px]">{extra}</div> : null}
      </div>
    </BottomSheet>
  );
}
