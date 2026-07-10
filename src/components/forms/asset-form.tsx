"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { AssetAttachmentsField } from "@/components/forms/asset-attachments-field";
import { BuildingLandPicker } from "@/components/forms/building-land-picker";
import { MapPicker } from "@/components/maps/map-picker";
import { FieldHint } from "@/components/ui/field-hint";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FieldHelper, FormErrorSummary, RequiredFieldsNote, RequiredMark, SubmitButton, useDirtyFlag } from "@/components/ui/form-ux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect, lookupToSelectOptions, pairsToSelectOptions } from "@/components/ui/form-select";
import { useZodForm } from "@/hooks/use-zod-form";
import { assetBuildingCategoryOptions, getAssetBuildingCategory } from "@/lib/asset-building-categories";
import { assetItemCategories, assetItemCategoryOptions, getAssetItemCategory } from "@/lib/asset-item-categories";
import { assetVehicleCategories, assetVehicleCategoryOptions, getAssetVehicleCategory } from "@/lib/asset-vehicle-categories";
import {
  buildingConditionSelectPairs,
  itemConditionSelectPairs,
  vehicleConditionSelectPairs,
} from "@/lib/assets/condition-options";
import { inactiveAssetStatusDescription, isManuallyEditableAssetStatus, normalizeLegacyAssetStatus } from "@/lib/assets/status";
import { filterLocationsForAssetType } from "@/lib/assets/location-kind";
import { getPlacementLocationFieldLabel, requiresPlacementLocation } from "@/lib/assets/placement";
import type { DepreciationPreview } from "@/lib/depreciation";
import { assetStatusLabels, labelFromMap } from "@/lib/formatters";
import { assetCommonSchema } from "@/lib/validators/asset";
import { formatRupiah } from "@/lib/utils";

type LookupOption = {
  id: string;
  name: string;
  code?: string | null;
  email?: string;
  assetType?: string;
  unitId?: string;
  unitName?: string | null;
  unitCode?: string | null;
  locationKind?: string | null;
};

type AssetFormValues = Record<string, string | number | null | undefined | string[]> & {
  id?: string;
};

type AssetFieldErrors = Partial<Record<string, string>>;

type AssetFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  assetType: "tanah" | "bangunan" | "kendaraan" | "benda";
  values?: AssetFormValues;
  lookups: {
    units: LookupOption[];
    badanHukums: LookupOption[];
    assets: LookupOption[];
    landAssets: LookupOption[];
    users: LookupOption[];
    locations: LookupOption[];
    depreciationGroups: Array<{
      id: string;
      code: string;
      name: string;
      assetCategory: string;
    }>;
    assetStatuses: Array<{
      code: string;
      label: string;
    }>;
    formAssetStatuses: Array<{
      code: string;
      label: string;
    }>;
    buildingCategories: AssetCategoryOption[];
    vehicleCategories: AssetCategoryOption[];
    itemCategories: AssetCategoryOption[];
  };
  existingAttachments?: Array<{
    id: string;
    attachmentType: string;
    filePath: string;
    notes: string | null;
  }>;
  depreciationPreview?: DepreciationPreview | null;
};

