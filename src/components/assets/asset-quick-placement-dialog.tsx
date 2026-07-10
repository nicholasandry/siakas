"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { quickMoveAssetPlacementAction } from "@/app/(dashboard)/assets/actions";
import { Dialog } from "@/components/ui/dialog";
import { FieldHelper } from "@/components/ui/form-ux";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormSelect, lookupToSelectOptions } from "@/components/ui/form-select";
import { filterLocationsForAssetType } from "@/lib/assets/location-kind";
import { getPlacementLocationFieldLabel, usesMasterDataPlacementLocation } from "@/lib/assets/placement";
import { isFinalDisposalAssetStatus } from "@/lib/assets/status";

type LocationOption = {
  id: string;
  name: string;
  code?: string | null;
  unitId: string;
  locationKind?: string | null;
};

type AssetQuickPlacementDialogProps = {
  asset: {
    id: string;
    code: string;
    name: string;
    assetType: string;
    ownershipLevel: string;
    status: string;
    unitId: string | null;
    locationId: string | null;
  };
  locations: LocationOption[];
  returnPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssetQuickPlacementDialog({
  asset,
  locations,
  returnPath,
  open,
  onOpenChange,
}: AssetQuickPlacementDialogProps) {
  const placementLabel = getPlacementLocationFieldLabel(asset.assetType);
  const locationOptions = useMemo(
    () =>
      filterLocationsForAssetType(
        locations.filter((location) => location.unitId === asset.unitId),
        asset.assetType,
        asset.locationId
      ),
    [asset.assetType, asset.locationId, asset.unitId, locations]
  );
  const [locationId, setLocationId] = useState(asset.locationId ?? "");
  const [placementNote, setPlacementNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function validateClient() {
    const errors: Record<string, string> = {};

    if (!locationId.trim()) {
      errors.locationId = `${placementLabel} wajib dipilih`;
    } else if (locationId === (asset.locationId ?? "")) {
      errors.locationId = "Pilih lokasi tujuan yang berbeda dari lokasi saat ini";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Pindah ${placementLabel.toLowerCase()}`}
      description={`${asset.code} — ${asset.name}`}
      className="[&_>div>div]:max-w-xl"
    >
      <form
        action={quickMoveAssetPlacementAction}
        className="space-y-5"
        onSubmit={(event) => {
          if (!validateClient()) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="assetId" value={asset.id} />
        <input type="hidden" name="assetType" value={asset.assetType} />
        <input type="hidden" name="currentLocationId" value={asset.locationId ?? ""} />
        <input type="hidden" name="currentStatus" value={asset.status} />
        <input type="hidden" name="returnPath" value={returnPath} />

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Lokasi saat ini: <span className="font-medium text-slate-900">{asset.locationId ? locationOptions.find((item) => item.id === asset.locationId)?.name ?? "Tidak diketahui" : "Belum ditentukan"}</span>
          </div>

          <FormSelect
            name="locationId"
            label={placementLabel}
            options={lookupToSelectOptions(
              locationOptions.map((location) => ({
                id: location.id,
                name: location.code ? `${location.name} (${location.code})` : location.name,
              }))
            )}
            value={locationId}
            onChange={(value) => {
              setLocationId(value);
              clearFieldError("locationId");
            }}
            placeholder={`Pilih ${placementLabel.toLowerCase()}`}
            emptyOptionLabel={`Pilih ${placementLabel.toLowerCase()}`}
            disabled={!asset.unitId || locationOptions.length === 0}
            includeEmptyOption
          />
          <FieldHelper>
            {asset.assetType === "kendaraan"
              ? "Pilih garasi atau area parkir pada unit pengelola saat ini. Perubahan unit hanya melalui edit aset atau hibah internal."
              : "Pilih ruang penempatan pada unit pengelola saat ini. Perubahan unit hanya melalui edit aset atau hibah internal."}
          </FieldHelper>
          <FormFieldError message={fieldErrors.locationId} />

          {!asset.unitId ? (
            <p className="text-sm text-amber-700">Unit pengelola belum ditentukan. Atur unit terlebih dahulu lewat edit aset.</p>
          ) : locationOptions.length === 0 ? (
            <p className="text-sm text-amber-700">
              Belum ada master lokasi kategori {placementLabel.toLowerCase()} untuk unit ini. Tambahkan di Master Data / Lokasi.
            </p>
          ) : null}

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Catatan perubahan (opsional)</span>
            <textarea
              name="placementNote"
              value={placementNote}
              onChange={(event) => setPlacementNote(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
              placeholder="Alasan atau keterangan pemindahan lokasi"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!asset.unitId || locationOptions.length === 0}
            className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Simpan lokasi
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type AssetQuickPlacementButtonProps = {
  asset: AssetQuickPlacementDialogProps["asset"];
  locations: LocationOption[];
  returnPath: string;
};

export function AssetQuickPlacementButton({ asset, locations, returnPath }: AssetQuickPlacementButtonProps) {
  const [open, setOpen] = useState(false);

  if (
    isFinalDisposalAssetStatus(asset.status) ||
    asset.ownershipLevel !== "keuskupan" ||
    !usesMasterDataPlacementLocation(asset.assetType)
  ) {
    return null;
  }

  const placementLabel = getPlacementLocationFieldLabel(asset.assetType);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        title={`Pindah ${asset.assetType === "kendaraan" ? "Garasi" : "Ruang"}`}
      >
        <MapPin className="h-4 w-4" />
      </button>
      <AssetQuickPlacementDialog
        asset={asset}
        locations={locations}
        returnPath={returnPath}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
