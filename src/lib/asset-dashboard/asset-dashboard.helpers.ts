import type {
  AssetDashboardAsset,
  AssetDashboardDimension,
  AssetDashboardIssue,
  AssetDashboardIssueCode,
  AssetDashboardIssueSeverity,
  AssetDashboardScope,
} from "./asset-dashboard.types";

export const dimensionRelationTypes: Record<Exclude<AssetDashboardDimension, "all">, string> = {
  ownedBy: "owned_by",
  financedBy: "financed_by",
  usedBy: "used_by",
  inputter: "inputted_by",
};

export const assetIssueDefinitions: Record<AssetDashboardIssueCode, AssetDashboardIssue> = {
  MISSING_ASSET_CODE: { code: "MISSING_ASSET_CODE", label: "Kode aset kosong", severity: "high" },
  MISSING_LOCATION: { code: "MISSING_LOCATION", label: "Lokasi belum diisi", severity: "medium" },
  MISSING_ACQUISITION_VALUE: { code: "MISSING_ACQUISITION_VALUE", label: "Nilai perolehan kosong", severity: "high" },
  MISSING_ACQUISITION_DATE: { code: "MISSING_ACQUISITION_DATE", label: "Tanggal perolehan kosong", severity: "medium" },
  MISSING_DOCUMENT: { code: "MISSING_DOCUMENT", label: "Dokumen belum ada", severity: "high" },
  MISSING_OWNED_BY_ORGANIZATION: { code: "MISSING_OWNED_BY_ORGANIZATION", label: "Organisasi pemilik kosong", severity: "critical" },
  MISSING_FINANCED_BY_ORGANIZATION: { code: "MISSING_FINANCED_BY_ORGANIZATION", label: "Organisasi pembiaya kosong", severity: "high" },
  MISSING_USED_BY_ORGANIZATION: { code: "MISSING_USED_BY_ORGANIZATION", label: "Organisasi pemakai kosong", severity: "high" },
  MISSING_INPUTTER_ORGANIZATION: { code: "MISSING_INPUTTER_ORGANIZATION", label: "Organisasi inputter kosong", severity: "medium" },
  MISSING_COORDINATE: { code: "MISSING_COORDINATE", label: "Koordinat belum diisi", severity: "medium" },
  MISSING_LAND_BOUNDARY: { code: "MISSING_LAND_BOUNDARY", label: "Patok atau batas tanah belum lengkap", severity: "high" },
  MISSING_PHYSICAL_CHECK: { code: "MISSING_PHYSICAL_CHECK", label: "Data cek fisik belum tersedia", severity: "low" },
  DAMAGED: { code: "DAMAGED", label: "Kondisi rusak berat", severity: "critical" },
  LOST: { code: "LOST", label: "Status hilang", severity: "critical" },
  FULLY_DEPRECIATED_STILL_USED: { code: "FULLY_DEPRECIATED_STILL_USED", label: "Habis masa manfaat tapi masih aktif", severity: "high" },
};

const criticalIssueCodes = new Set<AssetDashboardIssueCode>([
  "MISSING_ASSET_CODE",
  "MISSING_ACQUISITION_VALUE",
  "MISSING_DOCUMENT",
  "MISSING_OWNED_BY_ORGANIZATION",
  "MISSING_FINANCED_BY_ORGANIZATION",
  "MISSING_USED_BY_ORGANIZATION",
  "DAMAGED",
  "LOST",
  "FULLY_DEPRECIATED_STILL_USED",
]);

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateBookValue(asset: Pick<AssetDashboardAsset, "assetType" | "acquisitionValue" | "accumulatedDepreciation" | "bookValue">) {
  const acquisitionValue = toNumber(asset.acquisitionValue);
  const accumulatedDepreciation = asset.assetType === "tanah" ? 0 : toNumber(asset.accumulatedDepreciation);

  if (asset.bookValue !== null && asset.bookValue !== undefined && asset.bookValue !== "") {
    return toNumber(asset.bookValue);
  }

  // TODO: Integrasikan dengan modul depresiasi penuh ketika jadwal depresiasi sudah menjadi sumber utama dashboard.
  return Math.max(0, acquisitionValue - accumulatedDepreciation);
}

function hasCoordinate(lat: string | number | null | undefined, lng: string | number | null | undefined) {
  return toNumber(lat) !== 0 && toNumber(lng) !== 0;
}

function hasCompleteLandBoundary(asset: AssetDashboardAsset) {
  const hasCardinalBoundaries = Boolean(
    asset.landBoundaryNorth && asset.landBoundarySouth && asset.landBoundaryEast && asset.landBoundaryWest
  );
  const patoks = asset.landBoundaryPatokCoordinates;
  const hasPatoks = Array.isArray(patoks) ? patoks.length > 0 : Boolean(patoks);
  return hasCardinalBoundaries && hasPatoks;
}

