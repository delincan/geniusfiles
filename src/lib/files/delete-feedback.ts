/**
 * Messages affichés après une suppression. Une suppression définitive ne
 * doit jamais être annoncée comme un passage par la Corbeille : l'utilisateur
 * croirait pouvoir restaurer un fichier qui n'existe plus.
 */
import { t } from "@/lib/i18n";
import type { CountUnit } from "@/lib/files/describe";

/** « fichiers », « dossiers », « éléments » dans la langue active. */
function unitWord(unit: CountUnit, count: number): string {
  return t(`unit.${unit}`, { count });
}

/** Participe passé utilisé dans les bilans « {count} éléments {verb} ». */
export function deleteVerb(permanent: boolean): string {
  return permanent ? t("files.delete.deletedForeverVerb") : t("files.recent.movedToTrashVerb");
}

/** Toast de réussite du gestionnaire de fichiers. */
export function deleteDoneMessage(opts: {
  permanent: boolean;
  count: number;
  name: string;
  unit: CountUnit;
}): string {
  const { permanent, count, name, unit } = opts;
  if (count === 1) {
    return t(permanent ? "home.delete.permanentSingle" : "home.delete.doneSingle", { name });
  }
  return t(permanent ? "home.delete.permanentMultiple" : "home.delete.doneMultiple", {
    count,
    unit: unitWord(unit, count),
  });
}

/** Toast d'annulation : ce qui a déjà été traité avant l'annulation. */
export function deleteCancelledMessage(opts: {
  permanent: boolean;
  count: number;
  unit: CountUnit;
}): string {
  const { permanent, count, unit } = opts;
  if (count === 0) return t("home.delete.cancelled");
  return t(
    permanent ? "home.delete.permanentCancelledWithCount" : "home.delete.cancelledWithCount",
    {
      count,
      unit: unitWord(unit, count),
    },
  );
}

/** Résumé enregistré dans l'historique des opérations. */
export function deleteHistorySummary(opts: {
  permanent: boolean;
  count: number;
  name: string;
}): string {
  const { permanent, count, name } = opts;
  return t(permanent ? "ops.trash.permanentDeleteSummary" : "ops.delete.summary", { count, name });
}
