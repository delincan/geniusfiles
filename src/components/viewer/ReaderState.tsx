import { AlertTriangle } from "@/components/icons";
import { Spinner } from "@/components/ui/states";

/**
 * Chargement ou erreur sur la page blanche d'un lecteur de documents :
 * même présentation centrée pour le texte, les documents et Word.
 */
export function ReaderState({ tone, message }: { tone: "loading" | "error"; message: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="gf-appear flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      {tone === "loading" ? (
        <Spinner size={22} className="text-primary" />
      ) : (
        <AlertTriangle className="h-7 w-7 text-destructive" />
      )}
      <p
        className={`max-w-[300px] text-[14px] leading-relaxed ${
          tone === "error" ? "text-reader-ink" : "text-reader-muted"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
