import { Check, ChevronRight, Eye, MoreVertical } from "@/components/icons";
import { memo, useMemo, useRef } from "react";
import { countLabel } from "@/lib/copy";
import { useT } from "@/lib/i18n";
import { formatDate, formatSize, kindLabel } from "@/lib/files/format";
import { useFolderCount } from "@/lib/files/folder-count";
import type { FileEntry, PathRef } from "@/lib/files/types";
import { FileIcon } from "./FileIcon";
import { useWindowVirtualList } from "@/hooks/use-virtual-list";
import { haptic } from "@/lib/feedback/haptics";
import { useListMotion } from "@/lib/motion/list-motion";
import { acceptOpenTap } from "@/lib/feedback/tap-guard";

// Hauteurs FIXES : aucune re-mesure pendant le défilement, donc aucune
// « danse » des éléments, même en défilement rapide sur 100 000 fichiers.
const ROW_HEIGHT = 72;
const GRID_CELL_HEIGHT = 156;
const GRID_ROW_HEIGHT = GRID_CELL_HEIGHT + 10; // + gap vertical
/* Emplacements des lignes / cellules pour le mouvement après une opération
   (gap-x-2 = 8 px, gap-y-2.5 = 10 px — identiques en mode virtualisé). */
const LIST_GEOMETRY = { cols: 1, gapX: 0, gapY: 0 };
const GRID_GEOMETRY = { cols: 3, gapX: 8, gapY: GRID_ROW_HEIGHT - GRID_CELL_HEIGHT };

type Props = {
  entries: FileEntry[];
  /** Identité complète pour les listes couvrant plusieurs racines. */
  entryKey?: (entry: FileEntry) => string;
  /** Dossier parent — sert au comptage paresseux des éléments d'un dossier. */
  parent?: PathRef | null;
  onOpen: (entry: FileEntry) => void;
  /**
   * Ouverture rapide depuis la vignette pendant le mode sélection : ouvre
   * le fichier dans le lecteur interne sans toucher à la sélection.
   * Par défaut, retombe sur `onOpen`.
   */
  onQuickOpen?: (entry: FileEntry) => void;
  /**
   * Vignette personnalisée (icône réelle d'une application, par exemple).
   * Retourne `null` pour conserver l'icône de type standard.
   */
  renderIcon?: (entry: FileEntry) => React.ReactNode;
  onLongPress: (entry: FileEntry) => void;
  onMore: (entry: FileEntry) => void;
  selectionMode: boolean;
  isSelected: (entry: FileEntry) => boolean;
  onToggleSelect: (entry: FileEntry) => void;
};

const LONG_PRESS_MS = 380;
const pathKey = (entry: FileEntry) => entry.path;

function usePressBinder(entry: FileEntry, onLongPress: (e: FileEntry) => void) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const clear = () => {
    origin.current = null;
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  return {
    fired,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        fired.current = false;
        clear();
        origin.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          timer.current = null;
          fired.current = true;
          // Un seul tic bref : il confirme que la sélection a démarré.
          haptic("select");
          onLongPress(entry);
        }, LONG_PRESS_MS);
      },
      /* Dès que le doigt glisse (défilement ou tirer pour actualiser),
         l'appui long est abandonné : plus aucune sélection accidentelle. */
      onPointerMove: (e: React.PointerEvent) => {
        const start = origin.current;
        if (!start || timer.current == null) return;
        if (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8) clear();
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
    },
  };
}

