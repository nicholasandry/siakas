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

export type DepreciationScheduleItem = {
  depreciationGroupId: string;
  ruleId: string | null;
  acquisitionValue: string;
  residualValue: string;
  depreciableBase: string;
  annualDepreciation: string;
  accumulatedDepreciation: string;
  bookValue: string;
  startDate: string;
  endDate: string | null;
  status: string;
  calculationMethod: string;
  taxYear: number;
  notes: string | null;
};

export function generateDepreciationSchedule(
  acquisitionValue: number,
  group: DepreciationGroupInput,
  rule: DepreciationRuleInput | null,
  acquisitionYear: number,
  startFromYear: number = acquisitionYear,
  baseBookValue?: number | null,
  baseAccumulated?: number | null
): DepreciationScheduleItem[] {
  const params = resolveDepreciationParams(group, rule);
  const usefulLife = params.usefulLifeYears;
  const rate = Number(params.ratePercent) / 100;
  const residualPercent = Number(params.residualValuePercent) || 0;
  const residualValue = Math.max(acquisitionValue * (residualPercent / 100), 0);
  const depreciableBase = Math.max(acquisitionValue - residualValue, 0);

  const schedule: DepreciationScheduleItem[] = [];

  // Jika tidak disusutkan (misalnya tanah)
  if (!group.isDepreciable || params.method === "tidak_disusutkan") {
    return [
      {
        depreciationGroupId: group.id,
        ruleId: rule?.id ?? null,
        acquisitionValue: toMoney(acquisitionValue),
        residualValue: toMoney(acquisitionValue),
        depreciableBase: "0.00",
        annualDepreciation: "0.00",
        accumulatedDepreciation: "0.00",
        bookValue: toMoney(acquisitionValue),
        startDate: `${startFromYear}-01-01`,
        endDate: null,
        status: "inactive",
        calculationMethod: "tidak_disusutkan",
        taxYear: startFromYear,
        notes: `Kelompok fiskal: ${group.name}`,
      },
    ];
  }

  let currentBookValue = baseBookValue !== undefined && baseBookValue !== null ? baseBookValue : acquisitionValue;
  let accumulatedDepreciation = baseAccumulated !== undefined && baseAccumulated !== null ? baseAccumulated : 0;

  // Hitung sisa masa manfaat yang tersisa sejak startFromYear
  const elapsedYears = startFromYear - acquisitionYear;
  const remainingYears = usefulLife - elapsedYears;

  if (remainingYears <= 0) {
    return [];
  }

  for (let i = 0; i < remainingYears; i++) {
    const currentYear = startFromYear + i;
    let annualDepr = 0;

    if (params.method === "saldo_menurun") {
      // Pada tahun terakhir masa manfaat, sisa nilai buku disusutkan sekaligus
      if (i === remainingYears - 1) {
        annualDepr = Math.max(currentBookValue - residualValue, 0);
      } else {
        annualDepr = currentBookValue * rate;
      }
    } else {
      // default: garis_lurus
      annualDepr = depreciableBase / usefulLife;
    }

    // Pastikan penyusutan tidak melampaui nilai residu
    if (currentBookValue - annualDepr < residualValue) {
      annualDepr = Math.max(currentBookValue - residualValue, 0);
    }

    accumulatedDepreciation += annualDepr;
    currentBookValue -= annualDepr;

    schedule.push({
      depreciationGroupId: group.id,
      ruleId: rule?.id ?? null,
      acquisitionValue: toMoney(acquisitionValue),
      residualValue: toMoney(residualValue),
      depreciableBase: toMoney(depreciableBase),
      annualDepreciation: toMoney(annualDepr),
      accumulatedDepreciation: toMoney(accumulatedDepreciation),
      bookValue: toMoney(currentBookValue),
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      status: "active",
      calculationMethod: params.method,
      taxYear: currentYear,
      notes: `Kelompok fiskal: ${group.name}`,
    });

    if (currentBookValue <= residualValue) {
      break;
    }
  }

  return schedule;
}
