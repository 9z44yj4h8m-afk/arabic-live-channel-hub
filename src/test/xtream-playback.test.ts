import { describe, expect, it } from "vitest";
import { playbackFailure, playbackFailureResponse, smartImportKinds } from "../lib/xtream-playback";

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
  it("releases rejected provider bodies and returns a safe failure instead of 502", async () => {
    let cancelled = false;
    const body = new ReadableStream({ cancel() { cancelled = true; } });
    const response = await playbackFailureResponse(new Response(body, { status: 456 }));
    expect(cancelled).toBe(true);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ available: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("reports network failures as temporary unavailability, not credential refusal", async () => {
    const response = await playbackFailureResponse();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ available: false });
  });
  it("maps upstream 502 to a controlled media-unavailable response", async () => {
    const response = await playbackFailureResponse(new Response("private upstream details", { status: 502 }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private upstream details");
  });
});