export function FileListView({
  entries,
  entryKey = pathKey,
  parent,
  onOpen,
  onQuickOpen,
  renderIcon,
  onLongPress,
  onMore,
  selectionMode,
  isSelected,
  onToggleSelect,
}: Props) {
  const { enabled, parentRef, virtualizer, scrollMargin } = useWindowVirtualList({
    count: entries.length,
    estimateSize: ROW_HEIGHT,
    overscan: 10,
  });
  const motionRef = useRef<HTMLDivElement>(null);
  const keys = useMemo(() => entries.map(entryKey), [entries, entryKey]);
  useListMotion(motionRef, keys, LIST_GEOMETRY);

  if (!enabled) {
    return (
      <div ref={motionRef} className="relative">
        {entries.map((entry) => (
          <FileRow
            key={entryKey(entry)}
            flipKey={entryKey(entry)}
            entry={entry}
            parent={parent ?? null}
            onOpen={onOpen}
            onQuickOpen={onQuickOpen}
            renderIcon={renderIcon}
            onLongPress={onLongPress}
            onMore={onMore}
            selectionMode={selectionMode}
            isSelected={isSelected(entry)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  return (
    <div ref={motionRef} className="relative">
      <div ref={parentRef} style={{ position: "relative", height: `${totalSize}px` }}>
        {items.map((v) => {
          const entry = entries[v.index];
          return (
            <div
              key={entryKey(entry)}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${ROW_HEIGHT}px`,
                transform: `translateY(${v.start - scrollMargin}px)`,
                contain: "layout paint style",
              }}
            >
              <FileRow
                flipKey={entryKey(entry)}
                entry={entry}
                parent={parent ?? null}
                onOpen={onOpen}
                onQuickOpen={onQuickOpen}
                renderIcon={renderIcon}
                onLongPress={onLongPress}
                onMore={onMore}
                selectionMode={selectionMode}
                isSelected={isSelected(entry)}
                onToggleSelect={onToggleSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const FileRow = memo(function FileRow({
  flipKey,
  entry,
  parent,
  onOpen,
  onQuickOpen,
  renderIcon,
  onLongPress,
  onMore,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  /** Identité suivie par le mouvement de liste. */
  flipKey?: string;
  entry: FileEntry;
  parent?: PathRef | null;
  onOpen: (e: FileEntry) => void;
  onQuickOpen?: (e: FileEntry) => void;
  renderIcon?: (entry: FileEntry) => React.ReactNode;
  onLongPress: (e: FileEntry) => void;
  onMore: (e: FileEntry) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (e: FileEntry) => void;
}) {
  const t = useT();
  const press = usePressBinder(entry, onLongPress);
  const count = useFolderCount(parent, entry.name, entry.isDirectory);
  // Colonne de droite : nombre d'éléments (dossier) ou taille (fichier).
  const trailing = entry.isDirectory
    ? count == null
      ? ""
      : countLabel(count, "item")
    : formatSize(entry.size);
  const secondary = entry.isDirectory ? "" : kindLabel(entry.kind, entry.ext);

  return (
    <button
      type="button"
      data-entry-name={entry.name}
      data-flip-key={flipKey}
      {...press.handlers}
      onClick={() => {
        if (press.fired.current) return;
        if (selectionMode) onToggleSelect(entry);
        else if (acceptOpenTap()) onOpen(entry);
      }}
      aria-pressed={selectionMode ? isSelected : undefined}
      style={{ height: ROW_HEIGHT }}
      className={`gf-file-row group relative flex w-full items-center gap-3 px-4 text-left transition-colors duration-150 ${
        isSelected ? "bg-primary-soft" : "hover:bg-surface/70 active:bg-surface-2"
      }`}
    >
      <OpenZone
        entry={entry}
        active={selectionMode}
        onOpen={entry.isDirectory ? onOpen : (onQuickOpen ?? onOpen)}
        label={
          entry.isDirectory
            ? t("files.list.openFolder", { name: entry.name })
            : t("files.list.openFile", { name: entry.name })
        }
      >
        {renderIcon?.(entry) ?? <FileIcon kind={entry.kind} path={entry.path} />}
      </OpenZone>

      <div className="min-w-0 flex-1">
        <p className="gf-row-title line-clamp-2 [overflow-wrap:anywhere]">{entry.name}</p>
        <div className="mt-0.5 flex items-baseline gap-3">
          <span className="gf-row-meta mt-0 min-w-0 flex-1 truncate">
            {formatDate(entry.mtime)}
            {secondary ? <span className="text-muted-foreground-2"> · {secondary}</span> : null}
          </span>
          {trailing ? (
            <span className="gf-row-meta mt-0 shrink-0 whitespace-nowrap tabular-nums">
              {trailing}
            </span>
          ) : null}
        </div>
      </div>
      {selectionMode ? (
        <SelectToggle selected={isSelected} onToggle={() => onToggleSelect(entry)} />
      ) : (
        /* Fichiers ET dossiers : chaque élément a son menu contextuel. */
        <MoreAction onClick={() => onMore(entry)} />
      )}
    </button>
  );
});

export function FileGridView({
  entries,
  entryKey = pathKey,
  parent,
  onOpen,
  onQuickOpen,
  renderIcon,
  onLongPress,
  onMore,
  selectionMode,
  isSelected,
  onToggleSelect,
}: Props) {
  const COLS = 3;
  const rowCount = Math.ceil(entries.length / COLS);
  const { enabled, parentRef, virtualizer, scrollMargin } = useWindowVirtualList({
    count: rowCount,
    estimateSize: GRID_ROW_HEIGHT,
    overscan: 6,
    threshold: 40,
  });
  const motionRef = useRef<HTMLDivElement>(null);
  const keys = useMemo(() => entries.map(entryKey), [entries, entryKey]);
  useListMotion(motionRef, keys, GRID_GEOMETRY);
  if (!enabled) {
    return (
      <div ref={motionRef} className="relative grid grid-cols-3 gap-x-2 gap-y-2.5 px-3">
        {entries.map((entry) => (
          <GridCell
            key={entryKey(entry)}
            flipKey={entryKey(entry)}
            entry={entry}
            parent={parent ?? null}
            onOpen={onOpen}
            onQuickOpen={onQuickOpen}
            renderIcon={renderIcon}
            onLongPress={onLongPress}
            onMore={onMore}
            selectionMode={selectionMode}
            isSelected={isSelected(entry)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  return (
    <div ref={motionRef} className="relative">
      <div ref={parentRef} style={{ position: "relative", height: `${totalSize}px` }}>
        {items.map((v) => {
          const start = v.index * COLS;
          const rowEntries = entries.slice(start, start + COLS);
          return (
            <div
              key={v.key}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${GRID_ROW_HEIGHT}px`,
                transform: `translateY(${v.start - scrollMargin}px)`,
                contain: "layout paint style",
              }}
            >
              <div className="grid grid-cols-3 gap-x-2 px-3 pb-2.5">
                {rowEntries.map((entry) => (
                  <GridCell
                    key={entryKey(entry)}
                    flipKey={entryKey(entry)}
                    entry={entry}
                    parent={parent ?? null}
                    onOpen={onOpen}
                    onQuickOpen={onQuickOpen}
                    renderIcon={renderIcon}
                    onLongPress={onLongPress}
                    onMore={onMore}
                    selectionMode={selectionMode}
                    isSelected={isSelected(entry)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GridCell = memo(function GridCell({
  flipKey,
  entry,
  parent,
  onOpen,
  onQuickOpen,
  renderIcon,
  onLongPress,
  onMore,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  flipKey?: string;
  entry: FileEntry;
  parent: PathRef | null;
  onOpen: (e: FileEntry) => void;
  onQuickOpen?: (e: FileEntry) => void;
  renderIcon?: (entry: FileEntry) => React.ReactNode;
  onLongPress: (e: FileEntry) => void;
  onMore: (e: FileEntry) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (e: FileEntry) => void;
}) {
  const t = useT();
  const press = usePressBinder(entry, onLongPress);
  const count = useFolderCount(parent, entry.name, entry.isDirectory);
  const meta = entry.isDirectory
    ? count == null
      ? kindLabel(entry.kind)
      : countLabel(count, "item")
    : formatSize(entry.size);
  const custom = renderIcon?.(entry);
  return (
    <button
      type="button"
      data-entry-name={entry.name}
      data-flip-key={flipKey}
      {...press.handlers}
      onClick={() => {
        if (press.fired.current) return;
        if (selectionMode) onToggleSelect(entry);
        else if (acceptOpenTap()) onOpen(entry);
      }}
      aria-pressed={selectionMode ? isSelected : undefined}
      style={{ height: GRID_CELL_HEIGHT }}
      className={`gf-press group relative flex min-w-0 flex-col gap-2 rounded-xl p-1.5 text-left transition-colors duration-150 ${
        isSelected ? "bg-primary-soft" : "hover:bg-surface/70 active:bg-surface-2"
      }`}
    >
      <OpenZone
        entry={entry}
        active={selectionMode}
        onOpen={entry.isDirectory ? onOpen : (onQuickOpen ?? onOpen)}
        className="block h-[100px] w-full"
        label={
          entry.isDirectory
            ? t("files.list.openFolder", { name: entry.name })
            : t("files.list.openFile", { name: entry.name })
        }
      >
        <span
          className={`flex h-[100px] w-full items-center justify-center overflow-hidden rounded-lg ${
            isSelected ? "ring-2 ring-primary" : ""
          } ${custom ? "bg-surface" : ""}`}
        >
          {custom ?? <FileIcon kind={entry.kind} size="fill" path={entry.path} />}
        </span>
      </OpenZone>
      {selectionMode ? (
        <SelectToggle
          selected={isSelected}
          onToggle={() => onToggleSelect(entry)}
          className="absolute right-1.5 top-1.5 z-10"
          overlay
        />
      ) : null}

      <div className="flex min-w-0 items-start gap-0.5 pl-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-[18px] text-foreground">
            {entry.name}
          </p>
          <p className="truncate text-[11.5px] leading-4 text-muted-foreground">{meta}</p>
        </div>
        {selectionMode ? null : <MoreAction compact onClick={() => onMore(entry)} />}
      </div>
    </button>
  );
});

/** Case de sélection partagée : même forme et même bleu en liste et en grille. */
function SelectToggle({
  selected,
  onToggle,
  className = "",
  overlay,
}: {
  selected: boolean;
  onToggle: () => void;
  className?: string;
  /** Posée sur une vignette : pastille opaque pour rester lisible. */
  overlay?: boolean;
}) {
  const t = useT();
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={selected ? t("action.deselect") : t("action.select")}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`-mr-2 flex h-11 w-11 shrink-0 items-center justify-center ${
        overlay ? "mr-0 h-9 w-9" : ""
      } ${className}`}
    >
      <span
        data-selected={selected}
        className={`gf-select-mark ${overlay && !selected ? "bg-background/70" : ""}`}
      >
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </span>
  );
}

/**
 * Zone d'ouverture rapide (icône / vignette).
 *
 * En mode sélection, un appui sur la vignette ouvre le fichier dans le
 * lecteur GeniusFiles sans quitter la sélection ; l'appui ailleurs sur la
 * ligne continue de cocher/décocher. Hors sélection, la zone est
 * totalement transparente (l'appui remonte à la ligne).
 */
function OpenZone({
  entry,
  active,
  onOpen,
  label,
  className = "",
  children,
}: {
  entry: FileEntry;
  active: boolean;
  onOpen: (e: FileEntry) => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!active) return className ? <span className={className}>{children}</span> : <>{children}</>;
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(entry);
      }}
      className={`relative shrink-0 rounded-lg transition-transform active:scale-95 ${className}`}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background shadow-sm"
      >
        {entry.isDirectory ? (
          <ChevronRight className="h-2.5 w-2.5" strokeWidth={3} />
        ) : (
          <Eye className="h-2.5 w-2.5" />
        )}
      </span>
    </span>
  );
}

function MoreAction({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  const t = useT();
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={t("action.actions")}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      /* Le menu ne déclenche ni l'ouverture ni l'appui long de la ligne. */
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary ${
        compact ? "-mr-1 -mt-1 h-9 w-8" : "-mr-2 h-11 w-11"
      }`}
    >
      <MoreVertical className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"} />
    </span>
  );
}