type AssetCategoryOption = {
  id?: string;
  code: string;
  label: string;
  depreciationGroupCode: string;
  depreciationGroupLabel?: string | null;
  usefulLifeYears: number;
  ratePercent: string;
  examples?: string[] | null;
  allowedTypes?: string[] | null;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20";

const textareaClassName =
  "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20";

const assetTypeLabels = {
  tanah: "Tanah",
  bangunan: "Bangunan",
  kendaraan: "Kendaraan",
  benda: "Benda",
} as const;

const detailTabLabels = {
  tanah: "Detail tanah",
  bangunan: "Detail bangunan",
  kendaraan: "Detail kendaraan",
  benda: "Detail benda",
} as const;

const selectOptions = {
  ownershipLevel: [
    ["keuskupan", "Keuskupan"],
    ["badan_hukum", "Badan Hukum"],
  ],
  landLegalStatus: [
    ["milik sendiri", "Milik sendiri"],
    ["sewa kontrak", "Sewa kontrak"],
    ["pinjam pakai pihak ketiga", "Pinjam pakai pihak ketiga"],
    ["sengketa/perlu perhatian", "Sengketa / perlu perhatian"],
  ],
  landUse: [
    ["gereja/rumah ibadah utama", "Gereja / rumah ibadah utama"],
    ["kapel/stasi", "Kapel / stasi"],
    ["pastoran/wisma pastur", "Pastoran / wisma pastur"],
    ["sekolah/pendidikan", "Sekolah / pendidikan"],
    ["pemakaman", "Pemakaman"],
    ["klinik/rumah sakit", "Klinik / rumah sakit"],
    ["panti asuhan/sosial", "Panti asuhan / sosial"],
    ["tanah kosong/idle", "Tanah kosong / idle"],
    ["gedung komersial/sewaan", "Gedung komersial / sewaan"],
    ["lainnya", "Lainnya"],
  ],
  buildingPermitType: [
    ["IMB", "IMB"],
    ["PBG", "PBG"],
    ["izin lainnya", "Izin lainnya"],
    ["belum ada izin/proses", "Belum ada izin / proses"],
  ],
  buildingStructureType: [
    ["beton", "Beton"],
    ["baja", "Baja"],
    ["kayu", "Kayu"],
    ["bata", "Bata"],
    ["campuran", "Campuran"],
    ["lainnya", "Lainnya"],
  ],
  buildingLegalOwnerType: [
    ["PGDP (Kuria/Paroki)", "PGDP (Kuria / Paroki)"],
    ["Keuskupan Surabaya (Pusat)", "Keuskupan Surabaya (Pusat)"],
    ["Yayasan Keuskupan", "Yayasan Keuskupan"],
    ["Pribadi Pastor/Imam", "Pribadi Pastor / Imam"],
    ["Pribadi Umat/Donatur", "Pribadi Umat / Donatur"],
    ["belum bersertifikat", "Belum bersertifikat"],
    ["lainnya", "Lainnya"],
  ],
  buildingWaterSource: [
    ["PDAM", "PDAM"],
    ["sumur bor dalam", "Sumur bor dalam"],
    ["sumur gali tradisional", "Sumur gali tradisional"],
    ["pasokan tandon luar/tangki", "Pasokan tandon luar / tangki"],
    ["lainnya", "Lainnya"],
  ],
  buildingType: [
    ["gereja/rumah ibadah utama", "Gereja / rumah ibadah utama"],
    ["kapel/stasi", "Kapel / stasi"],
    ["pastoran/wisma pastur", "Pastoran / wisma pastur"],
    ["sekolah/pendidikan", "Sekolah / pendidikan"],
    ["kantor sekretariat/kuria", "Kantor sekretariat / kuria"],
    ["aula paroki/serbaguna", "Aula paroki / serbaguna"],
    ["klinik/rumah sakit", "Klinik / rumah sakit"],
    ["panti asuhan/sosial", "Panti asuhan / sosial"],
    ["rumah tinggal karyawan", "Rumah tinggal karyawan"],
    ["gedung komersial/sewaan", "Gedung komersial / sewaan"],
    ["lainnya", "Lainnya"],
  ],
  acquisitionMethod: [
    ["pembelian/transaksi komersial", "Pembelian / transaksi komersial"],
    ["hibah/donasi umat", "Hibah / donasi umat"],
    ["warisan", "Warisan"],
    ["tukar guling", "Tukar guling"],
    ["lainnya", "Lainnya"],
  ],
  disputeStatus: [
    ["aman/tidak ada sengketa", "Aman / tidak ada sengketa"],
    ["dalam sengketa hukum/pengadilan", "Dalam sengketa hukum / pengadilan"],
  ],
  vehicleCategory: [
    ...assetVehicleCategoryOptions,
  ],
  vehicleDocumentCompletenessStatus: [
    ["lengkap", "Lengkap"],
    ["sebagian", "Sebagian"],
    ["belum lengkap", "Belum lengkap"],
  ],
  vehicleTaxStatus: [
    ["aktif", "Aktif"],
    ["menunggak", "Menunggak"],
    ["dibayar lunas", "Dibayar lunas"],
  ],
  vehicleOperationalStatus: [
    ["aktif", "Aktif"],
    ["tidak aktif", "Tidak aktif"],
    ["cadangan", "Cadangan"],
    ["dalam perbaikan", "Dalam perbaikan"],
  ],
  itemCategory: assetItemCategoryOptions,
  itemDocumentStatus: [
    ["lengkap", "Lengkap"],
    ["sebagian", "Sebagian"],
    ["belum ada", "Belum ada"],
  ],
};

const ASSET_CONDITION_HELPER = "Mencatat kondisi fisik aset. Perubahan disimpan di riwayat kondisi fisik.";
const ASSET_STATUS_HELPER =
  "Mencatat status operasional atau lifecycle aset (aktif, dipinjamkan, maintenance). Penghapusan atau keluar inventori hanya melalui menu Disposal.";
const INACTIVE_STATUS_HELPER = inactiveAssetStatusDescription;

type AssetOperationalFieldContext = {
  lookups: AssetFormProps["lookups"];
  values?: AssetFormValues;
  statusEditable: boolean;
  currentAssetStatus: string;
  fieldErrors: AssetFieldErrors;
  clearFieldError: (name: string) => void;
};

function normalizeFieldValue(value?: string | number | string[] | null) {
  return Array.isArray(value) ? undefined : value;
}

function selectField(
  name: string,
  label: string,
  options: ReadonlyArray<readonly string[] | string[]>,
  defaultValue?: string | number | string[] | null,
  placeholder = "Pilih"
) {
  return (
    <FormSelect
      name={name}
      label={label}
      options={pairsToSelectOptions(options as any)}
      defaultValue={normalizeFieldValue(defaultValue)}
      placeholder={placeholder}
    />
  );
}

type AssetPlacementFieldContext = {
  assetType: string;
  selectedUnitId: string;
  locationOptions: Array<{ id: string; name: string; code?: string | null }>;
  locationId?: string | null;
};

function AssetOperationalStatusFields({
  ctx,
  placement,
}: {
  ctx: AssetOperationalFieldContext;
  placement?: AssetPlacementFieldContext;
}) {
  const normalizedCurrentStatus = normalizeLegacyAssetStatus(ctx.currentAssetStatus);
  const [status, setStatus] = useState(() => String(normalizeFieldValue(ctx.values?.status) ?? normalizedCurrentStatus));
  const [statusNote, setStatusNote] = useState(() => String(ctx.values?.statusNote ?? ""));
  const borrowerNoteRequired = status === "on_loan" && status !== normalizedCurrentStatus;
  const effectiveStatus = ctx.statusEditable ? status : normalizedCurrentStatus;
  const placementLabel = placement ? getPlacementLocationFieldLabel(placement.assetType) : "";
  const placementRequired = placement ? requiresPlacementLocation(placement.assetType, effectiveStatus) : false;

  return (
    <div className="space-y-2">
      <input type="hidden" name="currentStatus" value={ctx.currentAssetStatus} />
      {ctx.statusEditable ? (
        <FormSelect
          name="status"
          label="Status operasional aset"
          options={pairsToSelectOptions(ctx.lookups.formAssetStatuses.map((item) => [item.code, item.label]))}
          value={status}
          onChange={(value) => {
            setStatus(value);
            ctx.clearFieldError("status");
            ctx.clearFieldError("statusNote");
            ctx.clearFieldError("locationId");
          }}
          placeholder="Pilih status"
        />
      ) : (
        <>
          <input type="hidden" name="status" value={ctx.currentAssetStatus} />
          <div className="space-y-2 text-sm font-medium text-slate-700">
            <span>Status operasional aset</span>
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
              {labelFromMap(ctx.currentAssetStatus, assetStatusLabels)}
            </div>
            <FieldHelper>Status ini dikelola oleh proses disposal dan tidak dapat diubah manual.</FieldHelper>
          </div>
        </>
      )}
      {ctx.statusEditable ? <FieldHelper>{ASSET_STATUS_HELPER}</FieldHelper> : null}
      {ctx.statusEditable && status === "inactive" ? <FieldHelper>{INACTIVE_STATUS_HELPER}</FieldHelper> : null}
      <FormFieldError message={ctx.fieldErrors.status} />

      {placement ? (
        <FormSelect
          key={placement.selectedUnitId}
          name="locationId"
          label={placementLabel}
          options={lookupToSelectOptions(placement.locationOptions)}
          defaultValue={
            placement.selectedUnitId &&
            placement.locationOptions.some((location) => location.id === placement.locationId)
              ? normalizeFieldValue(placement.locationId)
              : ""
          }
          placeholder={
            placement.selectedUnitId ? `Pilih ${placementLabel.toLowerCase()}` : "Pilih unit pengelola di data umum terlebih dahulu"
          }
          emptyOptionLabel={
            placement.selectedUnitId ? `Pilih ${placementLabel.toLowerCase()}` : "Pilih unit pengelola di data umum terlebih dahulu"
          }
          disabled={!placement.selectedUnitId}
          required={placementRequired}
          error={ctx.fieldErrors.locationId}
          helperText={
            placementRequired
              ? placement.assetType === "kendaraan"
                ? "Pilih garasi atau area parkir dari master lokasi unit pengelola."
                : "Pilih ruang penempatan dari master lokasi unit pengelola."
              : "Opsional saat status non-aktif. Wajib diisi jika status aset aktif."
          }
          onChange={() => ctx.clearFieldError("locationId")}
        />
      ) : null}

      {ctx.statusEditable ? (
        status === "on_loan" ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>
              Dipinjamkan kepada {borrowerNoteRequired ? <RequiredMark /> : null}
            </span>
            <input
              name="statusNote"
              value={statusNote}
              onChange={(event) => {
                setStatusNote(event.target.value);
                ctx.clearFieldError("statusNote");
              }}
              className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-slate-950/20 ${
                ctx.fieldErrors.statusNote ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 focus:border-slate-400"
              }`}
              placeholder="Nama unit, paroki, atau pihak peminjam"
              aria-invalid={Boolean(ctx.fieldErrors.statusNote)}
            />
            <FieldHelper>
              {normalizedCurrentStatus === "on_loan"
                ? "Perubahan peminjam disimpan di riwayat peminjaman."
                : "Catatan ini disimpan di riwayat status dan peminjaman."}
            </FieldHelper>
            <FormFieldError message={ctx.fieldErrors.statusNote} />
          </label>
        ) : (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Catatan perubahan status (opsional)</span>
            <textarea
              name="statusNote"
              value={statusNote}
              onChange={(event) => {
                setStatusNote(event.target.value);
                ctx.clearFieldError("statusNote");
              }}
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
              placeholder="Alasan atau keterangan tambahan perubahan status"
            />
          </label>
        )
      ) : null}
    </div>
  );
}

function AssetConditionNoteField({ ctx }: { ctx: AssetOperationalFieldContext }) {
  const [conditionNote, setConditionNote] = useState(() => String(ctx.values?.conditionNote ?? ""));

  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>Catatan perubahan kondisi fisik (opsional)</span>
      <textarea
        name="conditionNote"
        value={conditionNote}
        onChange={(event) => {
          setConditionNote(event.target.value);
          ctx.clearFieldError("conditionNote");
        }}
        className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
        placeholder="Alasan atau keterangan perubahan kondisi fisik"
      />
    </label>
  );
}

function wrapConditionField(field: ReactNode) {
  return (
    <div className="space-y-2">
      {field}
      <FieldHelper>{ASSET_CONDITION_HELPER}</FieldHelper>
    </div>
  );
}

function lookupSelectField(
  name: string,
  label: string,
  items: LookupOption[],
  defaultValue?: string | number | string[] | null,
  placeholder = "-",
  formatLabel?: (item: LookupOption) => string
) {
  const normalizedDefault = Array.isArray(defaultValue) ? defaultValue[0] : defaultValue;

  return (
    <FormSelect
      name={name}
      label={label}
      options={lookupToSelectOptions(items, formatLabel)}
      defaultValue={normalizedDefault}
      placeholder={placeholder}
      emptyOptionLabel={placeholder}
    />
  );
}

function inputField(
  name: string,
  label: string,
  defaultValue?: string | number | string[] | null,
  placeholder?: string,
  type = "text"
) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={normalizeFieldValue(defaultValue) ?? ""}
        className={fieldClassName}
        placeholder={placeholder}
      />
    </label>
  );
}

function textareaField(
  name: string,
  label: string,
  defaultValue?: string | number | string[] | null,
  placeholder?: string
) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={normalizeFieldValue(defaultValue) ?? ""}
        className={textareaClassName}
        placeholder={placeholder}
      />
    </label>
  );
}

function scalarValue(values: AssetFormValues | undefined, key: string) {
  return normalizeFieldValue(values?.[key]);
}

function relationSection(title: string, prefix: string, lookups: AssetFormProps["lookups"], values?: AssetFormValues) {
  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="text-sm text-slate-600">Isi relasi bila ada keterkaitan organisasi.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {lookupSelectField(`${prefix}UnitId`, "Unit", lookups.units, scalarValue(values, `${prefix}UnitId`))}
        {lookupSelectField(`${prefix}BadanHukumId`, "Badan hukum", lookups.badanHukums, scalarValue(values, `${prefix}BadanHukumId`))}
        {lookupSelectField(`${prefix}UserId`, "User", lookups.users, scalarValue(values, `${prefix}UserId`), "-", (user) =>
          user.email ? `${user.name} (${user.email})` : user.name
        )}
        {textareaField(`${prefix}Notes`, "Catatan", scalarValue(values, `${prefix}Notes`), "Keterangan relasi")}
      </div>
    </section>
  );
}

function coretaxSection(values?: AssetFormValues) {
  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">
          Coretax
          <FieldHint text="Field pemetaan pelaporan pajak ke sistem Coretax DJP. Isi sesuai data SPT yang akan dilaporkan." />
        </h3>
        <p className="text-sm text-slate-600">Pemetaan field pelaporan pajak / Coretax untuk aset ini.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {inputField("coretaxAssetType", "Jenis harta Coretax", scalarValue(values, "coretaxAssetType"))}
        {inputField("coretaxAssetCode", "Kode harta Coretax", scalarValue(values, "coretaxAssetCode"))}
        {inputField("coretaxAssetClassType", "Tipe golongan harta", scalarValue(values, "coretaxAssetClassType"))}
        {inputField("coretaxOwnershipSource", "Sumber kepemilikan", scalarValue(values, "coretaxOwnershipSource"))}
        {inputField("coretaxSptOwnerName", "Nama pemilik terdaftar SPT", scalarValue(values, "coretaxSptOwnerName"))}
        {textareaField("coretaxTaxNotes", "Keterangan tambahan pajak", scalarValue(values, "coretaxTaxNotes"))}
        {textareaField("coretaxAuditNotes", "Catatan audit", scalarValue(values, "coretaxAuditNotes"))}
      </div>
    </section>
  );
}

function attachmentSection(existingAttachments: AssetFormProps["existingAttachments"]) {
  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">Lampiran</h3>
        <p className="text-sm text-slate-600">Unggah dokumen pendukung aset. Bisa lebih dari satu file.</p>
      </div>
      <AssetAttachmentsField existing={existingAttachments} />
    </section>
  );
}

function depreciationSection(
  assetType: AssetFormProps["assetType"],
  lookups: AssetFormProps["lookups"],
  values?: AssetFormValues,
  preview?: DepreciationPreview | null,
  selectedItemCategory?: string,
  selectedBuildingCategory?: string,
  selectedVehicleCategory?: string
) {
  const categoryGroups = lookups.depreciationGroups.filter((group) => group.assetCategory === assetType);
  const selectedCategory = assetType === "benda" ? lookups.itemCategories.find((category) => category.code === selectedItemCategory) ?? null : null;
  const selectedBuilding = assetType === "bangunan" ? lookups.buildingCategories.find((category) => category.code === selectedBuildingCategory) ?? null : null;
  const selectedVehicle = assetType === "kendaraan" ? lookups.vehicleCategories.find((category) => category.code === selectedVehicleCategory) ?? null : null;
  const mappedGroup = selectedCategory
    ? categoryGroups.find((group) => group.code === selectedCategory.depreciationGroupCode)
    : selectedBuilding
      ? categoryGroups.find((group) => group.code === selectedBuilding.depreciationGroupCode)
      : selectedVehicle
        ? categoryGroups.find((group) => group.code === selectedVehicle.depreciationGroupCode)
    : null;
  const storedGroup = categoryGroups.find((group) => group.id === scalarValue(values, "depreciationGroupId"));
  const defaultGroup = categoryGroups.find((group) => group.code === "building-permanent") ?? categoryGroups[0] ?? null;
  const displayGroup = mappedGroup ?? storedGroup ?? defaultGroup;

  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">
          Depresiasi fiskal
          <FieldHint text="Perhitungan mengikuti master pajak. Perubahan regulasi menambah histori baru tanpa menimpa data lama." />
        </h3>
        <p className="text-sm text-slate-600">
          Perhitungan mengikuti master pajak aktif. Perubahan regulasi menambah histori baru tanpa menimpa data lama.
        </p>
      </div>

      {assetType === "tanah" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
            Tanah tidak disusutkan — nilai buku sama dengan nilai perolehan.
          </div>
        </div>
      ) : displayGroup ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Sumber</div>
            <div className="font-medium text-slate-900">{selectedCategory?.label ?? selectedBuilding?.label ?? selectedVehicle?.label ?? assetTypeLabels[assetType]}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Kelompok fiskal</div>
            <div className="font-medium text-slate-900">{displayGroup.name}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Kode</div>
            <div className="font-medium text-slate-900">{displayGroup.code}</div>
          </div>
          {selectedCategory ? (
            <>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Kelompok</div>
                <div className="font-medium text-slate-900">{selectedCategory.depreciationGroupLabel}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Masa manfaat</div>
                <div className="font-medium text-slate-900">{selectedCategory.usefulLifeYears} tahun</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Tarif</div>
                <div className="font-medium text-slate-900">{selectedCategory.ratePercent}%</div>
              </div>
            </>
          ) : null}
          {selectedBuilding ? (
            <>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Masa manfaat</div>
                <div className="font-medium text-slate-900">{selectedBuilding.usefulLifeYears} tahun</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Kategori</div>
                <div className="font-medium text-slate-900">{selectedBuilding.label}</div>
              </div>
            </>
          ) : null}
          {selectedVehicle ? (
            <>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Kelompok</div>
                <div className="font-medium text-slate-900">{selectedVehicle.depreciationGroupLabel}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Masa manfaat</div>
                <div className="font-medium text-slate-900">{selectedVehicle.usefulLifeYears} tahun</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Tarif</div>
                <div className="font-medium text-slate-900">{selectedVehicle.ratePercent}%</div>
              </div>
            </>
          ) : null}
        </div>
      ) : assetType === "kendaraan" ? (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Pilih kategori kendaraan di tab Umum untuk melihat kelompok fiskal dan masa manfaatnya.
        </div>
      ) : assetType === "benda" ? (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Pilih kategori benda di tab Umum untuk melihat kelompok fiskal dan masa manfaatnya.
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Belum ada kelompok fiskal aktif untuk jenis aset ini. Atur di Pengaturan - Master Pajak.
        </div>
      )}

      {preview ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Kelompok fiskal</div>
            <div className="font-medium text-slate-900">{preview.groupName}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Metode</div>
            <div className="font-medium text-slate-900">{preview.method}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Umur manfaat</div>
            <div className="font-medium text-slate-900">{preview.usefulLifeYears} tahun</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Tarif</div>
            <div className="font-medium text-slate-900">{preview.ratePercent}%</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Dasar susut</div>
            <div className="font-medium text-slate-900">{formatRupiah(preview.depreciableBase)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Depresiasi tahunan</div>
            <div className="font-medium text-slate-900">{formatRupiah(preview.annualDepreciation)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Nilai buku</div>
            <div className="font-medium text-slate-900">{formatRupiah(preview.bookValue)}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          Preview akan muncul setelah nilai perolehan disimpan dan kelompok fiskal dipilih.
        </div>
      )}
    </section>
  );
}

const sectionClassName = "space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

function relationsTabContent(lookups: AssetFormProps["lookups"], values?: AssetFormValues) {
  return (
    <div className="space-y-6">
      {relationSection("Dibiayai oleh", "financedBy", lookups, values)}
      {relationSection("Dipakai oleh", "usedBy", lookups, values)}
      {relationSection("Dimiliki oleh", "ownedBy", lookups, values)}
      {relationSection("Diinput oleh", "inputtedBy", lookups, values)}
    </div>
  );
}

function toInitialPositiveInteger(value?: string | number | string[] | null) {
  const normalized = normalizeFieldValue(value);
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
}

function formatAreaTotal(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  return Number(value.toFixed(2)).toString();
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findCategoryRecommendations<T extends { label: string; examples?: string[] | null; allowedTypes?: string[] | null }>(
  query: string,
  categories: T[],
  getExtraTerms: (category: T) => string[] = () => []
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const queryWords = normalizedQuery.split(" ").filter(Boolean);

  return categories
    .map((category) => {
      const searchable = normalizeSearchText([
        category.label,
        ...(category.examples ?? []),
        ...(category.allowedTypes ?? []),
        ...getExtraTerms(category),
      ].join(" "));
      const searchableWords = new Set(searchable.split(" ").filter(Boolean));
      const exactPhraseScore = searchable.includes(normalizedQuery) ? queryWords.length + 1 : 0;
      const wordScore = queryWords.reduce((total, word) => total + (searchableWords.has(word) ? 1 : 0), 0);
      const score = exactPhraseScore + wordScore;

      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.category.label.localeCompare(b.category.label, "id"));
}

function ItemCategoryField({
  selectedCategory,
  onSelectedCategoryChange,
  categories,
}: {
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  categories: AssetCategoryOption[];
}) {
  const [itemNameQuery, setItemNameQuery] = useState("");
  const recommendations = findCategoryRecommendations(itemNameQuery, categories);

  return (
    <div className="space-y-4 md:col-span-2">
      <FormSelect
        name="itemCategory"
        label="Kategori benda"
        options={pairsToSelectOptions(categories.map((category) => [category.code, category.label] as const))}
        value={selectedCategory}
        onChange={onSelectedCategoryChange}
        placeholder="Pilih kategori benda"
        emptyOptionLabel="Pilih kategori benda"
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Bantuan cari kategori</span>
          <input
            type="search"
            value={itemNameQuery}
            onChange={(event) => setItemNameQuery(event.target.value)}
            className={fieldClassName}
            placeholder="Ketik nama barang, misal: blower, piala, kursi kantor"
          />
        </label>

        {recommendations.length > 0 ? (
          <div className="mt-3 space-y-2">
            {recommendations.map(({ category }) => (
              <div key={category.code} className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{category.label}</p>
                  <p className="text-xs text-slate-600">
                    {category.depreciationGroupLabel ?? "Kelompok fiskal"} - masa manfaat {category.usefulLifeYears} tahun
                  </p>
                  <p className="text-xs text-slate-500">
                    Contoh: {(category.examples ?? []).slice(0, 4).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectedCategoryChange(category.code)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  Gunakan kategori
                </button>
              </div>
            ))}
          </div>
        ) : itemNameQuery.trim() ? (
          <p className="mt-3 text-sm text-slate-600">Belum ada pairing yang cocok. Pilih kategori manual dari daftar.</p>
        ) : null}
      </div>
    </div>
  );
}

function VehicleCategoryField({
  selectedCategory,
  onSelectedCategoryChange,
  categories,
}: {
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  categories: AssetCategoryOption[];
}) {
  const [vehicleQuery, setVehicleQuery] = useState("");
  const recommendations = findCategoryRecommendations(vehicleQuery, categories);

  return (
    <div className="space-y-4 md:col-span-2">
      <FormSelect
        name="vehicleCategory"
        label="Kategori kendaraan"
        options={pairsToSelectOptions(categories.map((category) => [category.code, category.label] as const))}
        value={selectedCategory}
        onChange={onSelectedCategoryChange}
        placeholder="Pilih kategori kendaraan"
        emptyOptionLabel="Pilih kategori kendaraan"
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Bantuan cari kategori kendaraan</span>
          <input
            type="search"
            value={vehicleQuery}
            onChange={(event) => setVehicleQuery(event.target.value)}
            className={fieldClassName}
            placeholder="Ketik jenis kendaraan, misal: motor, pickup, bus"
          />
        </label>

        {recommendations.length > 0 ? (
          <div className="mt-3 space-y-2">
            {recommendations.map(({ category }) => (
              <div key={category.code} className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{category.label}</p>
                  <p className="text-xs text-slate-600">
                    {category.depreciationGroupLabel ?? "Kelompok fiskal"} - masa manfaat {category.usefulLifeYears} tahun
                  </p>
                  <p className="text-xs text-slate-500">
                    Contoh: {(category.examples ?? []).slice(0, 4).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectedCategoryChange(category.code)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  Gunakan kategori
                </button>
              </div>
            ))}
          </div>
        ) : vehicleQuery.trim() ? (
          <p className="mt-3 text-sm text-slate-600">Belum ada pairing yang cocok. Pilih kategori manual dari daftar.</p>
        ) : null}
      </div>
    </div>
  );
}

function BuildingCategoryAndTypeFields({
  selectedCategory,
  selectedType,
  onSelectedCategoryChange,
  onSelectedTypeChange,
  categories,
}: {
  selectedCategory: string;
  selectedType: string;
  onSelectedCategoryChange: (value: string) => void;
  onSelectedTypeChange: (value: string) => void;
  categories: AssetCategoryOption[];
}) {
  const category = categories.find((item) => item.code === selectedCategory) ?? categories[0] ?? null;
  const typeOptions = (category?.allowedTypes ?? []).map((type) => [type, type] as const);
  const [buildingQuery, setBuildingQuery] = useState("");
  const recommendations = findCategoryRecommendations(buildingQuery, categories);

  function applyCategory(categoryCode: string) {
    const nextCategory = categories.find((item) => item.code === categoryCode);
    onSelectedCategoryChange(categoryCode);

    if (nextCategory && !(nextCategory.allowedTypes ?? []).includes(selectedType)) {
      onSelectedTypeChange(nextCategory.allowedTypes?.[0] ?? "");
    }
  }

  return (
    <>
      <FormSelect
        name="buildingCategory"
        label="Kategori bangunan"
        options={pairsToSelectOptions(categories.map((category) => [category.code, category.label] as const))}
        value={selectedCategory}
        onChange={applyCategory}
        placeholder="Pilih kategori bangunan"
        emptyOptionLabel="Pilih kategori bangunan"
      />
      <FormSelect
        key={selectedCategory}
        name="buildingType"
        label="Jenis bangunan"
        options={pairsToSelectOptions(typeOptions)}
        value={selectedType}
        onChange={onSelectedTypeChange}
        placeholder="Pilih jenis bangunan"
        emptyOptionLabel="Pilih jenis bangunan"
      />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Bantuan cari kategori bangunan</span>
          <input
            type="search"
            value={buildingQuery}
            onChange={(event) => setBuildingQuery(event.target.value)}
            className={fieldClassName}
            placeholder="Ketik jenis bangunan, misal: gereja, aula, gazebo, kayu"
          />
        </label>

        {recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.map(({ category }) => (
              <div key={category.code} className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{category.label}</p>
                  <p className="text-xs text-slate-600">Masa manfaat {category.usefulLifeYears} tahun</p>
                  <p className="text-xs text-slate-500">Jenis: {(category.allowedTypes ?? []).slice(0, 4).join(", ")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => applyCategory(category.code)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  Gunakan kategori
                </button>
              </div>
            ))}
          </div>
        ) : buildingQuery.trim() ? (
          <p className="text-sm text-slate-600">Belum ada pairing yang cocok. Pilih kategori manual dari daftar.</p>
        ) : null}
      </div>
    </>
  );
}

function BuildingFloorAreasEditor({
  defaultFloorCount,
  defaultTotalArea,
}: {
  defaultFloorCount?: string | number | string[] | null;
  defaultTotalArea?: string | number | string[] | null;
}) {
  const initialFloorCount = toInitialPositiveInteger(defaultFloorCount);
  const [floorAreas, setFloorAreas] = useState<string[]>(() => Array.from({ length: initialFloorCount }, () => ""));
  const [manualTotalArea, setManualTotalArea] = useState(() => String(normalizeFieldValue(defaultTotalArea) ?? ""));
  const filledAreaTotal = useMemo(
    () =>
      floorAreas.reduce((sum, area) => {
        const parsed = Number(area);
        return Number.isFinite(parsed) && parsed > 0 ? sum + parsed : sum;
      }, 0),
    [floorAreas]
  );
  const hasFloorAreaInput = floorAreas.some((area) => area.trim().length > 0);
  const submittedTotalArea = hasFloorAreaInput ? formatAreaTotal(filledAreaTotal) : manualTotalArea;

  function updateFloorArea(index: number, value: string) {
    setFloorAreas((current) => current.map((area, itemIndex) => (itemIndex === index ? value : area)));
  }

  return (
    <div className="space-y-4 md:col-span-2">
      <input type="hidden" name="buildingFloorCount" value={floorAreas.length} />
      <input type="hidden" name="buildingAreaSquareMeters" value={submittedTotalArea} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Jumlah lantai</span>
          <input value={floorAreas.length} readOnly className={fieldClassName} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Total luas bangunan (m2)</span>
          <input
            value={submittedTotalArea}
            onChange={(event) => setManualTotalArea(event.target.value)}
            disabled={hasFloorAreaInput}
            inputMode="decimal"
            className={fieldClassName}
            placeholder="0.00"
          />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Luas per lantai</h4>
            <p className="text-xs text-slate-600">Isi luas tiap lantai untuk menghitung total luas bangunan otomatis.</p>
          </div>
          <button
            type="button"
            onClick={() => setFloorAreas((current) => [...current, ""])}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tambah lantai
          </button>
        </div>

        <div className="space-y-2">
          {floorAreas.map((area, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[120px_1fr_auto]">
              <div className="flex h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-700">
                Lantai {index + 1}
              </div>
              <input
                value={area}
                onChange={(event) => updateFloorArea(index, event.target.value)}
                inputMode="decimal"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-950/20"
                placeholder="Luas lantai (m2)"
              />
              <button
                type="button"
                onClick={() => setFloorAreas((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current))}
                disabled={floorAreas.length <= 1}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderLandLegalSection(values: AssetFormValues | undefined) {
  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">Legalitas tanah</h3>
        <p className="text-sm text-slate-600">Status kepemilikan dan sertifikat tanah.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {selectField("legalStatus", "Status legalitas", selectOptions.landLegalStatus, values?.legalStatus)}
        {inputField("ownerName", "Pemilik aset / legalitas PGDP", values?.ownerName, "Nama pemilik legal")}
        {selectField(
          "landCertificateType",
          "Jenis sertifikat",
          [
            ["SHM", "SHM"],
            ["SHGB", "SHGB"],
            ["Girik/Surat Ijo", "Girik / Surat Ijo"],
            ["Letter C/Petok D", "Letter C / Petok D"],
            ["lainnya/belum bersertifikat", "Lainnya / belum bersertifikat"],
          ],
          values?.landCertificateType
        )}
        {inputField("landCertificateNumber", "Nomor sertifikat", values?.landCertificateNumber)}
        {inputField("landCertificateHolderName", "Nama di sertifikat", values?.landCertificateHolderName)}
        {inputField("landCertificateIssuedAt", "Tanggal terbit sertifikat", values?.landCertificateIssuedAt, undefined, "date")}
        {inputField("landCertificateExpiredAt", "Tanggal kadaluarsa sertifikat", values?.landCertificateExpiredAt, undefined, "date")}
        {inputField("landIssuingInstitution", "Instansi penerbit", values?.landIssuingInstitution)}
        {selectField(
          "landLegalOwnerType",
          "Jenis pemilik legal",
          [
            ["PGDP (Kuria/Paroki)", "PGDP (Kuria / Paroki)"],
            ["Keuskupan Surabaya (Pusat)", "Keuskupan Surabaya (Pusat)"],
            ["Yayasan Keuskupan", "Yayasan Keuskupan"],
            ["Pribadi Pastor/Imam", "Pribadi Pastor / Imam"],
            ["Pribadi Umat/Donatur", "Pribadi Umat / Donatur"],
            ["belum bersertifikat", "Belum bersertifikat"],
            ["lainnya", "Lainnya"],
          ],
          values?.landLegalOwnerType
        )}
        {inputField("landActualOwnerName", "Nama pemilik aktual", values?.landActualOwnerName)}
      </div>
    </section>
  );
}

function renderLandFinanceBoundarySection(
  values: AssetFormValues | undefined,
  fieldErrors: AssetFieldErrors,
  clearFieldError: (name: string) => void
) {
  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">Keuangan &amp; batas fisik</h3>
        <p className="text-sm text-slate-600">Nilai perolehan, appraisal, pajak, dan status sengketa.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Harga Perolehan (Harga Beli)</span>
          <input
            name="acquisitionValue"
            type="text"
            inputMode="decimal"
            defaultValue={normalizeFieldValue(values?.acquisitionValue) ?? ""}
            onChange={() => clearFieldError("acquisitionValue")}
            className={`${fieldClassName} ${fieldErrors.acquisitionValue ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
            placeholder="Rp 0"
            aria-invalid={Boolean(fieldErrors.acquisitionValue)}
          />
          <FormFieldError message={fieldErrors.acquisitionValue} />
        </label>
        {inputField("acquisitionDate", "Tanggal Perolehan (Tanggal Beli)", values?.acquisitionDate, "dd/mm/yyyy", "date")}
        {inputField("landLastNjopValue", "Nilai NJOP", values?.landLastNjopValue, "Rp 0")}
        {inputField("landAppraisalValue", "Nilai Pasar Appraisal", values?.landAppraisalValue, "Rp 0")}
        {inputField("landAppraisalDate", "Tanggal Penilaian Terakhir", values?.landAppraisalDate, "dd/mm/yyyy", "date")}
        {selectField(
          "landDisputeStatus",
          "Status Sengketa Hukum",
          [
            ["aman/tidak ada sengketa", "Aman (Tidak Sengketa)"],
            ["dalam sengketa hukum/pengadilan", "Dalam sengketa hukum / pengadilan"],
          ],
          values?.landDisputeStatus
        )}
        {inputField("landNopPbb", "NOP PBB", values?.landNopPbb, "35.78...")}
      </div>
    </section>
  );
}

function renderLandMapBoundarySection(values: AssetFormValues | undefined) {
  return (
    <div className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Batas tekstual sertifikat</h3>
          <p className="text-sm text-slate-600">
            Gunakan batas tekstual untuk mencatat keterangan sesuai sertifikat. Gunakan peta untuk mencatat titik pusat tanah dan patok batas secara koordinat.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("landBoundaryNorth", "Batas Utara", values?.landBoundaryNorth, "misal: Jalan Raya Darmo")}
          {inputField("landBoundaryEast", "Batas Timur", values?.landBoundaryEast, "misal: Tanah Kavling Paroki")}
          {inputField("landBoundarySouth", "Batas Selatan", values?.landBoundarySouth, "misal: Rumah Bpk. Slamet")}
          {inputField("landBoundaryWest", "Batas Barat", values?.landBoundaryWest, "misal: Sungai Kalimas")}
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Peta Interaktif &amp; Koordinat Patok Batas</h3>
          <p className="text-sm text-slate-600">Patok koordinat peta digunakan untuk informasi spasial/GIS berbasis OpenStreetMap.</p>
        </div>
        <MapPicker
          defaultLatitude={normalizeFieldValue(values?.landLatitude)}
          defaultLongitude={normalizeFieldValue(values?.landLongitude)}
          defaultPatoks={values?.landBoundaryPatokCoordinates}
          assetType="land"
        />
      </section>
    </div>
  );
}

function renderTypeSection(
  assetType: AssetFormProps["assetType"],
  values: AssetFormValues | undefined,
  lookups: AssetFormProps["lookups"],
  selectedItemCategory: string,
  onSelectedItemCategoryChange: (value: string) => void,
  selectedVehicleCategory: string,
  onSelectedVehicleCategoryChange: (value: string) => void,
  operationalCtx: AssetOperationalFieldContext,
  placementCtx?: AssetPlacementFieldContext
) {
  if (assetType === "tanah") {
    return null;
  }

  if (assetType === "bangunan") {
    return (
      <div className="space-y-6">
        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Identitas bangunan</h3>
            <p className="text-sm text-slate-600">Data khusus bangunan, terpisah dari alamat dan detail tanah.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inputField("buildingAddress", "Alamat bangunan", values?.buildingAddress, "Alamat bangunan")}
            {selectField("buildingType", "Jenis bangunan", selectOptions.buildingType, values?.buildingType)}
            {textareaField("buildingNotes", "Catatan tambahan bangunan", values?.buildingNotes)}
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Relasi tanah terkait</h3>
            <p className="text-sm text-slate-600">
              Pilih tanah tempat bangunan berdiri. Kosongkan jika bangunan berada di atas tanah pihak lain atau tanah belum tercatat sebagai aset.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {lookupSelectField(
              "buildingMainLandAssetId",
              "Tanah utama",
              lookups.landAssets.length > 0 ? lookups.landAssets : lookups.assets.filter((a) => a.assetType === "tanah"),
              values?.buildingMainLandAssetId,
              "Pilih tanah utama",
              (asset) => `${asset.code ? `${asset.code} - ` : ""}${asset.name}`
            )}
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Tanah terkait (bisa lebih dari satu)</span>
              <BuildingLandPicker
                landAssets={lookups.landAssets.length > 0 ? lookups.landAssets : lookups.assets.filter((a) => a.assetType === "tanah")}
                defaultSelected={Array.isArray(values?.buildingLandAssetIds) ? values.buildingLandAssetIds : []}
              />
            </label>
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Spesifikasi fisik</h3>
            <p className="text-sm text-slate-600">Luas, lantai, struktur, dan kondisi fisik bangunan.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inputField("buildingAreaSquareMeters", "Luas bangunan (m2)", values?.buildingAreaSquareMeters, "0.00")}
            {inputField("buildingFootprintAreaSquareMeters", "Luas tapak / footprint (m2)", values?.buildingFootprintAreaSquareMeters, "0.00")}
            {inputField("buildingFloorCount", "Jumlah lantai", values?.buildingFloorCount, "1", "number")}
            {inputField("buildingConstructionYear", "Tahun dibangun", values?.buildingConstructionYear, "2025", "number")}
            {inputField("buildingLastRenovationYear", "Tahun renovasi terakhir", values?.buildingLastRenovationYear, "2025", "number")}
            {selectField("buildingStructureType", "Struktur bangunan", selectOptions.buildingStructureType, values?.buildingStructureType)}
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">IMB/PBG</h3>
            <p className="text-sm text-slate-600">Data izin mendirikan bangunan atau persetujuan bangunan gedung.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {selectField("buildingPermitType", "Jenis izin", selectOptions.buildingPermitType, values?.buildingPermitType)}
            {inputField("buildingPermitNumber", "Nomor IMB/PBG", values?.buildingPermitNumber)}
            {inputField("buildingPermitIssuer", "Instansi penerbit", values?.buildingPermitIssuer)}
            {inputField("buildingPermitIssuedAt", "Tanggal terbit IMB/PBG", values?.buildingPermitIssuedAt, undefined, "date")}
            {inputField("buildingPermitExpiredAt", "Tanggal kadaluarsa IMB/PBG", values?.buildingPermitExpiredAt, undefined, "date")}
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">SLF</h3>
            <p className="text-sm text-slate-600">Data sertifikat laik fungsi bangunan.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inputField("buildingSlfNumber", "Nomor SLF", values?.buildingSlfNumber)}
            {inputField("buildingSlfIssuedAt", "Tanggal terbit SLF", values?.buildingSlfIssuedAt, undefined, "date")}
            {inputField("buildingSlfExpiredAt", "Masa berlaku SLF", values?.buildingSlfExpiredAt, undefined, "date")}
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Perolehan, sewa, utilitas</h3>
            <p className="text-sm text-slate-600">Field mengikuti schema bangunan yang sudah tersedia.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {selectField("buildingAcquisitionMethod", "Cara perolehan", selectOptions.acquisitionMethod, values?.buildingAcquisitionMethod)}
            {selectField("buildingDisputeStatus", "Status sengketa hukum", selectOptions.disputeStatus, values?.buildingDisputeStatus)}
            {inputField("buildingLeaseAgreementDocument", "Dokumen sewa/kerjasama", values?.buildingLeaseAgreementDocument)}
            {inputField("buildingElectricityCapacity", "Daya listrik", values?.buildingElectricityCapacity)}
            {selectField("buildingWaterSource", "Sumber air", selectOptions.buildingWaterSource, values?.buildingWaterSource)}
            {inputField("buildingParkingCapacity", "Kapasitas parkir", values?.buildingParkingCapacity)}
            {textareaField("buildingFacilities", "Fasilitas pendukung", values?.buildingFacilities)}
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Peta lokasi bangunan</h3>
            <p className="text-sm text-slate-600">Gunakan pin merah untuk titik pusat bangunan.</p>
          </div>
          <MapPicker
            defaultLatitude={normalizeFieldValue(values?.buildingLatitude)}
            defaultLongitude={normalizeFieldValue(values?.buildingLongitude)}
            assetType="building"
            latitudeName="buildingLatitude"
            longitudeName="buildingLongitude"
          />
        </section>
      </div>
    );
  }

  if (assetType === "kendaraan") {
    return (
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Detail kendaraan</h3>
          <p className="text-sm text-slate-600">Isi identitas kendaraan dan status legalitasnya.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <VehicleCategoryField
            selectedCategory={selectedVehicleCategory}
            onSelectedCategoryChange={onSelectedVehicleCategoryChange}
            categories={lookups.vehicleCategories}
          />
          {inputField("vehicleBrand", "Merek", values?.vehicleBrand)}
          {inputField("vehicleModel", "Tipe/model", values?.vehicleModel)}
          {inputField("vehicleManufactureYear", "Tahun pembuatan", values?.vehicleManufactureYear, "2025", "number")}
          {inputField("vehicleColor", "Warna", values?.vehicleColor)}
          {inputField("vehiclePlateNumber", "Nomor polisi", values?.vehiclePlateNumber)}
          {inputField("vehicleChassisNumber", "Nomor rangka", values?.vehicleChassisNumber)}
          {inputField("vehicleEngineNumber", "Nomor mesin", values?.vehicleEngineNumber)}
          {inputField("vehicleStnkNumber", "Nomor STNK", values?.vehicleStnkNumber)}
          {inputField("vehicleBpkbNumber", "Nomor BPKB", values?.vehicleBpkbNumber)}
          {selectField("vehicleDocumentCompletenessStatus", "Status dokumen", selectOptions.vehicleDocumentCompletenessStatus, values?.vehicleDocumentCompletenessStatus)}
          {inputField("vehicleStnkIssuedAt", "Tanggal terbit STNK", values?.vehicleStnkIssuedAt, undefined, "date")}
          {inputField("vehicleStnkExpiredAt", "Tanggal kadaluarsa STNK", values?.vehicleStnkExpiredAt, undefined, "date")}
          {inputField("vehicleLastTaxPaidAt", "Tanggal bayar pajak terakhir", values?.vehicleLastTaxPaidAt, undefined, "date")}
          {inputField("vehicleTaxDueAt", "Tanggal jatuh tempo pajak", values?.vehicleTaxDueAt, undefined, "date")}
          {selectField("vehicleTaxStatus", "Status pajak kendaraan", selectOptions.vehicleTaxStatus, values?.vehicleTaxStatus)}
          {inputField("vehicleIssuingInstitution", "Instansi penerbit", values?.vehicleIssuingInstitution)}
          {inputField("vehicleRegisteredOwnerName", "Nama di dokumen", values?.vehicleRegisteredOwnerName)}
          {inputField("vehicleInsurancePolicyNumber", "Nomor polis asuransi", values?.vehicleInsurancePolicyNumber)}
          {inputField("vehicleInsuranceValidUntil", "Masa berlaku asuransi", values?.vehicleInsuranceValidUntil, undefined, "date")}
          <input type="hidden" name="vehicleDomicileLocation" value={normalizeFieldValue(values?.vehicleDomicileLocation) ?? ""} />
          {wrapConditionField(selectField("vehicleCondition", "Kondisi kendaraan", vehicleConditionSelectPairs, values?.vehicleCondition))}
          <AssetOperationalStatusFields ctx={operationalCtx} placement={placementCtx} />
          <AssetConditionNoteField ctx={operationalCtx} />
          {selectField("vehicleOperationalStatus", "Status pakai kendaraan", selectOptions.vehicleOperationalStatus, values?.vehicleOperationalStatus)}
          {textareaField("vehicleNotes", "Catatan tambahan", values?.vehicleNotes)}
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClassName}>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">Detail benda</h3>
        <p className="text-sm text-slate-600">Isi klasifikasi dan bukti kepemilikan benda.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ItemCategoryField
          selectedCategory={selectedItemCategory}
          onSelectedCategoryChange={onSelectedItemCategoryChange}
          categories={lookups.itemCategories}
        />
        {textareaField("itemDescription", "Deskripsi benda", values?.itemDescription)}
        {inputField("itemBrand", "Merek", values?.itemBrand)}
        {inputField("itemModel", "Model/seri", values?.itemModel)}
        {inputField("itemSerialNumber", "Nomor seri", values?.itemSerialNumber)}
        {inputField("itemQuantity", "Jumlah", values?.itemQuantity, "0.00", "number")}
        {inputField("itemUnit", "Satuan", values?.itemUnit)}
        {wrapConditionField(selectField("condition", "Kondisi fisik benda", itemConditionSelectPairs, values?.condition))}
        <AssetOperationalStatusFields ctx={operationalCtx} placement={placementCtx} />
        <AssetConditionNoteField ctx={operationalCtx} />
        <input type="hidden" name="itemStorageLocation" value={normalizeFieldValue(values?.itemStorageLocation) ?? ""} />
        {inputField("itemResponsiblePerson", "Penanggung jawab", values?.itemResponsiblePerson)}
        {inputField("itemEvidenceDocumentNumber", "Nomor dokumen/bukti", values?.itemEvidenceDocumentNumber)}
        {inputField("itemEvidenceDocumentDate", "Tanggal terbit dokumen", values?.itemEvidenceDocumentDate, undefined, "date")}
        {inputField("itemEvidenceIssuer", "Pihak pemberi/penerbit", values?.itemEvidenceIssuer)}
        {inputField("itemEvidenceRegisteredName", "Nama tertera di dokumen", values?.itemEvidenceRegisteredName)}
        {selectField("itemDocumentStatus", "Status dokumen", selectOptions.itemDocumentStatus, values?.itemDocumentStatus)}
        {textareaField("itemNotes", "Catatan tambahan", values?.itemNotes)}
      </div>
    </section>
  );
}

