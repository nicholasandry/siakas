import type { SessionUser } from "@/lib/authz";

export const assetDashboardScopes = ["direct", "descendant"] as const;
export const assetDashboardDimensions = ["ownedBy", "financedBy", "usedBy", "inputter", "all"] as const;

export type AssetDashboardScope = (typeof assetDashboardScopes)[number];
export type AssetDashboardDimension = (typeof assetDashboardDimensions)[number];

export type AssetDashboardParams = {
  organizationId: string;
  scope: AssetDashboardScope;
  dimension: AssetDashboardDimension;
  assetType?: string;
  acquisitionYear?: number;
  status?: string;
};

export type AssetDashboardIssueSeverity = "low" | "medium" | "high" | "critical";

export type AssetDashboardIssueCode =
  | "MISSING_ASSET_CODE"
  | "MISSING_LOCATION"
  | "MISSING_ACQUISITION_VALUE"
  | "MISSING_ACQUISITION_DATE"
  | "MISSING_DOCUMENT"
  | "MISSING_OWNED_BY_ORGANIZATION"
  | "MISSING_FINANCED_BY_ORGANIZATION"
  | "MISSING_USED_BY_ORGANIZATION"
  | "MISSING_INPUTTER_ORGANIZATION"
  | "MISSING_COORDINATE"
  | "MISSING_LAND_BOUNDARY"
  | "MISSING_PHYSICAL_CHECK"
  | "DAMAGED"
  | "LOST"
  | "FULLY_DEPRECIATED_STILL_USED";

export type AssetDashboardIssue = {
  code: AssetDashboardIssueCode;
  label: string;
  severity: AssetDashboardIssueSeverity;
};

export type AssetDashboardAsset = {
  id: string;
  code: string | null;
  name: string;
  assetType: string;
  status: string;
  condition: string | null;
  locationId: string | null;
  acquisitionDate: string | null;
  acquisitionValue: string | number | null;
  ownedByOrganizationId: string | null;
  financedByOrganizationId: string | null;
  usedByOrganizationId: string | null;
  inputterOrganizationId: string | null;
  ownedByOrganizationName?: string | null;
  usedByOrganizationName?: string | null;
  documentCount: number;
  accumulatedDepreciation?: string | number | null;
  bookValue?: string | number | null;
  usefulLifeEndDate?: string | null;
  landLatitude?: string | number | null;
  landLongitude?: string | number | null;
  buildingLatitude?: string | number | null;
  buildingLongitude?: string | number | null;
  buildingMainLandAssetId?: string | null;
  buildingLandCount?: number;
  landBoundaryNorth?: string | null;
  landBoundarySouth?: string | null;
  landBoundaryEast?: string | null;
  landBoundaryWest?: string | null;
  landBoundaryPatokCoordinates?: unknown;
  landCertificateNumber?: string | null;
  vehicleTaxDueAt?: string | null;
  vehicleStnkExpiredAt?: string | null;
};

export type AssetDashboardSummary = {
  totalActiveAssets: number;
  totalAcquisitionValue: number;
  totalBookValue: number;
  totalAccumulatedDepreciation: number;
  incompleteDataAssets: number;
  actionRequiredAssets: number;
};

export type AssetCompositionRow = {
  assetType: string;
  count: number;
  acquisitionValue: number;
  bookValue: number;
};

export type AssetDataHealth = {
  score: number;
  totalAssets: number;
  issueCounts: Record<AssetDashboardIssueCode, number>;
  duplicateAssetCodes: Array<{ code: string; count: number }>;
};

export type AssetLocationHealth = {
  landWithCoordinate: number;
  landWithoutCoordinate: number;
  buildingWithCoordinateOrLand: number;
  buildingWithoutLandOrLocation: number;
  landMissingBoundary: number;
  problematicLandAssets: Array<{ id: string; code: string | null; name: string; issues: AssetDashboardIssue[] }>;
};

export type AssetActionRequiredRow = {
  id: string;
  code: string | null;
  name: string;
  assetType: string;
  ownedByOrganizationName: string | null;
  usedByOrganizationName: string | null;
  issues: AssetDashboardIssue[];
  priority: AssetDashboardIssueSeverity;
};

export type AssetDashboardData = {
  params: AssetDashboardParams;
  user: SessionUser;
  organizationOptions: Array<{ id: string; name: string; code: string | null; kind: string }>;
  canViewValues: boolean;
  summary: AssetDashboardSummary;
  composition: AssetCompositionRow[];
  dataHealth: AssetDataHealth;
  locationHealth: AssetLocationHealth;
  actionRequired: AssetActionRequiredRow[];
};
