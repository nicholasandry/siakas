"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AssetMapPoint } from "@/lib/asset-map";
import { invalidateMapSize, loadLeaflet } from "@/lib/maps/load-leaflet";

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iconMarkup(color: string) {
  return `<div style="display:flex;align-items:center;justify-content:center;height:28px;width:28px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.22)"><div style="height:9px;width:9px;border-radius:999px;background:white"></div></div>`;
}

const BOUNDARY_COLORS = [
  { stroke: "#2563eb", fill: "#60a5fa", bgClass: "!bg-blue-600" }, // Blue
  { stroke: "#059669", fill: "#34d399", bgClass: "!bg-emerald-600" }, // Emerald
  { stroke: "#d97706", fill: "#fbbf24", bgClass: "!bg-amber-600" }, // Amber
  { stroke: "#7c3aed", fill: "#a78bfa", bgClass: "!bg-violet-600" }, // Violet
  { stroke: "#db2777", fill: "#f472b6", bgClass: "!bg-pink-600" }, // Pink
  { stroke: "#ea580c", fill: "#fb923c", bgClass: "!bg-orange-600" }, // Orange
  { stroke: "#0891b2", fill: "#22d3ee", bgClass: "!bg-cyan-600" }, // Cyan
  { stroke: "#4f46e5", fill: "#818cf8", bgClass: "!bg-indigo-600" }, // Indigo
];

