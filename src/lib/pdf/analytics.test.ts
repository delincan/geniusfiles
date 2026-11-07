import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/native/analytics")>();
  return { ...actual, trackEvent: vi.fn() };
});

import { trackEvent } from "@/lib/native/analytics";
import { trackPdf } from "./analytics";

const mockedTrack = vi.mocked(trackEvent);

beforeEach(() => mockedTrack.mockClear());

describe("PDF operation results", () => {
  it("records one success with its real output count and duration", async () => {
    await expect(
      trackPdf(
        "merge",
        async () => [1, 2, 3],
        (result) => result.length,
      ),
    ).resolves.toEqual([1, 2, 3]);
    expect(mockedTrack).toHaveBeenCalledTimes(1);
    expect(mockedTrack).toHaveBeenCalledWith(
      "pdf_merged",
      expect.objectContaining({ result: "success", item_count: 3, tool_type: "merge" }),
    );
    expect(mockedTrack.mock.calls[0]?.[1]?.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("records one failure with a general network category and no raw error", async () => {
    await expect(
      trackPdf("compress", async () => {
        throw new TypeError("Failed to fetch secret.pdf");
      }),
    ).rejects.toThrow("Failed to fetch");
    expect(mockedTrack).toHaveBeenCalledWith(
      "pdf_compressed",
      expect.objectContaining({ result: "failure", error_category: "network_error" }),
    );
    expect(JSON.stringify(mockedTrack.mock.calls)).not.toContain("secret.pdf");
  });

  it("records a voluntary cancellation as cancelled", async () => {
    await expect(
      trackPdf("split", async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mockedTrack).toHaveBeenCalledWith(
      "pdf_edited",
      expect.objectContaining({ result: "cancelled", error_category: "cancelled" }),
    );
  });
});
