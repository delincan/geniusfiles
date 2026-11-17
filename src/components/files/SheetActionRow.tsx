import type { AppIcon } from "@/components/icons";

/**
 * Rangée d'action partagée des feuilles « Actions » et « Plus » : même
 * pictogramme, même taille, même zone tactile ; le rouge est réservé aux
 * actions destructives.
 */
export function SheetActionRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: AppIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-danger={danger || undefined}
      className="gf-sheet-action"
    >
      <Icon className="gf-sheet-action-icon" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export function SheetDivider() {
  return <div aria-hidden className="mx-2.5 my-1.5 h-px bg-border/60" />;
}
