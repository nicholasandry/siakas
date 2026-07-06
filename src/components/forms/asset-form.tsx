"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AssetAttachmentsField } from "@/components/forms/asset-attachments-field";
import { BuildingLandPicker } from "@/components/forms/building-land-picker";
import { FieldHint } from "@/components/ui/field-hint";
import { FormFieldError } from "@/components/ui/form-field-error";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect, lookupToSelectOptions, pairsToSelectOptions } from "@/components/ui/form-select";
import { useZodForm } from "@/hooks/use-zod-form";
import type { DepreciationPreview } from "@/lib/depreciation";
import { assetCommonSchema } from "@/lib/validators/asset";

type LookupOption = {
  id: string;
  name: string;
  code?: string;
  email?: string;
  assetType?: string;
};

type AssetFormValues = Record<string, string | number | null | undefined | string[]> & {
  id?: string;
};

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
    depreciationGroups: Array<{
      id: string;
      code: string;
      name: string;
      assetCategory: string;
    }>;
  };
  existingAttachments?: Array<{
    id: string;
    attachmentType: string;
    filePath: string;
    notes: string | null;
  }>;
  depreciationPreview?: DepreciationPreview | null;
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
    ["mobil", "Mobil"],
    ["motor", "Motor"],
    ["truk", "Truk"],
    ["bus", "Bus"],
    ["alat berat", "Alat berat"],
    ["lainnya", "Lainnya"],
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
  itemCategory: [
    ["liturgis", "Liturgis"],
    ["perlengkapan kantor", "Perlengkapan kantor"],
    ["alat kesehatan", "Alat kesehatan"],
    ["alat pendidikan", "Alat pendidikan"],
    ["perabot", "Perabot"],
    ["mesin", "Mesin"],
    ["koleksi", "Koleksi"],
    ["lainnya", "Lainnya"],
  ],
  itemDocumentStatus: [
    ["lengkap", "Lengkap"],
    ["sebagian", "Sebagian"],
    ["belum ada", "Belum ada"],
  ],
};

function normalizeFieldValue(value?: string | number | string[] | null) {
  return Array.isArray(value) ? undefined : value;
}

