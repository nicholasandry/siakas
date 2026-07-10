"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";

type LeafletNamespace = typeof import("leaflet");

let leafletModule: LeafletNamespace | null = null;
let loading: Promise<LeafletNamespace> | null = null;

export function loadLeaflet(): Promise<LeafletNamespace> {
  if (leafletModule) {
    return Promise.resolve(leafletModule);
  }

  if (!loading) {
    loading = import("leaflet").then((module) => {
      const L = (module.default || module) as unknown as LeafletNamespace;
      leafletModule = L;
      return L;
    });
  }

  return loading;
}

export function invalidateMapSize(map: LeafletMap | null | undefined) {
  if (!map) return;
  map.invalidateSize();
  window.setTimeout(() => map.invalidateSize(), 120);
  window.setTimeout(() => map.invalidateSize(), 320);
}