function renderBuildingGeneralSection(
  values: AssetFormValues | undefined,
  selectedBuildingCategory: string,
  selectedBuildingType: string,
  onSelectedBuildingCategoryChange: (value: string) => void,
  onSelectedBuildingTypeChange: (value: string) => void,
  categories: AssetCategoryOption[],
  operationalCtx: AssetOperationalFieldContext
) {
  return (
    <div className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Identitas bangunan</h3>
          <p className="text-sm text-slate-600">Data khusus bangunan, terpisah dari alamat dan detail tanah.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("buildingAddress", "Alamat bangunan", values?.buildingAddress, "Alamat bangunan")}
          <BuildingCategoryAndTypeFields
            selectedCategory={selectedBuildingCategory}
            selectedType={selectedBuildingType}
            onSelectedCategoryChange={onSelectedBuildingCategoryChange}
            onSelectedTypeChange={onSelectedBuildingTypeChange}
            categories={categories}
          />
          {textareaField("buildingNotes", "Catatan tambahan bangunan", values?.buildingNotes)}
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Spesifikasi fisik</h3>
          <p className="text-sm text-slate-600">Luas, lantai, struktur, dan kondisi fisik bangunan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BuildingFloorAreasEditor defaultFloorCount={values?.buildingFloorCount} defaultTotalArea={values?.buildingAreaSquareMeters} />
          {inputField("buildingFootprintAreaSquareMeters", "Luas tapak / footprint (m2)", values?.buildingFootprintAreaSquareMeters, "0.00")}
          {inputField("buildingConstructionYear", "Tahun dibangun", values?.buildingConstructionYear, "2025", "number")}
          {inputField("buildingLastRenovationYear", "Tahun renovasi terakhir", values?.buildingLastRenovationYear, "2025", "number")}
          {selectField("buildingStructureType", "Struktur bangunan", selectOptions.buildingStructureType, values?.buildingStructureType)}
          {wrapConditionField(selectField("condition", "Kondisi bangunan", buildingConditionSelectPairs, values?.condition))}
          <AssetOperationalStatusFields ctx={operationalCtx} />
          <AssetConditionNoteField ctx={operationalCtx} />
        </div>
      </section>
    </div>
  );
}

