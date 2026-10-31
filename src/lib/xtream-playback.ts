export function playbackFailure(upstreamStatus: number) {
  const denied = [401, 403, 456].includes(upstreamStatus);
  return {
    status: denied ? 403 : upstreamStatus === 404 ? 404 : 503,
    message: denied ? "مزوّد الاشتراك رفض تشغيل البث من الموقع." : "البث غير متاح حاليًا؛ حاول لاحقًا.",
  };
}

// Release rejected upstream connections without exposing provider URLs or bodies.
export async function playbackFailureResponse(upstream?: Response) {
  const failure = playbackFailure(upstream?.status ?? 503);
  await upstream?.body?.cancel().catch(() => undefined);
  return Response.json({ available: false, message: failure.message }, {
    status: failure.status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Once headers are sent, a failed upstream must end media, not crash the HTTP relay.
export function relayMediaBody(body: ReadableStream<Uint8Array> | null) {
  if (!body) return null;
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) controller.close();
        else controller.enqueue(chunk.value);
      } catch {
        controller.close();
        await reader.cancel().catch(() => undefined);
      }
    },
    async cancel(reason) { await reader.cancel(reason).catch(() => undefined); },
  });
}

export const smartImportKinds = ["live"] as const;