/**
 * Champs de l'éditeur d'automatisation : libellé, aide, sélecteurs de
 * fichiers et de dossiers. Mêmes dimensions et même focus partout.
 */
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Folder, AlertTriangle } from "@/components/icons";
import { DestinationPicker } from "@/components/files/DestinationPicker";
import { FileIcon } from "@/components/files/FileIcon";
import { FileSourcePicker } from "@/components/files/FileSourcePicker";
import { toAbsolutePath } from "@/lib/files/fs";
import { useT } from "@/lib/i18n";
import type { FileSelection } from "@/lib/automations/types";
import type { PathRef } from "@/lib/files/types";

/** Libellé + contrôle + aide facultative. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-[12px] leading-snug text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/** Message d'aide indiquant ce qui manque pour continuer. */
export function MissingHint({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="flex items-start gap-2 text-[12.5px] leading-snug text-warning">
      <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Liste déroulante native, habillée comme les autres champs. */
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="gf-input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function PickerButton({
  icon,
  value,
  placeholder,
  onClick,
}: {
  icon: ReactNode;
  value?: ReactNode;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="gf-press-row flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span
        className={`min-w-0 flex-1 truncate text-[14px] ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value ?? placeholder}
      </span>
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
    </button>
  );
}

export function SelectionField({
  label,
  selection,
  onChange,
  singleFileOnly,
}: {
  label: string;
  selection?: FileSelection;
  onChange: (s: FileSelection) => void;
  singleFileOnly?: boolean;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const entries = selection?.entries ?? [];
  return (
    <Field label={label}>
      <PickerButton
        icon={
          entries.length === 1 ? (
            <FileIcon kind={entries[0].kind} path={entries[0].path} />
          ) : (
            <Folder className="h-5 w-5" />
          )
        }
        value={
          entries.length === 0
            ? undefined
            : entries.length === 1
              ? entries[0].name
              : tr("automations.selection.itemsSelected", { count: entries.length })
        }
        placeholder={tr("automations.selection.choose")}
        onClick={() => setOpen(true)}
      />
      {entries.length > 1 ? (
        <ul className="flex flex-col gap-1 px-1">
          {entries.slice(0, 3).map((e) => (
            <li key={e.name} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <FileIcon kind={e.kind} path={e.path} />
              <span className="truncate">{e.name}</span>
            </li>
          ))}
          {entries.length > 3 ? (
            <li className="text-[12px] text-muted-foreground">
              {tr("automations.selection.more", { count: entries.length - 3 })}
            </li>
          ) : null}
        </ul>
      ) : null}
      <SelectionPicker
        open={open}
        onCancel={() => setOpen(false)}
        multi={!singleFileOnly}
        onConfirm={(sel) => {
          onChange(sel);
          setOpen(false);
        }}
      />
    </Field>
  );
}

export function DestinationField({
  label,
  path,
  onChange,
}: {
  label: string;
  path?: PathRef;
  onChange: (p: PathRef) => void;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  return (
    <Field label={label}>
      <PickerButton
        icon={<Folder className="h-5 w-5" />}
        value={path ? toAbsolutePath(path) : undefined}
        placeholder={tr("automations.selection.choose")}
        onClick={() => setOpen(true)}
      />
      <DestinationPicker
        open={open}
        title={label}
        initial={path ?? null}
        onCancel={() => setOpen(false)}
        onConfirm={(p) => {
          onChange(p);
          setOpen(false);
        }}
      />
    </Field>
  );
}

/**
 * Sélection des éléments d'une automatisation.
 *
 * Ouvre le MODE SÉLECTION de GeniusFiles (stockages, catégories,
 * dossiers, récents, recherche, tri) et récupère le dossier réel de
 * chaque élément — plus aucune déduction de préfixe commun.
 * `FileSelection` ne porte qu'un dossier : les éléments d'un autre
 * dossier sont signalés puis écartés.
 */
function SelectionPicker({
  open,
  multi,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  multi: boolean;
  onCancel: () => void;
  onConfirm: (s: FileSelection) => void;
}) {
  const tr = useT();
  return (
    <FileSourcePicker
      open={open}
      accept="both"
      extensions={[]}
      multi={multi}
      onCancel={onCancel}
      onConfirm={(_paths, _entries, details) => {
        const first = details.find((d) => d.parent);
        if (!first?.parent) return onCancel();
        const parent = first.parent;
        const same = details.filter(
          (d) =>
            d.parent &&
            d.parent.rootId === parent.rootId &&
            d.parent.segments.join("/") === parent.segments.join("/"),
        );
        if (same.length < details.length) {
          toast.warning(tr("automations.selection.singleFolderWarning.title"), {
            description: tr("automations.selection.singleFolderWarning.desc", {
              count: details.length - same.length,
            }),
          });
        }
        onConfirm({ parent, entries: same.map((d) => d.entry) });
      }}
    />
  );
}