function pushIssue(issues: AssetDashboardIssue[], code: AssetDashboardIssueCode) {
  issues.push(assetIssueDefinitions[code]);
}

export function getAssetIssues(asset: AssetDashboardAsset): AssetDashboardIssue[] {
  const issues: AssetDashboardIssue[] = [];

  if (!asset.code?.trim()) pushIssue(issues, "MISSING_ASSET_CODE");
  if (!asset.locationId && !asset.landLatitude && !asset.buildingLatitude) pushIssue(issues, "MISSING_LOCATION");
  if (toNumber(asset.acquisitionValue) <= 0) pushIssue(issues, "MISSING_ACQUISITION_VALUE");
  if (!asset.acquisitionDate) pushIssue(issues, "MISSING_ACQUISITION_DATE");
  if (asset.documentCount <= 0) pushIssue(issues, "MISSING_DOCUMENT");
  if (!asset.ownedByOrganizationId) pushIssue(issues, "MISSING_OWNED_BY_ORGANIZATION");
  if (!asset.financedByOrganizationId) pushIssue(issues, "MISSING_FINANCED_BY_ORGANIZATION");
  if (!asset.usedByOrganizationId) pushIssue(issues, "MISSING_USED_BY_ORGANIZATION");
  if (!asset.inputterOrganizationId) pushIssue(issues, "MISSING_INPUTTER_ORGANIZATION");

  if (asset.assetType === "tanah") {
    if (!hasCoordinate(asset.landLatitude, asset.landLongitude)) pushIssue(issues, "MISSING_COORDINATE");
    if (!hasCompleteLandBoundary(asset)) pushIssue(issues, "MISSING_LAND_BOUNDARY");
  }

  if (asset.assetType === "bangunan" && !hasCoordinate(asset.buildingLatitude, asset.buildingLongitude) && !asset.buildingMainLandAssetId && !asset.buildingLandCount) {
    pushIssue(issues, "MISSING_COORDINATE");
  }

  const normalizedCondition = asset.condition?.toLowerCase() ?? "";
  if (normalizedCondition.includes("rusak berat")) pushIssue(issues, "DAMAGED");
  if (asset.status === "lost") pushIssue(issues, "LOST");
  if (asset.status === "expired_still_used" || (asset.status === "active" && asset.assetType !== "tanah" && calculateBookValue(asset) <= 0 && toNumber(asset.acquisitionValue) > 0)) {
    pushIssue(issues, "FULLY_DEPRECIATED_STILL_USED");
  }

  return issues;
}

export function getPriority(issues: AssetDashboardIssue[]): AssetDashboardIssueSeverity {
  const order: AssetDashboardIssueSeverity[] = ["critical", "high", "medium", "low"];
  return order.find((severity) => issues.some((issue) => issue.severity === severity)) ?? "low";
}

export function calculateDataHealthScore(assets: AssetDashboardAsset[]) {
  if (assets.length === 0) return 100;

  const healthyCount = assets.filter((asset) => !getAssetIssues(asset).some((issue) => criticalIssueCodes.has(issue.code))).length;
  return Math.round((healthyCount / assets.length) * 100);
}

export function filterAssetsByOrganizationScope(
  assets: AssetDashboardAsset[],
  organizationIds: Set<string>,
  dimension: AssetDashboardDimension
) {
  const matchesDimension = (asset: AssetDashboardAsset, currentDimension: Exclude<AssetDashboardDimension, "all">) => {
    if (currentDimension === "ownedBy") return asset.ownedByOrganizationId ? organizationIds.has(asset.ownedByOrganizationId) : false;
    if (currentDimension === "financedBy") return asset.financedByOrganizationId ? organizationIds.has(asset.financedByOrganizationId) : false;
    if (currentDimension === "usedBy") return asset.usedByOrganizationId ? organizationIds.has(asset.usedByOrganizationId) : false;
    return asset.inputterOrganizationId ? organizationIds.has(asset.inputterOrganizationId) : false;
  };

  const filtered =
    dimension === "all"
      ? assets.filter((asset) => assetDashboardDimensionList.some((item) => matchesDimension(asset, item)))
      : assets.filter((asset) => matchesDimension(asset, dimension));

  return [...new Map(filtered.map((asset) => [asset.id, asset])).values()];
}

const assetDashboardDimensionList: Exclude<AssetDashboardDimension, "all">[] = ["ownedBy", "financedBy", "usedBy", "inputter"];

export function resolveOrganizationIdsForScope(unitIds: string[], organizationId: string, scope: AssetDashboardScope) {
  if (scope === "direct") return new Set([organizationId]);
  return new Set(unitIds);
}
