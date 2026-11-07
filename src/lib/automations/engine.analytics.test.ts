import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/native/analytics")>();
  return { ...actual, trackEvent: vi.fn() };
});
vi.mock("@/lib/native/notifications", () => ({ showNotification: vi.fn(() => Promise.resolve()) }));

import { trackEvent } from "@/lib/native/analytics";
import { runAutomation } from "./engine";
import type { Automation } from "./types";

const mockedTrack = vi.mocked(trackEvent);

function automation(actions: Automation["actions"]): Automation {
  return {
    id: "test_rule",
    name: "Règle locale de test",
    enabled: true,
    trigger: { kind: "daily", at: "09:00" },
    conditions: [],
    actions,
    createdAt: 1,
    updatedAt: 1,
    runCount: 0,
    source: "manual",
  };
}

beforeEach(() => {
  localStorage.clear();
  mockedTrack.mockClear();
});

describe("automation analytics", () => {
  it("records one start and one successful completion, never one per action", async () => {
    const record = await runAutomation(automation([]), { simulate: false });
    expect(record.status).toBe("ok");
    expect(mockedTrack.mock.calls.map((call) => call[0])).toEqual([
      "automation_executed",
      "automation_completed",
    ]);
    expect(mockedTrack).toHaveBeenLastCalledWith(
      "automation_completed",
      expect.objectContaining({ result: "success", item_count: 0 }),
    );
  });

  it("records a failed real action as one aggregate failure", async () => {
    const record = await runAutomation(automation([{ kind: "copy" }]), { simulate: false });
    expect(record.status).toBe("failed");
    expect(mockedTrack.mock.calls.map((call) => call[0])).toEqual([
      "automation_executed",
      "automation_completed",
    ]);
    expect(mockedTrack).toHaveBeenLastCalledWith(
      "automation_completed",
      expect.objectContaining({ result: "failure", action_category: "copy" }),
    );
  });

  it("does not turn a simulation into real usage", async () => {
    await runAutomation(automation([{ kind: "copy" }]), { simulate: true });
    expect(mockedTrack).not.toHaveBeenCalled();
  });
});
