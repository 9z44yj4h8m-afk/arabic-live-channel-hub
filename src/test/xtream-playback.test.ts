import { describe, expect, it } from "vitest";
import { playbackFailure, smartImportKinds } from "../lib/xtream-playback";

describe("Smart playback", () => {
  it("treats provider 456 as access refusal instead of an application 502", () => {
    expect(playbackFailure(456).status).toBe(403);
    expect(playbackFailure(401).status).toBe(403);
    expect(playbackFailure(403).status).toBe(403);
  });
  it("keeps unavailable and missing upstream media distinct", () => {
    expect(playbackFailure(500).status).toBe(503);
    expect(playbackFailure(404).status).toBe(404);
  });
  it("imports only live channels in Smart", () => {
    expect(smartImportKinds).toEqual(["live"]);
  });
});