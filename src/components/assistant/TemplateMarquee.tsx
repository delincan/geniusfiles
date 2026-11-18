import { useT } from "@/lib/i18n";
import { TEMPLATE_KEYS } from "./templates";

/**
 * Bandeau de suggestions qui défile lentement vers la gauche, en boucle.
 * Le défilement se met en pause dès que l'utilisateur touche ou survole le
 * bandeau, pour qu'une suggestion ne lui échappe jamais sous le doigt ; avec
 * « réduire les animations », il devient une simple liste défilable à la main.
 */
export function TemplateMarquee({ onPick }: { onPick: (text: string) => void }) {
  const t = useT();
  const items = TEMPLATE_KEYS.map((key) => t(`assistant.templates.${key}`));
  const renderRow = (copy: 0 | 1) =>
    items.map((text, i) => (
      <button
        key={`${copy}-${i}`}
        type="button"
        onClick={() => onPick(text)}
        tabIndex={copy === 1 ? -1 : undefined}
        aria-hidden={copy === 1 || undefined}
        className="h-10 shrink-0 whitespace-nowrap rounded-full bg-surface px-3.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground active:bg-surface-2 active:text-foreground"
      >
        {text}
      </button>
    ));
  return (
    <div className="gf-marquee py-1" aria-label={t("assistant.templates.ariaLabel")}>
      <div className="gf-marquee-track" style={{ animationDuration: `${items.length * 5}s` }}>
        {renderRow(0)}
        {renderRow(1)}
      </div>
    </div>
  );
}
