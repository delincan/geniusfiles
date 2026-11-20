import type { TransferTask } from "./manager";
import { LOCALES } from "@/lib/i18n/types";
import { translate } from "@/lib/i18n/translate";

export function transferResultKind(
  task: TransferTask,
): "copyDone" | "moveDone" | "lowSpace" | null {
  if (task.status === "done" && task.failures.length === 0 && task.succeeded > 0) {
    return task.mode === "copy" ? "copyDone" : "moveDone";
  }
  if (task.status !== "failed") return null;
  const spaceMessages = LOCALES.map((locale) => translate(locale, "ops.error.noSpace"));
  return task.failures.some(
    ({ reason }) =>
      /\bENOSPC\b|\bNO_SPACE\b|no space left on device/i.test(reason) ||
      spaceMessages.some((message) => reason.includes(message)),
  )
    ? "lowSpace"
    : null;
}
