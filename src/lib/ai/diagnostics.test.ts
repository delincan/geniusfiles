import { describe, expect, it } from "vitest";
import { buildAttemptList, ChatRequestError, describeChatErrorDetail } from "./diagnostics";

describe("buildAttemptList", () => {
  it("retries the primary address once when there is no fallback", () => {
    expect(buildAttemptList("/api/public/chat", [])).toEqual([
      "/api/public/chat",
      "/api/public/chat",
    ]);
  });

  it("tries the fallback address after the primary, without duplicates", () => {
    expect(
      buildAttemptList("https://a.app/chat", ["https://a.app/chat", "https://b.app/chat"]),
    ).toEqual(["https://a.app/chat", "https://b.app/chat"]);
  });
});

describe("describeChatErrorDetail", () => {
  it("shows the failure kind and the address that was contacted", () => {
    const err = new ChatRequestError(
      "network",
      "x",
      undefined,
      "Failed to fetch · geniusfiles.lovable.app",
    );
    expect(describeChatErrorDetail(err)).toBe(
      "network · Failed to fetch · geniusfiles.lovable.app",
    );
  });
});
