import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./platform", () => ({
  isNativeRuntime: () => true,
  nativePlatform: () => "android",
}));

import {
  __resetCrashlyticsForTests,
  installCrashReporting,
  recordNonFatal,
} from "./crashlytics";

function crashBridge() {
  const bridge = {
    log: vi.fn(() => Promise.resolve()),
    recordError: vi.fn(() => Promise.resolve()),
    setKeys: vi.fn(() => Promise.resolve()),
    isAvailable: vi.fn(() => Promise.resolve({ available: true })),
  };
  (window as unknown as { Capacitor: unknown }).Capacitor = {
    Plugins: { GeniusFilesCrashlytics: bridge },
  };
  return bridge;
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetCrashlyticsForTests();
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Crashlytics privacy and startup", () => {
  it("sends a fixed context, never the raw error message", () => {
    const bridge = crashBridge();
    recordNonFatal(new Error("Impossible de lire cv-secret.pdf"), "window.onerror");
    expect(bridge.recordError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Error", message: "window_onerror" }),
    );
    expect(JSON.stringify(bridge.recordError.mock.calls)).not.toContain("cv-secret");
  });

  it("retries when the native bridge appears after the first render", async () => {
    const cleanup = installCrashReporting();
    await vi.advanceTimersByTimeAsync(400);
    const bridge = crashBridge();
    await vi.advanceTimersByTimeAsync(800);
    expect(bridge.setKeys).toHaveBeenCalled();
    cleanup();
  });
});
