/**
 * Mesure d'usage des outils PDF : une ouverture d'outil, puis UN résultat
 * par opération réelle. Aucun nom, chemin, texte saisi ou contenu de document.
 */
import {
  elapsedMs,
  errorCategoryOf,
  trackEvent,
  type AnalyticsEvent,
} from "@/lib/native/analytics";

export const PDF_RESULT_EVENT: Record<string, AnalyticsEvent | null> = {
  "images-to-pdf": "pdf_created",
  scan: "pdf_created",
  "text-to-pdf": "pdf_created",
  merge: "pdf_merged",
  compress: "pdf_compressed",
  "files-to-pdf": "pdf_converted",
  "pdf-to-images": "pdf_converted",
  signature: "pdf_signed",
  extract: "pdf_extracted",
  "extract-text": "pdf_extracted",
  split: "pdf_edited",
  "delete-pages": "pdf_edited",
  reorder: "pdf_edited",
  rotate: "pdf_edited",
  watermark: "pdf_edited",
  "add-text": "pdf_edited",
  "add-image": "pdf_edited",
  "fill-form": "pdf_edited",
  duplicate: "pdf_edited",
  search: null,
  info: null,
};

function toolType(tool: string): string {
  return tool.replace(/-/g, "_");
}

export function trackPdfToolOpened(tool: string): void {
  trackEvent("pdf_tool_used", { tool_type: toolType(tool), operation: "open" });
}

function isAbort(err: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      err instanceof DOMException &&
      err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/** L'erreur est relancée sans modifier le comportement de l'outil. */
export async function trackPdf<T>(
  tool: string,
  run: () => Promise<T>,
  count?: (result: T) => number,
): Promise<T> {
  const event = PDF_RESULT_EVENT[tool];
  const startedAt = Date.now();
  try {
    const result = await run();
    if (event) {
      trackEvent(event, {
        tool_type: toolType(tool),
        result: "success",
        item_count: count ? count(result) : undefined,
        duration_ms: elapsedMs(startedAt),
      });
    }
    return result;
  } catch (error) {
    if (event) {
      const cancelled = isAbort(error);
      trackEvent(event, {
        tool_type: toolType(tool),
        result: cancelled ? "cancelled" : "failure",
        error_category: cancelled ? "cancelled" : errorCategoryOf(error),
        duration_ms: elapsedMs(startedAt),
      });
    }
    throw error;
  }
}
