import { Bell, Maximize, RefreshCw, Volume1, Volume2, VolumeX, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { useServerFn } from "@tanstack/react-start";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Channel } from "@/lib/channels";
import { markActive, markInactive, notifyStream } from "@/lib/inactive-channels";
import { resolveYoutubeLive } from "@/lib/youtube-live.functions";
import { Button } from "@/components/ui/button";

type Settings = { volume: number; muted: boolean; quality: number; autoReconnect: boolean; notify: boolean };
type Status = "loading" | "playing" | "reconnecting" | "failed";
const STORAGE_KEY = "almoghani-player-settings";
const DEFAULTS: Settings = { volume: 80, muted: true, quality: 0, autoReconnect: true, notify: false };
const MAX_ATTEMPTS = 6;
const backoff = (attempt: number) => Math.min(2000 * 2 ** attempt, 30000);

function usePlayerSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved) setSettings({ ...DEFAULTS, ...saved });
    } catch {
      /* ignore */
    }
  }, []);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return [settings, update] as const;
}

export function LivePlayer({ channel }: { channel: Channel }) {
  const [settings, update] = usePlayerSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const shellRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimer = useRef<number | undefined>(undefined);

  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [relayReady, setRelayReady] = useState("");
  const [relayError, setRelayError] = useState("");
  const isHls = Boolean(channel.streamUrl);
  const [ytId, setYtId] = useState(channel.youtubeId);
  const resolveLive = useServerFn(resolveYoutubeLive);

  // YouTube: look up the channel's current live broadcast on load and on every reconnect.
  useEffect(() => {
    const channelId = channel.youtubeChannelId;
    if (!channelId) return;
    let cancelled = false;
    resolveLive({ data: { channelId } })
      .then((r) => {
        if (!cancelled && r.videoId) setYtId(r.videoId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channel.youtubeChannelId, reloadKey, resolveLive]);

  const reload = useCallback(() => {
    window.clearTimeout(retryTimer.current);
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  const manualReload = useCallback(() => {
    setAttempt(0);
    reload();
  }, [reload]);

  // Called whenever the stream drops: retry with backoff, or give up.
  const dropped = useRef(false);
  const handleDrop = useCallback(() => {
    window.clearTimeout(retryTimer.current);
    const notify = settingsRef.current.notify;
    setAttempt((current) => {
      if (!settingsRef.current.autoReconnect || current >= MAX_ATTEMPTS) {
        setStatus("failed");
        markInactive(channel.id);
        if (notify) notifyStream(`توقف بث ${channel.name}`, "تعذّر إعادة الاتصال — نُقلت القناة إلى قائمة القنوات غير النشطة.", channel.id);
        return current;
      }
      if (current === 0 && notify) {
        notifyStream(`انقطع بث ${channel.name}`, settingsRef.current.autoReconnect ? "جارٍ إعادة الاتصال تلقائيًا…" : "اضغط تحديث لإعادة التشغيل.", channel.id);
      }
      dropped.current = true;
      setStatus("reconnecting");
      retryTimer.current = window.setTimeout(reload, backoff(current));
      return current + 1;
    });
  }, [reload, channel.id, channel.name]);

  const markPlaying = useCallback(() => {
    window.clearTimeout(retryTimer.current);
    setStatus("playing");
    setAttempt(0);
    markActive(channel.id);
    if (dropped.current && settingsRef.current.notify) {
      notifyStream(`عاد بث ${channel.name}`, "تمت إعادة الاتصال بنجاح.", channel.id);
    }
    dropped.current = false;
  }, [channel.id, channel.name]);

  // Reset when the channel changes.
  useEffect(() => {
    setAttempt(0);
    setStatus("loading");
    setLevels([]);
    return () => window.clearTimeout(retryTimer.current);
  }, [channel.id]);

  // Retry immediately when the connection comes back.
  useEffect(() => {
    const onOnline = () => {
      if (settingsRef.current.autoReconnect) manualReload();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [manualReload]);

  // HLS playback: native on Safari/iOS, hls.js elsewhere.
  useEffect(() => {
    const stream = channel.streamUrl;
    if (!stream?.startsWith("/api/public/xtream?")) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);
    let cancelled = false;
    setRelayReady("");
    setRelayError("");
    void fetch(`${stream}&probe=1`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (cancelled) return;
        if (response.ok) { setRelayReady(stream); return; }
        setRelayError(response.status === 403 ? "مزوّد الاشتراك رفض تشغيل البث من الموقع." : "البث غير متاح حاليًا؛ حاول لاحقًا.");
        setStatus("failed");
      })
      .catch(() => {
        if (!cancelled) { setRelayError("تعذّر الاتصال بالبث حاليًا."); setStatus("failed"); }
      })
      .finally(() => window.clearTimeout(timer));
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [channel.streamUrl, reloadKey]);

  useEffect(() => {
    if (!channel.streamUrl) return;
    const streamUrl = channel.streamUrl;
    if (streamUrl.startsWith("/api/public/xtream?") && relayReady !== streamUrl) return;
    const directVideo = streamUrl.includes("format=video");
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let stallTimer: number | undefined;
    const drop = () => !destroyed && handleDrop();
    const startTimer = window.setTimeout(() => {
      if (video.readyState < 2) drop();
    }, 20000);

    const onPlaying = () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stallTimer);
      markPlaying();
      applyVolume();
    };
    const onWaiting = () => {
      window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(drop, 15000);
    };
    const onEnded = () => { if (!directVideo) drop(); };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onWaiting);
    video.addEventListener("ended", onEnded);

    const playNative = () => {
      if (!directVideo && !video.canPlayType("application/vnd.apple.mpegurl")) return drop();
      video.src = streamUrl;
      video.addEventListener("error", drop, { once: true });
      void video.play().catch(() => undefined);
    };
    if (directVideo) playNative(); else {
      // Prefer hls.js (incl. iOS ManagedMediaSource) so requests go out without
      // a Referer header — some CDNs (e.g. MBC/Shahid) reject foreign referrers.
      import("hls.js")
        .then(({ default: HlsCtor, FetchLoader }) => {
          if (destroyed) return;
          if (!HlsCtor.isSupported()) return playNative();
          const hls = new HlsCtor({
            enableWorker: true,
            maxBufferLength: 30,
            liveSyncDurationCount: 3,
            loader: FetchLoader,
            fetchSetup: (context, init) =>
              new Request(context.url, { ...init, referrerPolicy: "no-referrer" }),
          });
          hlsRef.current = hls;
          let mediaRecoveries = 0;
          hls.on(HlsCtor.Events.MANIFEST_PARSED, (_e, data) => {
            const list = data.levels
              .map((level, index) => ({ index, height: level.height }))
              .filter((l) => l.height > 0);
            setLevels(list);
            applyQuality(hls, list);
            void video.play().catch(() => undefined);
          });
          hls.on(HlsCtor.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR && mediaRecoveries++ < 2) {
              hls.recoverMediaError();
              return;
            }
            hls.destroy();
            hlsRef.current = null;
            drop();
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
        })
        .catch(drop);
    }

    return () => {
      destroyed = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(stallTimer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("ended", onEnded);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.streamUrl, reloadKey, relayReady]);

  // YouTube: follow player events (ready, playing, ended, error).
  const ytCommand = useCallback((func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  useEffect(() => {
    if (channel.streamUrl) return;
    const startTimer = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "playing" : s));
    }, 15000);
    const onMessage = (e: MessageEvent) => {
      if (!String(e.origin).includes("youtube.com") || typeof e.data !== "string") return;
      if (e.source !== frameRef.current?.contentWindow) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === "onReady") applyVolume();
        if (msg.event === "onError") handleDrop();
        const state = msg.event === "onStateChange" ? msg.info : msg.info?.playerState;
        if (state === 1) markPlaying();
        if (state === 0) handleDrop();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(startTimer);
      window.removeEventListener("message", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.streamUrl, reloadKey, handleDrop, markPlaying]);

  function applyVolume() {
    const { volume, muted } = settingsRef.current;
    const video = videoRef.current;
    if (video) {
      video.volume = volume / 100;
      if (!muted && video.muted) {
        video.muted = false;
        // Browsers pause unmuted autoplay without a user tap; fall back to muted.
        window.setTimeout(() => {
          if (video.paused) {
            video.muted = true;
            void video.play().catch(() => undefined);
          }
        }, 300);
      } else if (muted) video.muted = true;
    }
    if (frameRef.current) {
      ytCommand("setVolume", [volume]);
      ytCommand(muted ? "mute" : "unMute");
    }
  }

  function applyQuality(hls: Hls, list = levels) {
    const target = settingsRef.current.quality;
    if (!target || !list.length) {
      hls.currentLevel = -1;
      return;
    }
    const match =
      [...list].sort((a, b) => b.height - a.height).find((l) => l.height <= target) ??
      list.reduce((a, b) => (a.height < b.height ? a : b));
    hls.currentLevel = match.index;
  }

  useEffect(() => {
    applyVolume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.volume, settings.muted]);

  useEffect(() => {
    if (hlsRef.current) applyQuality(hlsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.quality]);

  function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    else
      (
        videoRef.current as unknown as { webkitEnterFullscreen?: () => void }
      )?.webkitEnterFullscreen?.();
  }

  const VolumeIcon =
    settings.muted || settings.volume === 0 ? VolumeX : settings.volume < 50 ? Volume1 : Volume2;
  const heights = [...new Set(levels.map((l) => l.height))].sort((a, b) => b - a);
  const ytSrc = `https://www.youtube.com/embed/${ytId}?rel=0&playsinline=1&autoplay=1&mute=1&enablejsapi=1`;

  return (
    <div>
      <div ref={shellRef} className="relative aspect-video w-full overflow-hidden bg-surface-deep">
        {isHls ? (
          <video
            key={reloadKey}
            ref={videoRef}
            className="h-full w-full bg-surface-deep"
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <iframe
            key={reloadKey}
            ref={frameRef}
            className="h-full w-full"
            src={ytSrc}
            title={`البث المباشر — ${channel.name}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={() =>
              frameRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: channel.id }),
                "*",
              )
            }
          />
        )}

        {status === "reconnecting" && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="flex items-center gap-2 rounded-full bg-background/85 px-4 py-2 text-xs font-bold backdrop-blur sm:text-sm">
              <RefreshCw className="h-4 w-4 animate-spin text-sky" />
              انقطع البث — جارٍ إعادة الاتصال ({attempt}/{MAX_ATTEMPTS})
            </span>
          </div>
        )}

        {status === "failed" && (
          <div className="absolute inset-0 grid place-items-center bg-surface-deep/95 p-6 text-center">
            <div>
              <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-lg font-black">{relayError || "هذه القناة متوقفة حاليًا"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {relayError ? "يمكنك اختيار قناة أخرى أو إعادة المحاولة." : "قد يكون البث انتهى أو غير متاح في منطقتك."}
              </p>
              <Button
                type="button"
                onClick={manualReload}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4" />
                حاول مرة أخرى
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border bg-surface-deep/80 px-3 py-3 sm:px-5">
        <div className="flex min-w-[10rem] flex-1 items-center gap-2 sm:max-w-xs">
          <button
            type="button"
            onClick={() => update({ muted: !settings.muted })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-sky"
            aria-label={settings.muted ? "تشغيل الصوت" : "كتم الصوت"}
            title={settings.muted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            <VolumeIcon className="h-4 w-4" />
          </button>
          <Slider
            dir="rtl"
            value={[settings.muted ? 0 : settings.volume]}
            max={100}
            step={5}
            onValueChange={([v = 0]) => update({ volume: v, muted: v === 0 })}
            aria-label="مستوى الصوت"
          />
          <span className="w-8 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
            {settings.muted ? 0 : settings.volume}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">الدقة</span>
          {isHls && heights.length > 1 ? (
            <Select
              value={String(settings.quality)}
              onValueChange={(v) => update({ quality: Number(v) })}
            >
              <SelectTrigger className="h-9 w-28" aria-label="دقة البث">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">تلقائي</SelectItem>
                {heights.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h}p
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span
              className="rounded-md border border-border px-3 py-1.5 text-xs font-bold"
              title={
                isHls
                  ? "هذه القناة تبث بدقة واحدة"
                  : "يوتيوب يختار الدقة حسب سرعة الإنترنت، ويمكن تغييرها من زر الإعدادات داخل المشغّل"
              }
            >
              تلقائي
            </span>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-muted-foreground">
          <Switch
            dir="ltr"
            checked={settings.autoReconnect}
            onCheckedChange={(v) => update({ autoReconnect: v })}
            aria-label="إعادة الاتصال تلقائيًا"
          />
          إعادة الاتصال تلقائيًا
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-muted-foreground">
          <Switch
            dir="ltr"
            checked={settings.notify}
            onCheckedChange={async (v) => {
              if (v && typeof Notification !== "undefined" && Notification.permission !== "granted") {
                const p = await Notification.requestPermission().catch(() => "denied");
                if (p !== "granted") {
                  alert("اسمح بالإشعارات من إعدادات المتصفح. على آيفون: ثبّت التطبيق أولًا على الشاشة الرئيسية.");
                  return;
                }
              }
              update({ notify: v });
            }}
            aria-label="إشعار عند الانقطاع"
          />
          <Bell className="h-3.5 w-3.5" />
          إشعار عند الانقطاع
        </label>

        <div className="mr-auto flex items-center gap-2">
          <button
            type="button"
            onClick={manualReload}
            className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground"
            aria-label="تحديث البث"
            title="تحديث البث"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground"
            aria-label="ملء الشاشة"
            title="ملء الشاشة"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
