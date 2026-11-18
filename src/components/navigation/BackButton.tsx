/**
 * Bouton Retour de l'interface. Il délègue au contrôleur unique de
 * navigation : même comportement que le bouton système et le geste.
 */
import { ArrowLeft } from "@/components/icons";
import { useAppBack } from "@/lib/navigation/use-app-back";
import { useT } from "@/lib/i18n";

export function BackButton({ className, size = 22 }: { className?: string; size?: number }) {
  const t = useT();
  const goBack = useAppBack();
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("action.back")}
      className={
        className ??
        "gf-press -ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground active:bg-surface-2"
      }
    >
      <ArrowLeft style={{ height: size, width: size }} />
    </button>
  );
}
