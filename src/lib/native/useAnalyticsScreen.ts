import { useEffect } from "react";
import { elapsedMs, errorCategoryOf, pushScreen, trackEvent } from "./analytics";
import type { ScreenId, ScreenLayer } from "./analytics";

/** Déclare uniquement un vrai écran, jamais un dialogue ou une feuille. */
export function useAnalyticsScreen(screen: ScreenId | null, layer: ScreenLayer): void {
  useEffect(() => {
    if (!screen) return;
    return pushScreen(screen, layer);
  }, [screen, layer]);
}

export type EditorTool = "photo_editor" | "audio_editor" | "document_editor";

/** Une ouverture d'éditeur ; les enregistrements ont leur propre résultat. */
export function useEditorUsage(tool: EditorTool): void {
  useAnalyticsScreen(tool, "editor");
  useEffect(() => {
    trackEvent("editor_used", { tool_type: tool, operation: "open" });
  }, [tool]);
}

/** Enregistrement réel, avec durée et catégorie d'erreur facultatives. */
export function trackEditorSave(
  tool: EditorTool,
  operation: "save_new" | "save_replace" | "save_split",
  ok: boolean,
  startedAt?: number,
  error?: unknown,
): void {
  trackEvent("editor_used", {
    tool_type: tool,
    operation,
    result: ok ? "success" : "failure",
    ...(ok || error === undefined ? {} : { error_category: errorCategoryOf(error) }),
    ...(startedAt === undefined ? {} : { duration_ms: elapsedMs(startedAt) }),
  });
}
