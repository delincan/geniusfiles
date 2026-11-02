import { useEffect } from "react";
import { pushScreen, type ScreenId, type ScreenLayer } from "./analytics";

/**
 * Déclare l'écran affiché par un composant tant qu'il est monté (et que
 * `screen` n'est pas `null`). À réserver aux vrais écrans : lecteurs,
 * éditeurs, sections plein écran — jamais aux dialogues ni aux feuilles.
 */
export function useAnalyticsScreen(screen: ScreenId | null, layer: ScreenLayer): void {
  useEffect(() => {
    if (!screen) return;
    return pushScreen(screen, layer);
  }, [screen, layer]);
}
