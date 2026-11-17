/**
 * Avis contextuel affiché uniquement quand la limite du jour est atteinte.
 * Réutilise exactement les mêmes mécanismes de quota et d'annonce
 * récompensée que QuotaBadge : aucune règle n'est modifiée ici.
 */
import { Clock3, Loader2, PlayCircle, X } from "@/components/icons";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useQuota, useRenewalCountdown, useRewardedUse } from "@/lib/quota/useQuota";
import type { QuotaFeature } from "@/lib/quota/store";

function formatDelay(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

export function QuotaLimitNotice({
  feature,
  onClose,
  className = "",
}: {
  feature: QuotaFeature;
  onClose?: () => void;
  className?: string;
}) {
  const t = useT();
  const quota = useQuota(feature);
  const countdown = useRenewalCountdown();
  const { watch, watching, available } = useRewardedUse(feature);

  const onWatch = async () => {
    const outcome = await watch();
    if (outcome === "granted") {
      toast.success(t("quota.rewarded.success"));
      onClose?.();
    } else if (outcome === "unavailable") toast.info(t("quota.unavailable"));
    else toast.warning(t("quota.rewarded.failed"));
  };

  return (
    <div
      role="status"
      className={`gf-appear rounded-2xl border border-border/70 bg-surface px-3.5 py-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-foreground">
            {t(`quota.limit.${feature}.title`)}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            {t(`quota.limit.${feature}.desc`)}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("quota.close")}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          {quota.pendingRenewal
            ? t("quota.pending")
            : t("quota.renewal", { time: formatDelay(countdown) })}
        </span>
        {available && quota.canEarn ? (
          <button
            type="button"
            onClick={() => void onWatch()}
            disabled={watching}
            className="gf-press ml-auto flex h-9 items-center gap-1.5 rounded-xl bg-primary-soft px-3 text-[12.5px] font-semibold text-primary"
          >
            {watching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {watching ? t("quota.watching") : t("quota.watch")}
          </button>
        ) : null}
        {available && !quota.canEarn ? (
          <span className="ml-auto text-[11.5px] text-muted-foreground">{t("quota.max")}</span>
        ) : null}
      </div>
    </div>
  );
}
