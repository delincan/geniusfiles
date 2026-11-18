import type { AppIcon } from "@/components/icons";
import type { ReactNode } from "react";

/**
 * État vide standard : pictogramme bleu sur pastille anthracite, titre
 * court, une phrase utile et, au besoin, une seule action principale.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: AppIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="gf-appear flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
        <Icon className="h-8 w-8 text-primary" />
      </span>
      <div className="max-w-[320px] space-y-1.5">
        <p className="text-[16px] font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
