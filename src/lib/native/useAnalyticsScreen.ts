import { useEffect } from "react";
import { pushScreen, trackEvent, type ScreenId, type ScreenLayer } from "./analytics";

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

export type EditorTool = "photo_editor" | "audio_editor" | "document_editor";

/**
 * Éditeur ouvert : déclare son écran et enregistre UNE utilisation
 * (`editor_used`, operation `open`) par ouverture. Les enregistrements sont
 * comptés séparément par `trackEditorSave`.
 */
export function useEditorUsage(tool: EditorTool): void {
  useAnalyticsScreen(tool, "editor");
  useEffect(() => {
    trackEvent("editor_used", { tool_type: tool, operation: "open" });
  }, [tool]);
}

/** Enregistrement d'un éditeur, après son exécution réelle. */
export function trackEditorSave(
  tool: EditorTool,
  operation: "save_new" | "save_replace" | "save_split",
  ok: boolean,
): void {
  trackEvent("editor_used", { tool_type: tool, operation, result: ok ? "success" : "failure" });
}
