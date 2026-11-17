import { ChevronRight, Home } from "@/components/icons";
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";
import type { PathRef, StorageRoot } from "@/lib/files/types";

/**
 * Fil d'Ariane : Accueil › Stockage › … › Dossier courant.
 * Défile horizontalement, tronque intelligemment chaque segment et
 * met en avant le niveau courant.
 */
export function PathBreadcrumb({
  path,
  roots,
  onNavigate,
  onHome,
}: {
  path: PathRef | null;
  roots: StorageRoot[];
  onNavigate: (segments: string[]) => void;
  onHome: () => void;
}) {
  const t = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [path?.rootId, path?.segments.length]);

  const rootLabel = path
    ? (roots.find((r) => r.id === path.rootId)?.label ?? path.rootId)
    : t("files.breadcrumb.home");

  return (
    <div
      ref={scrollerRef}
      className="scrollbar-none flex h-10 items-center gap-0.5 overflow-x-auto px-2"
      aria-label={t("files.breadcrumb.aria")}
    >
      <Crumb
        onClick={onHome}
        label={t("files.breadcrumb.home")}
        icon={<Home className="h-[18px] w-[18px]" />}
      />
      {path ? (
        <>
          <Sep />
          <Crumb onClick={() => onNavigate([])} active={path.segments.length === 0}>
            {rootLabel}
          </Crumb>
          {path.segments.map((seg, i) => (
            <div key={`${i}-${seg}`} className="flex shrink-0 items-center gap-0.5">
              <Sep />
              <Crumb
                onClick={() => onNavigate(path.segments.slice(0, i + 1))}
                active={i === path.segments.length - 1}
              >
                {seg}
              </Crumb>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function Sep() {
  return <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground-2" />;
}

function Crumb({
  children,
  onClick,
  active,
  icon,
  label,
}: {
  children?: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  icon?: React.ReactNode;
  /** Libellé accessible d'un segment réduit à son icône. */
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 max-w-[168px] shrink-0 items-center gap-1.5 rounded-lg text-[13px] leading-none transition-[background-color,color] duration-150 ${
        children ? "px-2" : "w-8 justify-center"
      } ${
        active
          ? "font-semibold text-foreground"
          : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary"
      }`}
    >
      {icon}
      {children ? <span className="truncate">{children}</span> : null}
    </button>
  );
}
