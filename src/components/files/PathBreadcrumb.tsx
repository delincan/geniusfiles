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
      className="scrollbar-none flex items-center gap-0.5 overflow-x-auto px-2 py-1.5"
      aria-label={t("files.breadcrumb.aria")}
    >
      <Crumb onClick={onHome} icon={<Home className="h-4 w-4" />}>
        {t("files.breadcrumb.home")}
      </Crumb>
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
  return <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" />;
}

function Crumb({
  children,
  onClick,
  active,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-8 max-w-[160px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-[background-color,color,transform] duration-150 active:scale-95 ${
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
