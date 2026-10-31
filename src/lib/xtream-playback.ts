export function playbackFailure(upstreamStatus: number) {
  const denied = [401, 403, 456].includes(upstreamStatus);
  return {
    status: denied ? 403 : upstreamStatus === 404 ? 404 : 503,
    message: denied ? "مزوّد الاشتراك رفض تشغيل البث من الموقع." : "البث غير متاح حاليًا؛ حاول لاحقًا.",
  };
}

export const smartImportKinds = ["live"] as const;