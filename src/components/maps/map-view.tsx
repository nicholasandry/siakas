"use client";

import { useEffect, useRef, useState } from "react";

import { invalidateMapSize, loadLeaflet } from "@/lib/maps/load-leaflet";

type Patok = {
  label: string;
  lat: number;
  lng: number;
};

type MapViewProps = {
  latitude?: string | number | null;
  longitude?: string | number | null;
  patoks?: Patok[];
  assetType?: "land" | "building";
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MapView({ latitude, longitude, patoks = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const validPatoks = patoks.filter((patok) => Number.isFinite(patok.lat) && Number.isFinite(patok.lng));
  const [showBoundary, setShowBoundary] = useState(true);
  const hasCenter = lat !== null && lng !== null;
  const hasMapData = hasCenter || validPatoks.length > 0;

  useEffect(() => {
    if (!hasMapData) return;
    let map: any;
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapRef.current) return;

      const first = (hasCenter ? [lat, lng] : [validPatoks[0].lat, validPatoks[0].lng]) as [number, number];
      map = L.map(mapRef.current).setView(first, 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (hasCenter) {
        const centerIcon = L.divIcon({
          className: "",
          html: '<div style="height:18px;width:18px;border-radius:999px;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35)"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([lat, lng], { icon: centerIcon }).bindTooltip("Pusat aset").addTo(map);
      }

      if (showBoundary) {
        validPatoks.forEach((patok) => {
          L.marker([patok.lat, patok.lng]).bindTooltip(patok.label).addTo(map);
        });
      }

      if (showBoundary && validPatoks.length >= 2) {
        L.polyline(validPatoks.map((patok) => [patok.lat, patok.lng] as [number, number]), { color: "#2563eb", weight: 3 }).addTo(map);
      }

      if (showBoundary && validPatoks.length >= 3) {
        L.polygon(validPatoks.map((patok) => [patok.lat, patok.lng] as [number, number]), {
          color: "#2563eb",
          fillColor: "#60a5fa",
          fillOpacity: 0.2,
        }).addTo(map);
      }

      const resizeObserver = new ResizeObserver(() => invalidateMapSize(map));
      resizeObserver.observe(mapRef.current);

      function handleWindowChange() {
        invalidateMapSize(map);
      }

      window.addEventListener("resize", handleWindowChange);
      window.addEventListener("focus", handleWindowChange);
      invalidateMapSize(map);

      map.once("unload", () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", handleWindowChange);
        window.removeEventListener("focus", handleWindowChange);
      });
    });

    return () => {
      isMounted = false;
      if (map) {
        map.remove();
      }
    };
  }, [hasMapData, showBoundary]);

  if (!hasMapData) {
    return <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Belum ada koordinat pusat atau patok batas.</div>;
  }

  return (
    <div className="space-y-3">
      {validPatoks.length > 0 ? (
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          <input
            type="checkbox"
            checked={showBoundary}
            onChange={(event) => setShowBoundary(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950/20"
          />
          Tampilkan boundary tanah
        </label>
      ) : null}
      <div ref={mapRef} className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}