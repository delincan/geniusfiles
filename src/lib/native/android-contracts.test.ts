import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const native = readFileSync(
  "android-overrides/app/src/main/java/app/geniusfiles/mobile/GeniusFilesNativePlugin.kt",
  "utf8",
);
const service = readFileSync(
  "android-overrides/app/src/main/java/app/geniusfiles/mobile/FileOpsService.kt",
  "utf8",
);

describe("Android lifecycle contracts (source checks, not device execution)", () => {
  it("notification requests wait for a registered Capacitor callback", () => {
    const request = native.slice(
      native.indexOf("fun requestNotificationPermission"),
      native.indexOf("fun checkNotificationPermission"),
    );
    expect(request).toContain(
      'requestPermissionForAlias("notifications", call, "notificationPermissionCallback")',
    );
    expect(request).toContain("@PermissionCallback");
    expect(request).toContain("private fun notificationPermissionCallback");
    expect(request).not.toContain("activity?.requestPermissions");
    expect(native).toContain('alias = "notifications"');
  });
  it("empty sticky service restarts stop without waiting for an explicit stop intent", () => {
    const empty = service.match(
      /if \(intent\?\.action == ACTION_STOP \|\| tasks.values.none \{ it.status == "running" \}\) \{([\s\S]*?)\n {8}\}/,
    )?.[1];
    expect(empty).toBeDefined();
    expect(empty).toContain("stopSelf(startId)");
    expect(empty).toContain("return START_NOT_STICKY");
    expect(empty).not.toContain("if (");
  });
});
