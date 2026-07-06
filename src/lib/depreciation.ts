export type DepreciationGroupInput = {
  id: string;
  code: string;
  name: string;
  assetCategory: string;
  methodDefault: string;
  usefulLifeYears: number;
  ratePercent: string;
  isDepreciable: boolean;
};

export type DepreciationRuleInput = {
  id: string;
  method: string;
  usefulLifeYears: number;
  ratePercent: string;
  residualValuePercent: string | null;
};

export type DepreciationPreview = {
  groupId: string;
  groupCode: string;
  groupName: string;
  ruleId: string | null;
  assetCategory: string;
  method: string;
  usefulLifeYears: number;
  ratePercent: string;
  residualValuePercent: string;
  isDepreciable: boolean;
  acquisitionValue: string;
  residualValue: string;
  depreciableBase: string;
  annualDepreciation: string;
  accumulatedDepreciation: string;
  bookValue: string;
};

export type DepreciationCalculation = Omit<
  DepreciationPreview,
  "groupId" | "groupCode" | "groupName" | "ruleId" | "assetCategory" | "isDepreciable"
>;

function toMoney(value: number) {
  return value.toFixed(2);
}

function resolveDepreciationParams(group: DepreciationGroupInput, rule?: DepreciationRuleInput | null) {
  return {
    method: rule?.method ?? group.methodDefault,
    usefulLifeYears: rule?.usefulLifeYears ?? group.usefulLifeYears,
    ratePercent: rule?.ratePercent ?? group.ratePercent,
    residualValuePercent: rule?.residualValuePercent ?? "0",
  };
}

export function calculateDepreciationFromMaster(
  acquisitionValue: number,
  group: DepreciationGroupInput,
  rule?: DepreciationRuleInput | null
): DepreciationPreview {
  const params = resolveDepreciationParams(group, rule);
  const residualPercent = Number(params.residualValuePercent) || 0;

  if (!group.isDepreciable || params.method === "tidak_disusutkan") {
    const bookValue = Math.max(acquisitionValue, 0);

    return {
      groupId: group.id,
      groupCode: group.code,
      groupName: group.name,
      ruleId: rule?.id ?? null,
      assetCategory: group.assetCategory,
      method: "tidak_disusutkan",
      usefulLifeYears: 0,
      ratePercent: "0",
      residualValuePercent: "0",
      isDepreciable: false,
      acquisitionValue: toMoney(acquisitionValue),
      residualValue: toMoney(bookValue),
      depreciableBase: "0.00",
      annualDepreciation: "0.00",
      accumulatedDepreciation: "0.00",
      bookValue: toMoney(bookValue),
    };
  }

  const residualValue = Math.max(acquisitionValue * (residualPercent / 100), 0);
  const depreciableBase = Math.max(acquisitionValue - residualValue, 0);
  let annualDepreciation = 0;

  if (params.method === "saldo_menurun") {
    annualDepreciation = depreciableBase * (Number(params.ratePercent) / 100);
  } else if (params.usefulLifeYears > 0) {
    annualDepreciation = depreciableBase / params.usefulLifeYears;
  } else if (Number(params.ratePercent) > 0) {
    annualDepreciation = depreciableBase * (Number(params.ratePercent) / 100);
  }

  return {
    groupId: group.id,
    groupCode: group.code,
    groupName: group.name,
    ruleId: rule?.id ?? null,
    assetCategory: group.assetCategory,
    method: params.method,
    usefulLifeYears: params.usefulLifeYears,
    ratePercent: params.ratePercent,
    residualValuePercent: params.residualValuePercent,
    isDepreciable: true,
    acquisitionValue: toMoney(acquisitionValue),
    residualValue: toMoney(residualValue),
    depreciableBase: toMoney(depreciableBase),
    annualDepreciation: toMoney(annualDepreciation),
    accumulatedDepreciation: "0.00",
    bookValue: toMoney(acquisitionValue),
  };
}

/** @deprecated Use calculateDepreciationFromMaster with DB group/rule */
export function calculateDepreciation(acquisitionValue: number, assetCategory: string): DepreciationPreview {
  const fallbackGroup: DepreciationGroupInput = {
    id: "fallback",
    code: assetCategory,
    name: assetCategory,
    assetCategory,
    methodDefault: assetCategory === "tanah" ? "tidak_disusutkan" : "garis_lurus",
    usefulLifeYears: assetCategory === "bangunan" ? 20 : assetCategory === "tanah" ? 0 : 4,
    ratePercent: assetCategory === "bangunan" ? "5" : assetCategory === "tanah" ? "0" : "25",
    isDepreciable: assetCategory !== "tanah",
  };

  return calculateDepreciationFromMaster(acquisitionValue, fallbackGroup);
}