function getAssetColor(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BOUNDARY_COLORS.length;
  return BOUNDARY_COLORS[index];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function popupContent(point: AssetMapPoint) {
  const assetTypeLabel = point.assetType === "tanah" ? "Tanah" : "Bangunan";
  const unitLabel = point.unitName ?? "-";
  const locationLabel = point.locationName ?? "-";
  const coordinateLabel = `${point.latitude}, ${point.longitude}`;

  return `
    <div style="min-width:220px;max-width:280px;font-family:ui-sans-serif,system-ui,sans-serif">
      <div style="margin-bottom:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#64748b">${assetTypeLabel}</div>
          <div style="margin-top:4px;font-size:15px;font-weight:700;line-height:1.3;color:#0f172a">${escapeHtml(point.name)}</div>
          <div style="margin-top:4px;font-size:11px;color:#64748b">${escapeHtml(point.code)}</div>
        </div>
        <span style="display:inline-flex;align-items:center;border-radius:999px;background:${point.assetType === "tanah" ? "#ecfdf5" : "#eff6ff"};padding:4px 10px;font-size:11px;font-weight:700;color:${point.assetType === "tanah" ? "#047857" : "#1d4ed8"}">${assetTypeLabel}</span>
      </div>

      <div style="display:grid;gap:6px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:12px;color:#334155">
        <div><span style="color:#64748b">Unit:</span> ${escapeHtml(unitLabel)}</div>
        <div><span style="color:#64748b">Lokasi:</span> ${escapeHtml(locationLabel)}</div>
        <div><span style="color:#64748b">Koordinat:</span> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(coordinateLabel)}</span></div>
      </div>

      <a href="${escapeHtml(point.href)}" style="margin-top:12px;display:inline-flex;height:34px;align-items:center;justify-content:center;border-radius:10px;background:#0f172a;padding:0 12px;font-size:12px;font-weight:700;color:#fff;text-decoration:none">Buka detail</a>
    </div>
  `;
}

function boundaryPolygonHtml() {
  return `<div style="position:absolute;inset:-1px;border:2px dashed #2563eb;border-radius:999px;opacity:.9;"></div>`;
}

export function AssetDistributionMap({ points }: { points: AssetMapPoint[] }) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapRefInstance = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showBoundary, setShowBoundary] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current || mapRefInstance.current) return;

        const fallbackCenter: [number, number] = [-7.2575, 112.7521];
        const map = L.map(mapRef.current, { scrollWheelZoom: true }).setView(fallbackCenter, 11);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        mapRefInstance.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        setMapReady(true);
        invalidateMapSize(map);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
      mapRefInstance.current?.remove();
      mapRefInstance.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRefInstance.current;
    const layer = layerRef.current;
    if (!map || !layer || !window.L || !mapReady) return;

    layer.clearLayers();

    const validPoints = points
      .map((point) => ({ ...point, lat: toNumber(point.latitude), lng: toNumber(point.longitude) }))
      .filter((point): point is AssetMapPoint & { lat: number; lng: number } => point.lat !== null && point.lng !== null);

    validPoints.forEach((point) => {
      const marker = window.L.marker([point.lat, point.lng], {
        icon: window.L.divIcon({
          className: "",
          html: iconMarkup(point.assetType === "tanah" ? "#0f766e" : "#2563eb"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layer);

      marker.bindTooltip(point.name, {
        direction: "top",
        offset: [0, -12],
        opacity: 0.96,
        sticky: true,
        className: "!rounded-full !border-0 !bg-slate-950 !px-3 !py-1.5 !text-xs !font-semibold !text-white !shadow-lg",
      });

      marker.bindPopup(popupContent(point), {
        maxWidth: 320,
        autoPanPadding: [24, 24],
        closeButton: true,
        className: "asset-map-popup",
      });

      marker.on("click", () => {
        marker.openPopup();
      });

      marker.on("popupopen", () => {
        const popupElement = marker.getPopup()?.getElement();
        const link = popupElement?.querySelector("a[href]") as HTMLAnchorElement | null;
        if (!link) return;

        link.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            router.push(point.href);
          },
          { once: true }
        );
      });

      if (showBoundary && point.assetType === "tanah" && point.boundaryPatoks.length > 0) {
        const colors = getAssetColor(point.code);
        const boundaryCoords = point.boundaryPatoks.map((patok) => [patok.lat, patok.lng] as [number, number]);

        point.boundaryPatoks.forEach((patok) => {
          const boundaryMarker = window.L.marker([patok.lat, patok.lng], {
            icon: window.L.divIcon({
              className: "",
              html: `<div style="height:12px;width:12px;border-radius:999px;background:#ffffff;border:2.5px solid ${colors.stroke};box-shadow:0 2px 8px rgba(0,0,0,0.18)"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            }),
          }).addTo(layer);

          boundaryMarker.bindTooltip(patok.label, {
            direction: "top",
            offset: [0, -10],
            opacity: 0.96,
            sticky: true,
            className: `!rounded-full !border-0 ${colors.bgClass} !px-3 !py-1.5 !text-xs !font-semibold !text-white !shadow-lg`,
          });
        });

        if (boundaryCoords.length >= 2) {
          window.L.polyline(boundaryCoords, { color: colors.stroke, weight: 3.5, opacity: 0.95 }).addTo(layer);
        }

        if (boundaryCoords.length >= 3) {
          window.L.polygon(boundaryCoords, {
            color: colors.stroke,
            fillColor: colors.fill,
            fillOpacity: 0.24,
          }).addTo(layer);
        }
      }
    });

    if (validPoints.length > 0) {
      const bounds = window.L.latLngBounds(validPoints.map((point) => [point.lat, point.lng]));
      map.fitBounds(bounds.pad(0.16));
      window.setTimeout(() => invalidateMapSize(map), 160);
    }

    const resizeObserver = new ResizeObserver(() => invalidateMapSize(map));
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    function handleWindowChange() {
      invalidateMapSize(map);
    }

    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("focus", handleWindowChange);
    invalidateMapSize(map);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("focus", handleWindowChange);
    };
  }, [mapReady, points, router, showBoundary]);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Belum ada aset tanah atau bangunan yang memiliki koordinat di dalam scope Anda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
        <input
          type="checkbox"
          checked={showBoundary}
          onChange={(event) => setShowBoundary(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950/20"
        />
        Tampilkan boundary tanah
      </label>
      <div ref={mapRef} className="h-[540px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm" />
    </div>
  );
}