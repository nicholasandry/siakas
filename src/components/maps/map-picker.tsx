"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { invalidateMapSize, loadLeaflet } from "@/lib/maps/load-leaflet";

type Patok = {
  label: string;
  lat: number | "";
  lng: number | "";
};

type MapPickerProps = {
  defaultLatitude?: string | number | null;
  defaultLongitude?: string | number | null;
  defaultPatoks?: unknown;
  assetType?: "land" | "building";
  latitudeName?: string;
  longitudeName?: string;
};

const defaultCenter = { lat: -7.2575, lng: 112.7521 };

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePatoks(value: unknown): Patok[] {
  let raw = value;
  if (typeof value === "string" && value) {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const lat = Number(record.lat);
      const lng = Number(record.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        label: String(record.label || `Patok ${index + 1}`).trim(),
        lat,
        lng,
      };
    })
    .filter((item): item is { label: string; lat: number; lng: number } => Boolean(item));
}

function serializePatoks(patoks: Patok[]) {
  const cleaned = patoks
    .map((patok, index) => ({
      label: patok.label.trim() || `Patok ${index + 1}`,
      lat: Number(patok.lat),
      lng: Number(patok.lng),
    }))
    .filter((patok) => Number.isFinite(patok.lat) && Number.isFinite(patok.lng));

  return cleaned.length > 0 ? JSON.stringify(cleaned) : "";
}

