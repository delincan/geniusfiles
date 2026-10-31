/**
 * Reactive hook returning the current list of storage roots, including
 * dynamically-detected external volumes (SD card, USB OTG). Re-renders
 * whenever a volume is mounted or unmounted natively.
 *
 * The returned arrays keep the same identity while their content is
 * unchanged, so callers can safely list them in effect dependencies.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { listRoots, refreshStorageVolumes, subscribeRoots } from "@/lib/files/fs";
import type { StorageRoot } from "@/lib/files/types";

export function sameRoots(a: readonly StorageRoot[], b: readonly StorageRoot[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.label !== y.label ||
      x.hint !== y.hint ||
      x.available !== y.available
    ) {
      return false;
    }
  }
  return true;
}

export function useRoots(): {
  roots: StorageRoot[];
  available: StorageRoot[];
  refresh: () => void;
} {
  const [roots, setRoots] = useState<StorageRoot[]>(() => listRoots());
  const update = useCallback(() => {
    const next = listRoots();
    setRoots((prev) => (sameRoots(prev, next) ? prev : next));
  }, []);
  useEffect(() => {
    const unsub = subscribeRoots(update);
    void refreshStorageVolumes().then(update);
    if (typeof document !== "undefined") {
      const onVis = () => {
        if (document.visibilityState === "visible") void refreshStorageVolumes().then(update);
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        unsub();
        document.removeEventListener("visibilitychange", onVis);
      };
    }
    return () => unsub();
  }, [update]);
  const available = useMemo(() => roots.filter((r) => r.available), [roots]);
  const refresh = useCallback(() => {
    void refreshStorageVolumes().then(update);
  }, [update]);
  return { roots, available, refresh };
}
