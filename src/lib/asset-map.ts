import { and, desc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { assetBuildingDetails, assetLandDetails, assetLocations, assets, units } from "@/db/schema";
import { finalDisposalAssetStatuses } from "@/lib/assets/status";
import type { AccessScope } from "@/lib/scope";
import { buildAssetScopeCondition } from "@/lib/scope";

type BoundaryPoint = {
  label: string;
  lat: number;
  lng: number;
};

export type AssetMapPoint = {
  id: string;
  code: string;
  name: string;
  assetType: "tanah" | "bangunan";
  latitude: string;
  longitude: string;
  unitId: string | null;
  unitName: string | null;
  locationName: string | null;
  boundaryPatoks: BoundaryPoint[];
  href: string;
};

export type AssetMapFilters = {
  assetType?: "all" | "tanah" | "bangunan";
  unitId?: string | null;
};

function parseBoundaryPatoks(value: unknown): BoundaryPoint[] {
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
    .filter((item): item is BoundaryPoint => Boolean(item));
}

function buildFilterCondition(filters?: AssetMapFilters) {
  const conditions = [] as Array<ReturnType<typeof eq> | ReturnType<typeof notInArray> | ReturnType<typeof sql>>;

  if (filters?.assetType && filters.assetType !== "all") {
    conditions.push(eq(assets.assetType, filters.assetType));
  }

  if (filters?.unitId) {
    conditions.push(eq(assets.unitId, filters.unitId));
  }

  return conditions;
}

export async function listAssetMapPoints(scope?: AccessScope, filters?: AssetMapFilters) {
  const scopeCondition = scope ? buildAssetScopeCondition(scope) : undefined;
  const activeListCondition = notInArray(assets.status, [...finalDisposalAssetStatuses]);
  const landCoordinateCondition = and(sql`${assetLandDetails.latitude} is not null`, sql`${assetLandDetails.longitude} is not null`);
  const buildingCoordinateCondition = and(sql`${assetBuildingDetails.latitude} is not null`, sql`${assetBuildingDetails.longitude} is not null`);
  const filterConditions = buildFilterCondition(filters);

  const landWhere = and(...[scopeCondition, activeListCondition, landCoordinateCondition, ...filterConditions].filter(Boolean));
  const buildingWhere = and(...[scopeCondition, activeListCondition, buildingCoordinateCondition, ...filterConditions].filter(Boolean));

  const landQuery = db
    .select({
      id: assets.id,
      code: assets.code,
      name: assets.name,
      assetType: assets.assetType,
      latitude: assetLandDetails.latitude,
      longitude: assetLandDetails.longitude,
      boundaryPatokCoordinates: assetLandDetails.boundaryPatokCoordinates,
      unitId: assets.unitId,
      unitName: units.name,
      locationName: assetLocations.name,
    })
    .from(assets)
    .innerJoin(assetLandDetails, eq(assets.id, assetLandDetails.assetId))
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(assetLocations, eq(assets.locationId, assetLocations.id))
    .where(landWhere)
    .orderBy(desc(assets.createdAt));

  const buildingQuery = db
    .select({
      id: assets.id,
      code: assets.code,
      name: assets.name,
      assetType: assets.assetType,
      latitude: assetBuildingDetails.latitude,
      longitude: assetBuildingDetails.longitude,
      unitId: assets.unitId,
      unitName: units.name,
      locationName: assetLocations.name,
    })
    .from(assets)
    .innerJoin(assetBuildingDetails, eq(assets.id, assetBuildingDetails.assetId))
    .leftJoin(units, eq(assets.unitId, units.id))
    .leftJoin(assetLocations, eq(assets.locationId, assetLocations.id))
    .where(buildingWhere)
    .orderBy(desc(assets.createdAt));

  const [landRows, buildingRows] = await Promise.all([landQuery, buildingQuery]);

  return [...landRows, ...buildingRows].map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    assetType: row.assetType as "tanah" | "bangunan",
    latitude: row.latitude ?? "",
    longitude: row.longitude ?? "",
    unitId: row.unitId,
    unitName: row.unitName,
    locationName: row.locationName,
    boundaryPatoks: row.assetType === "tanah" ? parseBoundaryPatoks((row as { boundaryPatokCoordinates?: unknown }).boundaryPatokCoordinates) : [],
    href: `/assets/${row.id}`,
  })) as AssetMapPoint[];
}