export function MapPicker({
  defaultLatitude,
  defaultLongitude,
  defaultPatoks,
  assetType = "land",
  latitudeName = "landLatitude",
  longitudeName = "landLongitude",
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const patokLayerRef = useRef<any>(null);
  const polygonLayerRef = useRef<any>(null);
  const supportsPatoks = assetType === "land";
  const [mode, setMode] = useState<"center" | "patok">("center");
  const [lat, setLat] = useState(() => toNumber(defaultLatitude));
  const [lng, setLng] = useState(() => toNumber(defaultLongitude));
  const [patoks, setPatoks] = useState<Patok[]>(() => (supportsPatoks ? normalizePatoks(defaultPatoks) : []));
  const [query, setQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const center = useMemo(() => ({ lat: lat ?? defaultCenter.lat, lng: lng ?? defaultCenter.lng }), [lat, lng]);
  const hiddenPatoks = supportsPatoks ? serializePatoks(patoks) : "";
  const pointLabel = assetType === "building" ? "Sudut" : "Patok";
  const pointListLabel = assetType === "building" ? "Daftar pin sudut bangunan" : "Daftar patok";

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current || leafletMapRef.current) return;

        const map = L.map(mapRef.current).setView([center.lat, center.lng], 17);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const centerIcon = L.divIcon({
          className: "",
          html: '<div style="height:18px;width:18px;border-radius:999px;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35)"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        const marker = L.marker([center.lat, center.lng], { draggable: true, icon: centerIcon }).addTo(map);
        marker.on("dragend", () => {
          const next = marker.getLatLng();
          setLat(Number(next.lat.toFixed(7)));
          setLng(Number(next.lng.toFixed(7)));
        });

        map.on("click", (event: any) => {
          const nextLat = Number(event.latlng.lat.toFixed(7));
          const nextLng = Number(event.latlng.lng.toFixed(7));

          if (mode === "center" || !supportsPatoks) {
            setLat(nextLat);
            setLng(nextLng);
          } else {
            setPatoks((current) => [...current, { label: `${pointLabel} ${current.length + 1}`, lat: nextLat, lng: nextLng }]);
          }
        });

        leafletMapRef.current = map;
        centerMarkerRef.current = marker;
        patokLayerRef.current = L.layerGroup().addTo(map);
        polygonLayerRef.current = L.layerGroup().addTo(map);
        setMapReady(true);
        invalidateMapSize(map);
      })
      .catch(() => setSearchMessage("Gagal memuat peta. Periksa koneksi internet Anda."));

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        centerMarkerRef.current = null;
        patokLayerRef.current = null;
        polygonLayerRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletMapRef.current) return;

    const map = leafletMapRef.current;
    const resizeObserver = new ResizeObserver(() => invalidateMapSize(map));
    resizeObserver.observe(mapRef.current);

    function handleVisibilityChange() {
      if (!document.hidden) {
        invalidateMapSize(map);
      }
    }

    function handleWindowChange() {
      invalidateMapSize(map);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("focus", handleWindowChange);
    window.addEventListener("click", handleWindowChange);
    invalidateMapSize(map);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("focus", handleWindowChange);
      window.removeEventListener("click", handleWindowChange);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.off("click");
    leafletMapRef.current.on("click", (event: any) => {
      const nextLat = Number(event.latlng.lat.toFixed(7));
      const nextLng = Number(event.latlng.lng.toFixed(7));

      if (mode === "center" || !supportsPatoks) {
        setLat(nextLat);
        setLng(nextLng);
      } else {
        setPatoks((current) => [...current, { label: `${pointLabel} ${current.length + 1}`, lat: nextLat, lng: nextLng }]);
      }
    });
  }, [mode, pointLabel, supportsPatoks]);

  useEffect(() => {
    if (!supportsPatoks && patoks.length > 0) {
      setPatoks([]);
    }
  }, [patoks.length, supportsPatoks]);

  useEffect(() => {
    if (!centerMarkerRef.current || lat === null || lng === null) return;
    centerMarkerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  useEffect(() => {
    const L = window.L;
    if (!L || !patokLayerRef.current || !polygonLayerRef.current) return;

    patokLayerRef.current.clearLayers();
    polygonLayerRef.current.clearLayers();

    if (!supportsPatoks) return;

    const validPatoks = patoks
      .map((patok, index) => ({ ...patok, index, lat: Number(patok.lat), lng: Number(patok.lng) }))
      .filter((patok) => Number.isFinite(patok.lat) && Number.isFinite(patok.lng));

    validPatoks.forEach((patok) => {
      const marker = L.marker([patok.lat, patok.lng], { draggable: true })
        .bindTooltip(patok.label || `Patok ${patok.index + 1}`)
        .addTo(patokLayerRef.current);

      marker.on("dragend", () => {
        const next = marker.getLatLng();
        setPatoks((current) =>
          current.map((item, itemIndex) =>
            itemIndex === patok.index ? { ...item, lat: Number(next.lat.toFixed(7)), lng: Number(next.lng.toFixed(7)) } : item
          )
        );
      });
    });

    if (validPatoks.length >= 2) {
      L.polyline(validPatoks.map((patok) => [patok.lat, patok.lng] as [number, number]), { color: "#2563eb", weight: 3 }).addTo(polygonLayerRef.current);
    }

    if (validPatoks.length >= 3) {
      L.polygon(validPatoks.map((patok) => [patok.lat, patok.lng] as [number, number]), {
        color: "#2563eb",
        fillColor: "#60a5fa",
        fillOpacity: 0.2,
      }).addTo(polygonLayerRef.current);
    }
  }, [patoks, mapReady, supportsPatoks]);

  async function searchLocation() {
    if (!query.trim()) return;
    setSearchMessage(null);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const result = (await response.json()) as Array<{ lat: string; lon: string }>;
      const first = result[0];

      if (!first) {
        setSearchMessage("Alamat tidak ditemukan.");
        return;
      }

      const nextLat = Number(Number(first.lat).toFixed(7));
      const nextLng = Number(Number(first.lon).toFixed(7));
      setLat(nextLat);
      setLng(nextLng);
      leafletMapRef.current?.setView([nextLat, nextLng], 17);
      invalidateMapSize(leafletMapRef.current);
    } catch {
      setSearchMessage("Gagal mencari alamat. Periksa koneksi internet Anda.");
    }
  }

  function updatePatok(index: number, patch: Partial<Patok>) {
    setPatoks((current) => current.map((patok, itemIndex) => (itemIndex === index ? { ...patok, ...patch } : patok)));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={latitudeName} value={lat ?? ""} />
      <input type="hidden" name={longitudeName} value={lng ?? ""} />
      <input type="hidden" name="boundaryPatokCoordinates" value={hiddenPatoks} />

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
          placeholder={assetType === "land" ? "Cari lokasi tanah" : "Cari lokasi bangunan"}
        />
        <button type="button" onClick={searchLocation} className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white">
          Cari Lokasi
        </button>
      </div>
      {searchMessage ? <p className="text-sm text-rose-600">{searchMessage}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("center")}
          className={`rounded-lg border px-3 py-2 text-sm ${mode === "center" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200"}`}
        >
          Mode 1: Pusat {assetType === "building" ? "Bangunan" : "Aset"} / Pin Merah
        </button>
        {supportsPatoks ? (
          <button
            type="button"
            onClick={() => setMode("patok")}
            className={`rounded-lg border px-3 py-2 text-sm ${mode === "patok" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200"}`}
          >
            Mode 2: Patok Batas Poligon
          </button>
        ) : null}
      </div>

      <div ref={mapRef} className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Latitude pusat</span>
          <input value={lat ?? ""} onChange={(event) => setLat(toNumber(event.target.value))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Longitude pusat</span>
          <input value={lng ?? ""} onChange={(event) => setLng(toNumber(event.target.value))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
        </label>
      </div>

      {supportsPatoks ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-900">{pointListLabel}</h4>
            <button type="button" onClick={() => setPatoks([])} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              Hapus semua patok
            </button>
          </div>
          {patoks.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada patok. Pilih mode patok lalu klik peta.</p>
          ) : null}
          {patoks.map((patok, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input value={patok.label} onChange={(event) => updatePatok(index, { label: event.target.value })} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
              <input value={patok.lat} onChange={(event) => updatePatok(index, { lat: toNumber(event.target.value) ?? "" })} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
              <input value={patok.lng} onChange={(event) => updatePatok(index, { lng: toNumber(event.target.value) ?? "" })} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
              <button type="button" onClick={() => setPatoks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700">
                Hapus
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
