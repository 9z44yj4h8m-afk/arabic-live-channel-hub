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

export const smartImportKinds = ["live"] as const;