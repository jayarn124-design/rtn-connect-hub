import { useEffect, useRef, useState } from "react";

const SDK_KEY = import.meta.env['VITE_MAPPLS_WEB_SDK_KEY'] as string | undefined;

declare global {
  interface Window {
    mappls?: {
      Map: new (el: HTMLElement | string, opts: Record<string, unknown>) => unknown;
      Marker: new (opts: Record<string, unknown>) => unknown;
    };
  }
}

function loadSdk(key: string): Promise<void> {
  if (window.mappls) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("mappls-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Mappls SDK failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.id = "mappls-sdk";
    s.src = `https://apis.mappls.com/advancedmaps/api/${key}/map_sdk?layer=vector&v=3.0&callback=initMapplsSdk`;
    s.async = true;
    (window as unknown as Record<string, unknown>)['initMapplsSdk'] = () => resolve();
    s.onerror = () => reject(new Error("Mappls SDK failed to load"));
    document.head.appendChild(s);
  });
}

/** Client-only map. Uses the intentionally-public Mappls Web SDK key from env. */
export default function MapplsMap({
  markers = [],
  center = [77.209, 28.6139],
}: {
  markers?: { lat: number; lng: number; label?: string }[];
  center?: [number, number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SDK_KEY) {
      setError("VITE_MAPPLS_WEB_SDK_KEY is not configured.");
      return;
    }
    let cancelled = false;
    loadSdk(SDK_KEY)
      .then(() => {
        if (cancelled || !ref.current || !window.mappls) return;
        const map = new window.mappls.Map(ref.current, {
          center: { lat: center[1], lng: center[0] },
          zoom: 5,
        });
        markers.forEach((m) => {
          new window.mappls!.Marker({
            map,
            position: { lat: m.lat, lng: m.lng },
            title: m.label ?? "",
          });
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [markers, center]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  return <div ref={ref} className="h-80 w-full rounded-md border" />;
}
