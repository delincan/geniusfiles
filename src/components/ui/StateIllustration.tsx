import type { ReactNode } from "react";
import { ILLUSTRATIONS, type IllustrationId } from "@/lib/illustrations";

/** Fixed reserved space, untouched WebP alpha/colors; native builds embed all pointer URLs. */
export function StateIllustration({
  id,
  fallback,
  compact = false,
}: {
  id: IllustrationId;
  fallback?: ReactNode;
  compact?: boolean;
}) {
  const asset = ILLUSTRATIONS[id];
  return (
    <span
      aria-hidden="true"
      className={`gf-state-illustration ${compact ? "gf-state-illustration-compact" : ""}`}
    >
      {asset ? (
        <img src={asset.url} alt="" width={1086} height={1448} decoding="async" draggable={false} />
      ) : (
        fallback
      )}
    </span>
  );
}