function renderBuildingLegalSection(values: AssetFormValues | undefined) {
  return (
    <div className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">IMB/PBG</h3>
          <p className="text-sm text-slate-600">Data izin mendirikan bangunan atau persetujuan bangunan gedung.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {selectField("buildingPermitType", "Jenis izin", selectOptions.buildingPermitType, values?.buildingPermitType)}
          {inputField("buildingPermitNumber", "Nomor IMB/PBG", values?.buildingPermitNumber)}
          {inputField("buildingPermitIssuer", "Instansi penerbit", values?.buildingPermitIssuer)}
          {inputField("buildingPermitIssuedAt", "Tanggal terbit IMB/PBG", values?.buildingPermitIssuedAt, undefined, "date")}
          {inputField("buildingPermitExpiredAt", "Tanggal kadaluarsa IMB/PBG", values?.buildingPermitExpiredAt, undefined, "date")}
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">SLF</h3>
          <p className="text-sm text-slate-600">Data sertifikat laik fungsi bangunan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("buildingSlfNumber", "Nomor SLF", values?.buildingSlfNumber)}
          {inputField("buildingSlfIssuedAt", "Tanggal terbit SLF", values?.buildingSlfIssuedAt, undefined, "date")}
          {inputField("buildingSlfExpiredAt", "Masa berlaku SLF", values?.buildingSlfExpiredAt, undefined, "date")}
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Kepemilikan &amp; Penguasaan</h3>
          <p className="text-sm text-slate-600">Status pemegang hak dan penguasaan bangunan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {selectField("legalStatus", "Status pemegang hak riil", selectOptions.buildingLegalOwnerType, values?.legalStatus)}
          {inputField("ownerName", "Nama pemegang hak riil", values?.ownerName, "Nama pemilik/pemegang hak")}
        </div>
      </section>
    </div>
  );
}