function selectField(
  name: string,
  label: string,
  options: ReadonlyArray<string[]>,
  defaultValue?: string | number | string[] | null,
  placeholder = "Pilih"
) {
  return (
    <FormSelect
      name={name}
      label={label}
      options={pairsToSelectOptions(options)}
      defaultValue={normalizeFieldValue(defaultValue)}
      placeholder={placeholder}
    />
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
  preview?: DepreciationPreview | null
) {
  const categoryGroups = lookups.depreciationGroups.filter((group) => group.assetCategory === assetType);
  const defaultGroupId =
    scalarValue(values, "depreciationGroupId") ??
    categoryGroups.find((group) => group.code === "building-permanent")?.id ??
    categoryGroups[0]?.id;

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
          {defaultGroupId ? <input type="hidden" name="depreciationGroupId" value={defaultGroupId} /> : null}
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
            Tanah tidak disusutkan — nilai buku sama dengan nilai perolehan.
          </div>
        </div>
      ) : categoryGroups.length > 0 ? (
        <FormSelect
          name="depreciationGroupId"
          label="Kelompok fiskal"
          options={lookupToSelectOptions(categoryGroups, (group) => `${group.name} (${group.code})`)}
          defaultValue={defaultGroupId}
          placeholder="Pilih kelompok fiskal"
          required
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Belum ada kelompok fiskal aktif untuk jenis aset ini. Atur di Settings → Master Pajak.
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
            <div className="font-medium text-slate-900">Rp {preview.depreciableBase}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Depresiasi tahunan</div>
            <div className="font-medium text-slate-900">Rp {preview.annualDepreciation}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Nilai buku</div>
            <div className="font-medium text-slate-900">Rp {preview.bookValue}</div>
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

const sectionClassName = "space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

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

function renderTypeSection(assetType: AssetFormProps["assetType"], values: AssetFormValues | undefined, lookups: AssetFormProps["lookups"]) {
  if (assetType === "tanah") {
    return (
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Detail tanah</h3>
          <p className="text-sm text-slate-600">Isi data legalitas dan batas tanah sesuai dokumen.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("landAddress", "Alamat", values?.landAddress, "Alamat lengkap")}
          {inputField("landAreaSquareMeters", "Luas tanah (m2)", values?.landAreaSquareMeters, "0.00")}
          {selectField("landCertificateType", "Jenis sertifikat", [["SHM", "SHM"], ["SHGB", "SHGB"], ["Girik/Surat Ijo", "Girik / Surat Ijo"], ["Letter C/Petok D", "Letter C / Petok D"], ["lainnya/belum bersertifikat", "Lainnya / belum bersertifikat"]], values?.landCertificateType)}
          {inputField("landCertificateNumber", "Nomor sertifikat", values?.landCertificateNumber)}
          {inputField("landCertificateHolderName", "Nama di sertifikat", values?.landCertificateHolderName)}
          {inputField("landCertificateIssuedAt", "Tanggal terbit sertifikat", values?.landCertificateIssuedAt, undefined, "date")}
          {inputField("landCertificateExpiredAt", "Tanggal kadaluarsa sertifikat", values?.landCertificateExpiredAt, undefined, "date")}
          {inputField("landIssuingInstitution", "Instansi penerbit", values?.landIssuingInstitution)}
          {selectField("landLegalOwnerType", "Jenis pemilik legal", [["PGDP (Kuria/Paroki)", "PGDP (Kuria / Paroki)"], ["Keuskupan Surabaya (Pusat)", "Keuskupan Surabaya (Pusat)"], ["Yayasan Keuskupan", "Yayasan Keuskupan"], ["Pribadi Pastor/Imam", "Pribadi Pastor / Imam"], ["Pribadi Umat/Donatur", "Pribadi Umat / Donatur"], ["belum bersertifikat", "Belum bersertifikat"], ["lainnya", "Lainnya"]], values?.landLegalOwnerType)}
          {inputField("landActualOwnerName", "Nama pemilik aktual", values?.landActualOwnerName)}
          {inputField("landLastNjopValue", "NJOP terakhir", values?.landLastNjopValue, "0.00")}
          {inputField("landAppraisalValue", "Nilai appraisal", values?.landAppraisalValue, "0.00")}
          {inputField("landAppraisalDate", "Tanggal appraisal", values?.landAppraisalDate, undefined, "date")}
          {inputField("landNopPbb", "NOP PBB", values?.landNopPbb)}
          {textareaField("landBoundaryNorth", "Batas utara", values?.landBoundaryNorth)}
          {textareaField("landBoundarySouth", "Batas selatan", values?.landBoundarySouth)}
          {textareaField("landBoundaryEast", "Batas timur", values?.landBoundaryEast)}
          {textareaField("landBoundaryWest", "Batas barat", values?.landBoundaryWest)}
          {inputField("landLatitude", "Latitude", values?.landLatitude, "-7.2")}
          {inputField("landLongitude", "Longitude", values?.landLongitude, "112.7")}
          {selectField("landLandUse", "Peruntukan tanah", selectOptions.landUse, values?.landLandUse)}
          {selectField("landAcquisitionMethod", "Cara perolehan", [["pembelian/transaksi komersial", "Pembelian / transaksi komersial"], ["hibah/donasi umat", "Hibah / donasi umat"], ["warisan", "Warisan"], ["tukar guling", "Tukar guling"], ["lainnya", "Lainnya"]], values?.landAcquisitionMethod)}
          {selectField("landDisputeStatus", "Status sengketa", [["aman/tidak ada sengketa", "Aman / tidak ada sengketa"], ["dalam sengketa hukum/pengadilan", "Dalam sengketa hukum / pengadilan"]], values?.landDisputeStatus)}
          {textareaField("landNotes", "Catatan tambahan", values?.landNotes)}
        </div>
      </section>
    );
  }

  if (assetType === "bangunan") {
    return (
      <section className={sectionClassName}>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Detail bangunan</h3>
          <p className="text-sm text-slate-600">Lampirkan relasi tanah utama dan izin bangunan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {inputField("buildingAddress", "Alamat", values?.buildingAddress, "Alamat bangunan")}
          {selectField("buildingType", "Jenis bangunan", selectOptions.buildingType, values?.buildingType)}
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
          {inputField("buildingAreaSquareMeters", "Luas bangunan (m2)", values?.buildingAreaSquareMeters, "0.00")}
          {selectField("buildingAcquisitionMethod", "Cara perolehan", selectOptions.acquisitionMethod, values?.buildingAcquisitionMethod)}
          {selectField("buildingDisputeStatus", "Status sengketa", selectOptions.disputeStatus, values?.buildingDisputeStatus)}
          {inputField("buildingFloorCount", "Jumlah lantai", values?.buildingFloorCount, "0", "number")}
          {inputField("buildingConstructionYear", "Tahun pembangunan", values?.buildingConstructionYear, "2025", "number")}
          {inputField("buildingLastRenovationYear", "Tahun renovasi terakhir", values?.buildingLastRenovationYear, "2025", "number")}
          {inputField("buildingStructureType", "Jenis struktur", values?.buildingStructureType)}
          {inputField("buildingFootprintAreaSquareMeters", "Luas tapak (m2)", values?.buildingFootprintAreaSquareMeters, "0.00")}
          {selectField("buildingPermitType", "Jenis izin bangunan", selectOptions.buildingPermitType, values?.buildingPermitType)}
          {inputField("buildingPermitNumber", "Nomor izin", values?.buildingPermitNumber)}
          {inputField("buildingPermitIssuedAt", "Tanggal terbit izin", values?.buildingPermitIssuedAt, undefined, "date")}
          {inputField("buildingPermitExpiredAt", "Tanggal kadaluarsa izin", values?.buildingPermitExpiredAt, undefined, "date")}
          {inputField("buildingPermitIssuer", "Penerbit dokumen", values?.buildingPermitIssuer)}
          {inputField("buildingSlfNumber", "Nomor SLF", values?.buildingSlfNumber)}
          {inputField("buildingSlfIssuedAt", "Tanggal terbit SLF", values?.buildingSlfIssuedAt, undefined, "date")}
          {inputField("buildingSlfExpiredAt", "Tanggal kadaluarsa SLF", values?.buildingSlfExpiredAt, undefined, "date")}
          {inputField("buildingLeaseAgreementDocument", "Dokumen sewa/kerjasama", values?.buildingLeaseAgreementDocument)}
          {inputField("buildingElectricityCapacity", "Kapasitas listrik", values?.buildingElectricityCapacity)}
          {selectField("buildingWaterSource", "Sumber air", selectOptions.buildingWaterSource, values?.buildingWaterSource)}
          {inputField("buildingParkingCapacity", "Kapasitas parkir", values?.buildingParkingCapacity)}
          {textareaField("buildingFacilities", "Fasilitas pendukung", values?.buildingFacilities)}
          {inputField("buildingLatitude", "Latitude", values?.buildingLatitude, "-7.2")}
          {inputField("buildingLongitude", "Longitude", values?.buildingLongitude, "112.7")}
          {textareaField("buildingNotes", "Catatan tambahan", values?.buildingNotes)}
        </div>
      </section>
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
          {selectField("vehicleCategory", "Kategori kendaraan", selectOptions.vehicleCategory, values?.vehicleCategory)}
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
          {inputField("vehicleDomicileLocation", "Domisili/lokasi parkir", values?.vehicleDomicileLocation)}
          {selectField("vehicleCondition", "Kondisi kendaraan", [["sangat baik", "Sangat baik"], ["baik", "Baik"], ["cukup", "Cukup"], ["rusak ringan", "Rusak ringan"], ["rusak berat", "Rusak berat"], ["tidak layak pakai", "Tidak layak pakai"]], values?.vehicleCondition)}
          {selectField("vehicleOperationalStatus", "Status operasional", selectOptions.vehicleOperationalStatus, values?.vehicleOperationalStatus)}
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
        {selectField("itemCategory", "Kategori benda", selectOptions.itemCategory, values?.itemCategory)}
        {textareaField("itemDescription", "Deskripsi benda", values?.itemDescription)}
        {inputField("itemBrand", "Merek", values?.itemBrand)}
        {inputField("itemModel", "Model/seri", values?.itemModel)}
        {inputField("itemSerialNumber", "Nomor seri", values?.itemSerialNumber)}
        {inputField("itemQuantity", "Jumlah", values?.itemQuantity, "0.00", "number")}
        {inputField("itemUnit", "Satuan", values?.itemUnit)}
        {inputField("itemStorageLocation", "Lokasi penyimpanan", values?.itemStorageLocation)}
        {inputField("itemResponsiblePerson", "Penanggung jawab", values?.itemResponsiblePerson)}
        {inputField("itemEvidenceDocumentNumber", "Nomor dokumen/bukti", values?.itemEvidenceDocumentNumber)}
        {inputField("itemEvidenceDocumentDate", "Tanggal terbit dokumen", values?.itemEvidenceDocumentDate, undefined, "date")}
        {inputField("itemEvidenceIssuer", "Pihak pemberi/penerbit", values?.itemEvidenceIssuer)}
        {inputField("itemEvidenceRegisteredName", "Nama tertera di dokumen", values?.itemEvidenceRegisteredName)}
        {selectField("itemDocumentStatus", "Status dokumen", selectOptions.itemDocumentStatus, values?.itemDocumentStatus)}
        {selectField("itemCondition", "Kondisi benda", [["baru", "Baru"], ["sangat baik", "Sangat baik"], ["baik", "Baik"], ["cukup", "Cukup"], ["rusak", "Rusak"], ["tidak layak pakai", "Tidak layak pakai"]], values?.itemCondition)}
        {textareaField("itemNotes", "Catatan tambahan", values?.itemNotes)}
      </div>
    </section>
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
  const isKeuskupanOwnership = ownershipLevel === "keuskupan";
  const { fieldErrors, validate, clearFieldError } = useZodForm(assetCommonSchema);

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
    }
  }

  return (
    <form action={action} encType="multipart/form-data" onSubmit={handleSubmit} className="space-y-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="assetType" value={assetType} />

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
                href={`/assets/new?type=${type}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
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
          <TabsTrigger value="detail">{detailTabLabels[assetType]}</TabsTrigger>
          <TabsTrigger value="relasi">Relasi</TabsTrigger>
          <TabsTrigger value="coretax">Coretax</TabsTrigger>
          <TabsTrigger value="lampiran">Lampiran &amp; depresiasi</TabsTrigger>
        </TabsList>

        <TabsContent value="umum">
          <section className={sectionClassName}>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Data umum aset</h3>
              <p className="text-sm text-slate-600">
                Semua aset wajib punya kode, nama, level kepemilikan, dan nilai perolehan.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Kode aset <span className="text-rose-600">*</span>
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
                <FormFieldError message={fieldErrors.code} />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Nama aset <span className="text-rose-600">*</span>
                </span>
                <input
                  name="name"
                  required
                  defaultValue={normalizeFieldValue(values?.name) ?? ""}
                  onChange={() => clearFieldError("name")}
                  className={`${fieldClassName} ${fieldErrors.name ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  placeholder="Nama aset"
                  maxLength={160}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                <FormFieldError message={fieldErrors.name} />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>
                  Level kepemilikan <span className="text-rose-600">*</span>
                </span>
                <select
                  name="ownershipLevel"
                  value={ownershipLevel}
                  onChange={(event) => {
                    setOwnershipLevel(event.target.value);
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
                    label={
                      <>
                        Unit pengelola <span className="text-rose-600">*</span>
                      </>
                    }
                    options={lookupToSelectOptions(lookups.units)}
                    defaultValue={normalizeFieldValue(values?.unitId)}
                    placeholder="Pilih unit"
                    emptyOptionLabel="Pilih unit"
                    required
                    includeEmptyOption
                  />
                  <FormFieldError message={fieldErrors.unitId} />
                  <input type="hidden" name="badanHukumId" value="" />
                </>
              ) : (
                <>
                  <FormSelect
                    name="badanHukumId"
                    label={
                      <>
                        Badan hukum <span className="text-rose-600">*</span>
                      </>
                    }
                    options={lookupToSelectOptions(lookups.badanHukums, (item) => item.name)}
                    defaultValue={normalizeFieldValue(values?.badanHukumId)}
                    placeholder="Pilih badan hukum"
                    emptyOptionLabel="Pilih badan hukum"
                    required
                    includeEmptyOption
                  />
                  <FormFieldError message={fieldErrors.badanHukumId} />
                  <input type="hidden" name="unitId" value="" />
                </>
              )}
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
              {selectField(
                "legalStatus",
                "Status legalitas",
                assetType === "tanah" || assetType === "bangunan"
                  ? selectOptions.landLegalStatus
                  : [
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
              {selectField(
                "condition",
                "Kondisi aset",
                assetType === "tanah" || assetType === "bangunan"
                  ? [
                      ["sangat baik/terawat", "Sangat baik / terawat"],
                      ["dalam proses renovasi", "Dalam proses renovasi"],
                      ["rusak ringan", "Rusak ringan"],
                      ["rusak berat", "Rusak berat"],
                      ["tidak layak pakai", "Tidak layak pakai"],
                    ]
                  : assetType === "kendaraan"
                    ? [
                        ["sangat baik", "Sangat baik"],
                        ["baik", "Baik"],
                        ["cukup", "Cukup"],
                        ["rusak ringan", "Rusak ringan"],
                        ["rusak berat", "Rusak berat"],
                        ["tidak layak pakai", "Tidak layak pakai"],
                      ]
                    : [
                        ["baru", "Baru"],
                        ["sangat baik", "Sangat baik"],
                        ["baik", "Baik"],
                        ["cukup", "Cukup"],
                        ["rusak", "Rusak"],
                        ["tidak layak pakai", "Tidak layak pakai"],
                      ],
                values?.condition
              )}
              {selectField(
                "status",
                "Status aset",
                [
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                  ["archived", "Archived"],
                ],
                values?.status
              )}
              {textareaField("notes", "Catatan umum", values?.notes)}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="detail">{renderTypeSection(assetType, values, lookups)}</TabsContent>

        <TabsContent value="relasi">{relationsTabContent(lookups, values)}</TabsContent>

        <TabsContent value="coretax">{coretaxSection(values)}</TabsContent>

        <TabsContent value="lampiran">
          {attachmentSection(existingAttachments)}
          {depreciationSection(assetType, lookups, values, depreciationPreview)}
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-1 py-4 backdrop-blur">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
        >
          {submitLabel}
        </button>
        <Link
          href="/assets"
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
