import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TEMPLATE_KEYS } from "./templates";

/** User-controlled scrolling: suggestions never move away from a touch target. */
export function TemplateMarquee({ onPick }: { onPick: (text: string) => void }) {
  const t = useT();
  return (
    <div
      className="gf-no-scrollbar flex max-w-full gap-2 overflow-x-auto overscroll-x-contain py-1"
      aria-label={t("assistant.templates.ariaLabel")}
    >
      {TEMPLATE_KEYS.map((key) => {
        const text = t(`assistant.templates.${key}`);
        return (
          <Button
            key={key}
            type="button"
            variant="secondary"
            onClick={() => onPick(text)}
            className="h-11 shrink-0 rounded-xl border-0 bg-surface px-3 text-[13px] font-normal text-muted-foreground hover:text-foreground"
          >
            {text}
          </Button>
        );
      })}
    </div>
  );
}
