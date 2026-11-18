/**
 * Structure des Paramètres — sections à titre discret et lignes alignées.
 *
 * Une section = un petit titre + une carte anthracite contenant des lignes.
 * Chaque ligne garde la même hauteur tactile (60 px min), la même icône
 * neutre à gauche et un séparateur aligné sur le texte.
 */
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ExternalLink } from "@/components/icons";

type IconType = ComponentType<{ className?: string }>;

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 type-overline">{title}</h2>
      <div className="gf-card">{children}</div>
    </section>
  );
}

function RowBody({
  icon: Icon,
  label,
  desc,
  danger,
}: {
  icon?: IconType;
  label: string;
  desc?: ReactNode;
  danger?: boolean;
}) {
  return (
    <>
      {Icon ? (
        <Icon
          className={`h-5 w-5 shrink-0 ${danger ? "text-destructive" : "text-muted-foreground"}`}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[14.5px] font-medium leading-snug ${
            danger ? "text-destructive" : "text-foreground"
          }`}
        >
          {label}
        </span>
        {desc ? (
          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
            {desc}
          </span>
        ) : null}
      </span>
    </>
  );
}

const ROW = "gf-settings-row flex min-h-[60px] w-full items-center gap-4 px-4 py-3 text-left";

/** Ligne de réglage avec contrôle à droite (interrupteur, bouton, valeur). */
export function SettingsRow({
  icon,
  label,
  desc,
  children,
}: {
  icon?: IconType;
  label: string;
  desc?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={ROW}>
      <RowBody icon={icon} label={label} desc={desc} />
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

/** Ligne dont le contrôle occupe toute la largeur sous le libellé. */
export function SettingsStackedRow({
  icon,
  label,
  desc,
  children,
}: {
  icon?: IconType;
  label: string;
  desc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="gf-settings-row flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center gap-4">
        <RowBody icon={icon} label={label} desc={desc} />
      </div>
      {children}
    </div>
  );
}

/** Ligne qui ouvre un choix : valeur actuelle + chevron. */
export function SettingsChoiceRow({
  icon,
  label,
  desc,
  value,
  onClick,
}: {
  icon?: IconType;
  label: string;
  desc?: ReactNode;
  value?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`${ROW} gf-press-row`}>
      <RowBody icon={icon} label={label} desc={desc} />
      <span className="flex max-w-[45%] shrink-0 items-center gap-1 text-[13px] font-medium text-muted-foreground">
        {value ? <span className="truncate">{value}</span> : null}
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" />
      </span>
    </button>
  );
}

/** Ligne de navigation interne (vers un autre écran de l'application). */
export function SettingsNavRow({
  icon,
  label,
  desc,
  to,
}: {
  icon?: IconType;
  label: string;
  desc?: ReactNode;
  to: "/coffre-fort" | "/automatisations/historique";
}) {
  return (
    <Link to={to} className={`${ROW} gf-press-row`}>
      <RowBody icon={icon} label={label} desc={desc} />
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" />
    </Link>
  );
}

/** Bouton d'action secondaire, compact et neutre (rouge si destructif). */
export function SettingsAction({
  children,
  onClick,
  icon: Icon,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: IconType;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`gf-press inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold ${
        danger ? "bg-destructive/10 text-destructive" : "bg-surface-2 text-foreground"
      }`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

/** Lien externe (navigateur intégré sur Android) ou adresse e-mail. */
export function SettingsLink({
  label,
  desc,
  href,
  icon,
}: {
  label: string;
  desc?: string;
  href: string;
  icon: IconType;
}) {
  const isExternal = href.startsWith("http");

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isExternal) return;
    e.preventDefault();
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: href });
    } catch {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      target={isExternal ? "_blank" : undefined}
      rel="noreferrer"
      className={`${ROW} gf-press-row`}
    >
      <RowBody icon={icon} label={label} desc={desc} />
      {isExternal ? (
        <ExternalLink className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" />
      ) : (
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" />
      )}
    </a>
  );
}
