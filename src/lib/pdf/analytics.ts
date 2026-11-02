/**
 * Mesure d'usage des outils PDF.
 *
 * `pdf_tool_used` est enregistré à l'ouverture d'un outil (popularité,
 * entonnoir) ; l'opération elle-même produit UN événement de résultat,
 * après son exécution réelle, avec son issue. Jamais de nom, de chemin, de
 * texte saisi ni de contenu de document.
 */
import { trackEvent, type AnalyticsEvent } from "@/lib/native/analytics";

/** Événement de résultat de chaque outil (null = outil de consultation). */
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

/** Ouverture d'un outil PDF. */
export function trackPdfToolOpened(tool: string): void {
  trackEvent("pdf_tool_used", { tool_type: toolType(tool), operation: "open" });
}

function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/**
 * Exécute une opération PDF et enregistre son issue une seule fois.
 * L'erreur éventuelle est relancée telle quelle : le comportement de l'outil
 * est inchangé.
 */
export async function trackPdf<T>(
  tool: string,
  run: () => Promise<T>,
  count?: (result: T) => number,
): Promise<T> {
  const event = PDF_RESULT_EVENT[tool];
  try {
    const res = await run();
    if (event) {
      trackEvent(event, {
        tool_type: toolType(tool),
        result: "success",
        item_count: count ? count(res) : undefined,
      });
    }
    return res;
  } catch (err) {
    if (event) {
      trackEvent(event, {
        tool_type: toolType(tool),
        result: isAbort(err) ? "cancelled" : "failure",
      });
    }
    throw err;
  }
}
