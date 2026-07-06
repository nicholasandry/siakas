"use client";

type LandOption = {
  id: string;
  code?: string;
  name: string;
};

type BuildingLandPickerProps = {
  landAssets: LandOption[];
  defaultSelected?: string[];
};

export function BuildingLandPicker({ landAssets, defaultSelected = [] }: BuildingLandPickerProps) {
  if (landAssets.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">
        Belum ada aset tanah dalam scope. Tambahkan tanah terlebih dahulu.
      </p>
    );
  }

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
      {landAssets.map((land) => (
        <label
          key={land.id}
          className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50"
        >
          <input
            type="checkbox"
            name="buildingLandAssetIds"
            value={land.id}
            defaultChecked={defaultSelected.includes(land.id)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            {land.code ? `${land.code} — ` : ""}
            {land.name}
          </span>
        </label>
      ))}
    </div>
  );
}
