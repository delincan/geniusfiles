/**
 * Contrôles partagés — interrupteur, choix segmenté et liste de choix.
 *
 * Mêmes dimensions tactiles partout (zone ≥ 44 px), bleu GeniusFiles pour
 * l'état actif uniquement, surfaces neutres pour le reste. Utilisés par les
 * Paramètres et les Automatisations.
 */
import type { ComponentType, ReactNode } from "react";
import { Check } from "@/components/icons";
import { BottomSheet } from "@/components/files/BottomSheet";

/** Interrupteur : piste bleue quand actif, neutre sinon. */
export function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="-my-1 -mr-1.5 inline-flex h-11 w-[60px] shrink-0 items-center justify-center disabled:opacity-45"
    >
      <span
        aria-hidden
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-handle"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full transition-transform duration-200 ease-out ${
            checked
              ? "translate-x-[22px] bg-primary-foreground"
              : "translate-x-0.5 bg-foreground/80"
          }`}
        />
      </span>
    </button>
  );
}

/** Choix segmenté (2 à 4 options courtes). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; icon?: ComponentType<{ className?: string }> }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      suppressHydrationWarning
      className="grid gap-1 rounded-xl bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            suppressHydrationWarning
            onClick={() => {
              if (!active) onChange(o.value);
            }}
            className={`gf-press flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold transition-colors ${
              active ? "bg-surface-elevated text-primary" : "text-muted-foreground"
            }`}
          >
            {o.icon ? <o.icon className="h-4 w-4 shrink-0" /> : null}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Liste de choix en feuille : une option par ligne, coche bleue sur l'active. */
export function ChoiceSheet<T extends string | number>({
  open,
  title,
  value,
  options,
  onChange,
  onClose,
}: {
  open: boolean;
  title: string;
  value: T;
  options: { value: T; label: string; leading?: ReactNode; hint?: string }[];
  onChange: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet sheet open={open} onClose={onClose} title={title}>
      <div role="radiogroup" aria-label={title} className="-mx-2 flex flex-col">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (!active) onChange(o.value);
                onClose();
              }}
              className={`gf-press flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${
                active ? "bg-surface-3" : ""
              }`}
            >
              {o.leading ? <span className="shrink-0">{o.leading}</span> : null}
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[15px] ${
                    active ? "font-semibold text-foreground" : "font-medium text-foreground"
                  }`}
                >
                  {o.label}
                </span>
                {o.hint ? (
                  <span className="block truncate text-[12px] text-muted-foreground">{o.hint}</span>
                ) : null}
              </span>
              {active ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
