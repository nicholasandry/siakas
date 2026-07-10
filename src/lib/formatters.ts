export const assetTypeLabels: Record<string, string> = {
  tanah: "Tanah",
  bangunan: "Bangunan",
  kendaraan: "Kendaraan",
  benda: "Benda",
};

export const assetStatusLabels: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  archived: "Nonaktif",
  on_loan: "Dipinjamkan",
  in_maintenance: "Dalam Maintenance",
  expired_still_used: "Habis Masa Manfaat - Masih Digunakan",
  under_disposal: "Dalam Proses Disposal",
  disposed: "Disposed",
  lost: "Hilang",
  donated: "Dihibahkan",
  sold: "Terjual",
  exchanged: "Ditukarkan",
  written_off: "Dihapus",
};

export const ownershipLevelLabels: Record<string, string> = {
  keuskupan: "Keuskupan",
  badan_hukum: "Badan hukum",
};

export function labelFromMap(value: string | null | undefined, labels: Record<string, string>, fallback = "-") {
  if (!value) return fallback;
  return labels[value] ?? value;
}

export function formatDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function formatRupiahRp(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return `Rp ${value}`;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

export const formatRupiah = formatRupiahRp;

export function formatDateTime(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
