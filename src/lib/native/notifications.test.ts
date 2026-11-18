import { beforeEach, describe, expect, it, vi } from "vitest";

const bridge = vi.hoisted(() => ({
  checkNotificationPermission: vi.fn(),
  requestNotificationPermission: vi.fn(),
  showLocalNotification: vi.fn(),
}));
vi.mock("./geniusfiles-native", () => ({
  nativePlugin: () => bridge,
  isAndroidNative: () => true,
}));

describe("notification authorization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  it("waits for the permission decision and posts each simultaneous notification once", async () => {
    bridge.checkNotificationPermission.mockResolvedValue({ granted: false });
    let grant: ((value: { granted: boolean }) => void) | undefined;
    bridge.requestNotificationPermission.mockImplementation(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    const { showNotification } = await import("./notifications");
    const first = showNotification({ title: "Complete", body: "Done" });
    const second = showNotification({ title: "Complete", body: "Done" });
    await vi.waitFor(() => expect(bridge.requestNotificationPermission).toHaveBeenCalledTimes(1));
    expect(bridge.showLocalNotification).not.toHaveBeenCalled();
    if (!grant) throw new Error("Permission request missing");
    grant({ granted: true });
    await Promise.all([first, second]);
    expect(bridge.showLocalNotification).toHaveBeenCalledTimes(2);
  });
  it("does not post after denial", async () => {
    bridge.checkNotificationPermission.mockResolvedValue({ granted: false });
    bridge.requestNotificationPermission.mockResolvedValue({ granted: false });
    const { showNotification } = await import("./notifications");
    await showNotification({ title: "Complete", body: "Done" });
    expect(bridge.showLocalNotification).not.toHaveBeenCalled();
  });
});
