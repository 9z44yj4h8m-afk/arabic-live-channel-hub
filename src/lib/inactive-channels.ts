// Channels whose stream failed on this device; kept in the visitor's browser instead of deleting them.
import { useEffect, useState } from "react";

const KEY = "almoghani-inactive-channels";
const EVENT = "almoghani-inactive-change";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

export function markInactive(id: string) {
  const ids = read();
  if (!ids.includes(id)) write([...ids, id]);
}

export function markActive(id: string) {
  const ids = read();
  if (ids.includes(id)) write(ids.filter((x) => x !== id));
}

export function useInactiveChannels() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ids;
}

// Mobile/desktop system notification when a stream drops or comes back.
export function notifyStream(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = { body, tag, icon: "/icon-192.png", lang: "ar", dir: "rtl" as const };
  navigator.serviceWorker?.getRegistration?.().then((reg) => {
    if (reg) reg.showNotification(title, options);
    else new Notification(title, options);
  }).catch(() => {
    try { new Notification(title, options); } catch { /* unsupported */ }
  });
}