function renderBuildingFinanceSection(
  values: AssetFormValues | undefined,
  fieldErrors: AssetFieldErrors,
  clearFieldError: (name: string) => void
) {
  return (
    <div className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Keuangan &amp; sewa</h3>
          <p className="text-sm text-slate-600">Perolehan, status sengketa, dan dokumen sewa/kerjasama.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("acquisitionDate", "Tanggal perolehan", values?.acquisitionDate, undefined, "date")}
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Nilai perolehan</span>
            <input
              name="acquisitionValue"
              type="text"
              inputMode="decimal"
              defaultValue={normalizeFieldValue(values?.acquisitionValue) ?? ""}
              onChange={() => clearFieldError("acquisitionValue")}
              className={`${fieldClassName} ${fieldErrors.acquisitionValue ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
              placeholder="0.00"
              aria-invalid={Boolean(fieldErrors.acquisitionValue)}
            />
            <FormFieldError message={fieldErrors.acquisitionValue} />
          </label>
          {selectField("buildingAcquisitionMethod", "Cara perolehan", selectOptions.acquisitionMethod, values?.buildingAcquisitionMethod)}
          {selectField("buildingDisputeStatus", "Status sengketa hukum", selectOptions.disputeStatus, values?.buildingDisputeStatus)}
          {inputField("buildingRentAmount", "Nilai sewa", values?.buildingRentAmount, "0.00")}
          {inputField("buildingNjopValue", "Nilai NJOP", values?.buildingNjopValue, "0.00")}
          {inputField("buildingAppraisalValue", "Nilai pasar appraisal", values?.buildingAppraisalValue, "0.00")}
          {inputField("buildingMaintenanceResponsibleName", "Penanggung jawab pemeliharaan", values?.buildingMaintenanceResponsibleName)}
          {inputField("buildingMaintenanceAnnualCost", "Biaya pemeliharaan", values?.buildingMaintenanceAnnualCost, "0.00")}
          {textareaField("buildingPhysicalCondition", "Kondisi fisik detail", values?.buildingPhysicalCondition)}
          <input type="hidden" name="buildingLeaseAgreementDocument" value={normalizeFieldValue(values?.buildingLeaseAgreementDocument) ?? ""} />
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Utilitas bangunan</h3>
          <p className="text-sm text-slate-600">Daya listrik, air, parkir, dan fasilitas pendukung.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("buildingElectricityCapacity", "Daya listrik", values?.buildingElectricityCapacity)}
          {selectField("buildingWaterSource", "Sumber air", selectOptions.buildingWaterSource, values?.buildingWaterSource)}
          {inputField("buildingParkingCapacity", "Kapasitas parkir", values?.buildingParkingCapacity)}
          {textareaField("buildingFacilities", "Fasilitas pendukung", values?.buildingFacilities)}
        </div>
      </section>
    </div>
  );
}

function renderBuildingMapBoundarySection(values: AssetFormValues | undefined, lookups: AssetFormProps["lookups"]) {
  return (
    <div className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Relasi tanah terkait</h3>
          <p className="text-sm text-slate-600">
            Pilih tanah tempat bangunan berdiri. Kosongkan jika bangunan berada di atas tanah pihak lain atau tanah belum tercatat sebagai aset.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lookupSelectField(
            "buildingMainLandAssetId",
            "Tanah utama",
            lookups.landAssets.length > 0 ? lookups.landAssets : lookups.assets.filter((a) => a.assetType === "tanah"),
            values?.buildingMainLandAssetId,
            "Pilih tanah utama",
            (asset) => `${asset.code ? `${asset.code} - ` : ""}${asset.name}`
          )}
          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>Tanah terkait (bisa lebih dari satu)</span>
            <BuildingLandPicker
              landAssets={lookups.landAssets.length > 0 ? lookups.landAssets : lookups.assets.filter((a) => a.assetType === "tanah")}
              defaultSelected={Array.isArray(values?.buildingLandAssetIds) ? values.buildingLandAssetIds : []}
            />
          </label>
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Peta lokasi bangunan</h3>
          <p className="text-sm text-slate-600">Gunakan pin merah untuk titik pusat bangunan.</p>
        </div>
        <MapPicker
          defaultLatitude={normalizeFieldValue(values?.buildingLatitude)}
          defaultLongitude={normalizeFieldValue(values?.buildingLongitude)}
          assetType="building"
          latitudeName="buildingLatitude"
          longitudeName="buildingLongitude"
        />
      </section>
    </div>
  );
}

function normalizeOwnershipLevel(level?: string | number | null) {
  const normalized = level == null ? "" : String(level);

  if (normalized === "badan_hukum") {
    return "badan_hukum";
  }

  return "keuskupan";
}

export function AssetForm({
  action,
  submitLabel,
  assetType,
  values,
  lookups,
  existingAttachments,
  depreciationPreview,
}: AssetFormProps) {
  const isCreateMode = !values?.id;
  const [ownershipLevel, setOwnershipLevel] = useState(() =>
    normalizeOwnershipLevel(normalizeFieldValue(values?.ownershipLevel))
  );
  const [selectedUnitId, setSelectedUnitId] = useState(() => String(normalizeFieldValue(values?.unitId) ?? ""));
  const [selectedItemCategory, setSelectedItemCategory] = useState(() => String(normalizeFieldValue(values?.itemCategory) ?? ""));
  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState(() => String(normalizeFieldValue(values?.vehicleCategory) ?? ""));
  const [selectedBuildingCategory, setSelectedBuildingCategory] = useState(() =>
    String(normalizeFieldValue(values?.buildingCategory) ?? lookups.buildingCategories[0]?.code ?? "permanent")
  );
  const [selectedBuildingType, setSelectedBuildingType] = useState(() => {
    const categoryCode = String(normalizeFieldValue(values?.buildingCategory) ?? lookups.buildingCategories[0]?.code ?? "permanent");
    const category = lookups.buildingCategories.find((item) => item.code === categoryCode);
    return String(normalizeFieldValue(values?.buildingType) ?? category?.allowedTypes?.[0] ?? "");
  });
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const { markDirty, resetDirty } = useDirtyFlag();
  const { fieldErrors, validate, clearFieldError } = useZodForm(assetCommonSchema);
  const isKeuskupanOwnership = ownershipLevel === "keuskupan";
  const currentAssetStatus = String(normalizeFieldValue(values?.status) ?? "active");
  const statusEditable = isCreateMode || isManuallyEditableAssetStatus(currentAssetStatus);
  const operationalCtx = { lookups, values, statusEditable, currentAssetStatus, fieldErrors, clearFieldError };
  const showPlacementLocation = isKeuskupanOwnership && (assetType === "benda" || assetType === "kendaraan");
  const locationOptions = selectedUnitId
    ? filterLocationsForAssetType(
        lookups.locations.filter((location) => location.unitId === selectedUnitId),
        assetType,
        values?.locationId as string
      )
    : [];
  const placementCtx: AssetPlacementFieldContext | undefined = showPlacementLocation
    ? {
        assetType,
        selectedUnitId,
        locationOptions,
        locationId: values?.locationId as string,
      }
    : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const record: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        record[key] = value;
      }
    }

    record.assetType = assetType;
    record.ownershipLevel = ownershipLevel;

    if (!validate(record)) {
      event.preventDefault();
      setShowErrorSummary(true);
      window.setTimeout(() => {
        const firstError = event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error="true"]');
        firstError?.focus();
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }

    resetDirty();
  }

  return (
    <form action={action} onSubmit={handleSubmit} onChange={markDirty} className="space-y-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="assetType" value={assetType} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <RequiredFieldsNote />
      </div>
      <FormErrorSummary show={showErrorSummary && Object.keys(fieldErrors).length > 0} />

      {isCreateMode ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Jenis aset</p>
            <p className="text-xs text-slate-600">Menentukan field detail pada tab berikutnya.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["tanah", "bangunan", "kendaraan", "benda"] as const).map((type) => (
              <Link
                key={type}
                href={`/assets/${type}/new`}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  assetType === type
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {assetTypeLabels[type]}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="umum">
        <TabsList>
          <TabsTrigger value="umum">Umum</TabsTrigger>
          <TabsTrigger value="legalitas">Legalitas</TabsTrigger>
          <TabsTrigger value="keuangan">Keuangan &amp; Sewa</TabsTrigger>
          {assetType === "tanah" || assetType === "bangunan" ? <TabsTrigger value="peta">Peta &amp; Batas</TabsTrigger> : null}
          <TabsTrigger value="relasi">Relasi</TabsTrigger>
          <TabsTrigger value="coretax">Coretax</TabsTrigger>
          <TabsTrigger value="lampiran">Lampiran &amp; Depresiasi</TabsTrigger>
        </TabsList>

        <TabsContent value="umum">
          <section className={sectionClassName}>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Data umum aset</h3>
              <p className="text-sm text-slate-600">
                Semua aset wajib punya kode, nama, level kepemilikan, dan pengelola.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Kode aset <RequiredMark />
                </span>
                <input
                  name="code"
                  required
                  defaultValue={normalizeFieldValue(values?.code) ?? ""}
                  onChange={() => clearFieldError("code")}
                  className={`${fieldClassName} ${fieldErrors.code ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  placeholder="AST-0001"
                  maxLength={64}
                  aria-invalid={Boolean(fieldErrors.code)}
                />
                <FieldHelper>Kode dapat dibuat otomatis oleh sistem jika tersedia.</FieldHelper>
                <FormFieldError message={fieldErrors.code} />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Nama aset <RequiredMark />
                </span>
                <input
                  name="name"
                  required
                  defaultValue={normalizeFieldValue(values?.name) ?? ""}
                  onChange={() => clearFieldError("name")}
                  className={`${fieldClassName} ${fieldErrors.name ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  placeholder="Contoh: Mobil Operasional Paroki"
                  maxLength={160}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                <FormFieldError message={fieldErrors.name} />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Level kepemilikan <RequiredMark />
                </span>
                <select
                  name="ownershipLevel"
                  value={ownershipLevel}
                  onChange={(event) => {
                    setOwnershipLevel(event.target.value);
                    if (event.target.value !== "keuskupan") {
                      setSelectedUnitId("");
                    }
                    clearFieldError("unitId");
                    clearFieldError("badanHukumId");
                  }}
                  className={fieldClassName}
                  required
                >
                  {selectOptions.ownershipLevel.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>

              {isKeuskupanOwnership ? (
                <>
                  <FormSelect
                    name="unitId"
                    label="Unit pengelola"
                    options={lookupToSelectOptions(lookups.units)}
                    defaultValue={normalizeFieldValue(values?.unitId)}
                    value={selectedUnitId}
                    onChange={(value) => {
                      setSelectedUnitId(value);
                      clearFieldError("unitId");
                    }}
                    placeholder="Pilih unit"
                    emptyOptionLabel="Pilih unit"
                    required
                    includeEmptyOption
                  />
                  <FieldHelper>Organisasi yang memiliki aset secara administrasi.</FieldHelper>
                  <FormFieldError message={fieldErrors.unitId} />
                  <input type="hidden" name="badanHukumId" value="" />
                </>
              ) : (
                <>
                  <FormSelect
                    name="badanHukumId"
                    label="Badan hukum"
                    options={lookupToSelectOptions(lookups.badanHukums, (item) => item.name)}
                    defaultValue={normalizeFieldValue(values?.badanHukumId)}
                    placeholder="Pilih badan hukum"
                    emptyOptionLabel="Pilih badan hukum"
                    required
                    includeEmptyOption
                  />
                  <FieldHelper>Badan hukum pemilik aset secara administrasi.</FieldHelper>
                  <FormFieldError message={fieldErrors.badanHukumId} />
                  <input type="hidden" name="unitId" value="" />
                </>
              )}
              {!showPlacementLocation ? <input type="hidden" name="locationId" value="" /> : null}
              {assetType === "tanah" ? (
                <>
                  {inputField("landAddress", "Alamat tanah", values?.landAddress, "Alamat lengkap")}
                  {inputField("landAreaSquareMeters", "Luas tanah (m2)", values?.landAreaSquareMeters, "Contoh: 250")}
                  {selectField("landLandUse", "Peruntukan tanah", selectOptions.landUse, values?.landLandUse)}
                  {selectField(
                    "landAcquisitionMethod",
                    "Cara perolehan",
                    [
                      ["pembelian/transaksi komersial", "Pembelian / transaksi komersial"],
                      ["hibah/donasi umat", "Hibah / donasi umat"],
                      ["warisan", "Warisan"],
                      ["tukar guling", "Tukar guling"],
                      ["lainnya", "Lainnya"],
                    ],
                    values?.landAcquisitionMethod
                  )}
                  {wrapConditionField(
                    inputField(
                      "condition",
                      "Kondisi fisik tanah",
                      values?.condition,
                      "misal: Tanah rata/siap bangun, berkontur bukit, rawa..."
                    )
                  )}
                  <AssetOperationalStatusFields ctx={operationalCtx} />
                  <AssetConditionNoteField ctx={operationalCtx} />
                </>
              ) : null}
              {textareaField("notes", "Catatan umum", values?.notes, "Tulis catatan tambahan...")}
              {assetType === "tanah" ? textareaField("landNotes", "Catatan tanah", values?.landNotes) : null}
            </div>
          </section>
          {assetType === "bangunan"
            ? renderBuildingGeneralSection(
                values,
                selectedBuildingCategory,
                selectedBuildingType,
                setSelectedBuildingCategory,
                setSelectedBuildingType,
                lookups.buildingCategories,
                operationalCtx
              )
            : null}
          {assetType !== "tanah" && assetType !== "bangunan"
            ? renderTypeSection(
                assetType,
                values,
                lookups,
                selectedItemCategory,
                setSelectedItemCategory,
                selectedVehicleCategory,
                setSelectedVehicleCategory,
                operationalCtx,
                placementCtx
              )
            : null}
        </TabsContent>

        <TabsContent value="legalitas">
          {assetType === "tanah" ? renderLandLegalSection(values) : null}
          {assetType === "bangunan" ? renderBuildingLegalSection(values) : null}
          {assetType !== "tanah" && assetType !== "bangunan" ? (
            <section className={sectionClassName}>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Legalitas aset</h3>
                <p className="text-sm text-slate-600">Status legalitas dan pemilik aset.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {selectField(
                  "legalStatus",
                  "Status legalitas",
                  [
                    ["milik sendiri", "Milik sendiri"],
                    ["sewa", "Sewa"],
                    ["pinjam pakai", "Pinjam pakai"],
                    ["titipan", "Titipan"],
                    ["hibah", "Hibah"],
                    ["sengketa/perlu perhatian", "Sengketa / perlu perhatian"],
                  ],
                  values?.legalStatus
                )}
                {inputField("ownerName", "Pemilik aset / legalitas PGDP", values?.ownerName, "Nama pemilik legal")}
              </div>
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="keuangan">
          {assetType === "tanah" ? renderLandFinanceBoundarySection(values, fieldErrors, clearFieldError) : null}
          {assetType === "bangunan" ? renderBuildingFinanceSection(values, fieldErrors, clearFieldError) : null}
          {assetType !== "tanah" && assetType !== "bangunan" ? (
            <section className={sectionClassName}>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Keuangan &amp; sewa</h3>
                <p className="text-sm text-slate-600">Tanggal dan nilai perolehan aset.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {inputField("acquisitionDate", "Tanggal perolehan", values?.acquisitionDate, undefined, "date")}
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Nilai perolehan</span>
                  <input
                    name="acquisitionValue"
                    type="text"
                    inputMode="decimal"
                    defaultValue={normalizeFieldValue(values?.acquisitionValue) ?? ""}
                    onChange={() => clearFieldError("acquisitionValue")}
                    className={`${fieldClassName} ${fieldErrors.acquisitionValue ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                    placeholder="0.00"
                    aria-invalid={Boolean(fieldErrors.acquisitionValue)}
                  />
                  <FormFieldError message={fieldErrors.acquisitionValue} />
                </label>
              </div>
            </section>
          ) : null}
        </TabsContent>

        {assetType === "tanah" || assetType === "bangunan" ? (
          <TabsContent value="peta">
            {assetType === "tanah" ? renderLandMapBoundarySection(values) : null}
            {assetType === "bangunan" ? renderBuildingMapBoundarySection(values, lookups) : null}
          </TabsContent>
        ) : null}

        <TabsContent value="relasi">{relationsTabContent(lookups, values)}</TabsContent>

        <TabsContent value="coretax">{coretaxSection(values)}</TabsContent>

        <TabsContent value="lampiran">
          {attachmentSection(existingAttachments)}
          {depreciationSection(assetType, lookups, values, depreciationPreview, selectedItemCategory, selectedBuildingCategory, selectedVehicleCategory)}
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-1 py-4">
        <SubmitButton
          pendingText="Menyimpan..."
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
        >
          {submitLabel}
        </SubmitButton>
        <Link
          href="/assets"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
