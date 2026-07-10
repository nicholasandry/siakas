type AssetItemCategory = {
  code: string;
  label: string;
  depreciationGroupCode: string;
  depreciationGroupName: string;
  depreciationGroupLabel: "Kelompok 1" | "Kelompok 2" | "Kelompok 3";
  usefulLifeYears: 4 | 8 | 16;
  ratePercent: "25" | "12.5" | "6.25";
  examples: string[];
};

function category(input: AssetItemCategory) {
  return input;
}

export const assetItemCategories = [
  category({
    code: "LIT-LOG",
    label: "Peralatan Liturgi - Logam",
    depreciationGroupCode: "item-lit-log",
    depreciationGroupName: "Benda Kelompok 2 - Peralatan Liturgi Logam",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["piala misa logam", "sibori logam", "patena logam", "monstrans", "turibulum wiruk", "salib altar logam", "tempat lilin altar logam", "lonceng misa"],
  }),
  category({
    code: "LIT-NONLOG",
    label: "Peralatan Liturgi - Kayu, Kain, dan Non-Logam",
    depreciationGroupCode: "item-lit-nonlog",
    depreciationGroupName: "Benda Kelompok 1 - Peralatan Liturgi Non-Logam",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["mimbar kayu", "ambo kayu", "meja altar portabel kayu", "kursi imam kayu", "salib kayu", "taplak altar", "kasula", "stola"],
  }),
  category({
    code: "NL-ELK",
    label: "Peralatan Non-Liturgi - Elektronika",
    depreciationGroupCode: "item-nl-elk",
    depreciationGroupName: "Benda Kelompok 1 - Peralatan Non-Liturgi Elektronika",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["amplifier", "mixer audio", "speaker aktif", "wireless microphone", "proyektor", "kamera cctv", "laptop operator misa", "router wi-fi"],
  }),
  category({
    code: "NL-NONLOG",
    label: "Peralatan Non-Liturgi - Kayu, Kain, Plastik, dan Non-Logam",
    depreciationGroupCode: "item-nl-nonlog",
    depreciationGroupName: "Benda Kelompok 1 - Peralatan Non-Liturgi Non-Logam",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["kursi plastik umat", "meja plastik", "meja kayu aula", "bangku kayu aula", "rak sepatu kayu", "whiteboard", "karpet aula", "partisi portabel non-logam"],
  }),
  category({
    code: "KTR-LOGUD",
    label: "Peralatan Kantor - Logam dan Pengatur Udara",
    depreciationGroupCode: "item-ktr-logud",
    depreciationGroupName: "Benda Kelompok 2 - Peralatan Kantor Logam dan Pengatur Udara",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["ac ruang sekretariat", "kipas angin dinding", "exhaust fan", "brankas", "lemari besi", "filing cabinet logam", "rak arsip logam", "loker logam"],
  }),
  category({
    code: "KTR-UMUM",
    label: "Peralatan Kantor - Umum",
    depreciationGroupCode: "item-ktr-umum",
    depreciationGroupName: "Benda Kelompok 1 - Peralatan Kantor Umum",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["laptop staf sekretariat", "komputer desktop", "printer laser", "scanner", "mesin fotokopi", "telepon kantor", "meja kerja kayu", "ups komputer kantor"],
  }),
  category({
    code: "PAS-LOGUD",
    label: "Peralatan Pastoran - Logam dan Pengatur Udara",
    depreciationGroupCode: "item-pas-logud",
    depreciationGroupName: "Benda Kelompok 2 - Peralatan Pastoran Logam dan Pengatur Udara",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["ac kamar pastor", "kipas angin kamar", "exhaust fan dapur", "brankas pastoran", "ranjang logam", "rak logam gudang pastoran", "troli makan logam", "tangga lipat aluminium"],
  }),
  category({
    code: "PAS-UMUM",
    label: "Peralatan Pastoran - Umum",
    depreciationGroupCode: "item-pas-umum",
    depreciationGroupName: "Benda Kelompok 1 - Peralatan Pastoran Umum",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["meja makan kayu", "sofa ruang tamu", "lemari pakaian kayu", "kasur", "kompor gas", "kulkas", "mesin cuci", "pompa air kecil"],
  }),
  category({
    code: "OPS-LAP-UMUM",
    label: "Peralatan Operasional Lapangan - Mebel dan Umum",
    depreciationGroupCode: "item-ops-lap-umum",
    depreciationGroupName: "Benda Kelompok 1 - Operasional Lapangan Mebel dan Umum",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["meja lipat acara non-logam", "kursi lipat acara non-logam", "papan panggung kayu", "panggung portabel kayu", "payung besar outdoor non-logam", "terpal tenda", "kabel roll outdoor", "perlengkapan acara portabel umum"],
  }),
  category({
    code: "OPS-LAP-LOG",
    label: "Peralatan Operasional Lapangan - Logam",
    depreciationGroupCode: "item-ops-lap-log",
    depreciationGroupName: "Benda Kelompok 2 - Operasional Lapangan Logam",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["rangka tenda logam", "rangka panggung besi", "barikade portabel logam", "tiang bendera portabel logam", "tangga lipat aluminium", "kursi lipat rangka logam", "meja lipat rangka logam", "kanopi portabel rangka logam"],
  }),
  category({
    code: "OPS-LAP-LAIN",
    label: "Peralatan Operasional Lapangan - Lainnya",
    depreciationGroupCode: "item-ops-lap-lain",
    depreciationGroupName: "Benda Kelompok 3 - Operasional Lapangan Lainnya",
    depreciationGroupLabel: "Kelompok 3",
    usefulLifeYears: 16,
    ratePercent: "6.25",
    examples: ["tenda lipat", "terop besar", "kanopi portabel satu set", "panggung portabel satu set", "peralatan acara lapangan berbahan campuran", "peralatan lapangan lain"],
  }),
  category({
    code: "OPS-KBR-UMUM",
    label: "Peralatan Kebersihan - Elektronik dan Umum",
    depreciationGroupCode: "item-ops-kbr-umum",
    depreciationGroupName: "Benda Kelompok 1 - Kebersihan Elektronik dan Umum",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["vacuum cleaner", "wet and dry vacuum", "blower kebersihan", "dispenser sabun otomatis", "mesin potong rumput elektrik", "tangki semprot elektrik", "mesin steam kecil", "peralatan kebersihan elektronik kecil"],
  }),
  category({
    code: "OPS-KBR-LOG",
    label: "Peralatan Kebersihan - Logam",
    depreciationGroupCode: "item-ops-kbr-log",
    depreciationGroupName: "Benda Kelompok 2 - Kebersihan Logam",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["troli kebersihan logam", "rak alat kebersihan logam", "tempat sampah logam besar", "tangga kebersihan aluminium", "lemari penyimpanan alat kebersihan logam"],
  }),
  category({
    code: "OPS-KBR-LAIN",
    label: "Peralatan Kebersihan - Lainnya",
    depreciationGroupCode: "item-ops-kbr-lain",
    depreciationGroupName: "Benda Kelompok 3 - Kebersihan Lainnya",
    depreciationGroupLabel: "Kelompok 3",
    usefulLifeYears: 16,
    ratePercent: "6.25",
    examples: ["alat poles lantai", "floor scrubber", "mesin semprot air tekanan tinggi", "alat fogging", "mesin potong rumput berbahan bakar", "mesin pemotong dahan", "peralatan kebersihan lain"],
  }),
  category({
    code: "OPS-TEK-UMUM",
    label: "Peralatan Teknis dan Perawatan - Elektronik dan Umum",
    depreciationGroupCode: "item-ops-tek-umum",
    depreciationGroupName: "Benda Kelompok 1 - Teknis dan Perawatan Elektronik dan Umum",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["mesin bor", "gerinda", "stabilizer besar", "pompa air portabel kecil", "pompa celup portabel", "extension kabel industri", "tool kit besar", "water pump acara"],
  }),
  category({
    code: "OPS-TEK-LOG",
    label: "Peralatan Teknis dan Perawatan - Logam",
    depreciationGroupCode: "item-ops-tek-log",
    depreciationGroupName: "Benda Kelompok 2 - Teknis dan Perawatan Logam",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["tangga teleskopik aluminium", "hand pallet", "troli barang logam", "rak peralatan teknis logam", "lemari alat logam", "panel listrik portabel berbahan logam"],
  }),
  category({
    code: "OPS-TEK-LAIN",
    label: "Peralatan Teknis dan Perawatan - Lainnya",
    depreciationGroupCode: "item-ops-tek-lain",
    depreciationGroupName: "Benda Kelompok 3 - Teknis dan Perawatan Lainnya",
    depreciationGroupLabel: "Kelompok 3",
    usefulLifeYears: 16,
    ratePercent: "6.25",
    examples: ["kompresor", "mesin las", "genset portabel", "mesin steam besar", "peralatan teknis berat", "peralatan perawatan gedung lain"],
  }),
  category({
    code: "OPS-KMN-UMUM",
    label: "Peralatan Keamanan dan Keselamatan - Elektronik dan Umum",
    depreciationGroupCode: "item-ops-kmn-umum",
    depreciationGroupName: "Benda Kelompok 1 - Keamanan dan Keselamatan Elektronik dan Umum",
    depreciationGroupLabel: "Kelompok 1",
    usefulLifeYears: 4,
    ratePercent: "25",
    examples: ["metal detector genggam", "handy talky keamanan", "cctv area luar", "monitor cctv pos keamanan", "dvr keamanan", "lampu darurat portabel", "senter rechargeable", "kotak p3k besar"],
  }),
  category({
    code: "OPS-KMN-LOG",
    label: "Peralatan Keamanan dan Keselamatan - Logam",
    depreciationGroupCode: "item-ops-kmn-log",
    depreciationGroupName: "Benda Kelompok 2 - Keamanan dan Keselamatan Logam",
    depreciationGroupLabel: "Kelompok 2",
    usefulLifeYears: 8,
    ratePercent: "12.5",
    examples: ["barrier parkir logam", "pagar pembatas portabel logam", "tiang rantai antrian logam", "lemari penyimpanan alat keamanan logam", "box apar logam", "rak apar logam"],
  }),
  category({
    code: "OPS-KMN-LAIN",
    label: "Peralatan Keamanan dan Keselamatan - Lainnya",
    depreciationGroupCode: "item-ops-kmn-lain",
    depreciationGroupName: "Benda Kelompok 3 - Keamanan dan Keselamatan Lainnya",
    depreciationGroupLabel: "Kelompok 3",
    usefulLifeYears: 16,
    ratePercent: "6.25",
    examples: ["walk-through metal detector", "apar", "traffic cone", "barrier parkir portabel non-logam", "rompi keamanan", "tongkat keamanan", "peralatan keselamatan lain"],
  }),
] as const;

export type AssetItemCategoryCode = (typeof assetItemCategories)[number]["code"];

export const assetItemCategoryOptions = assetItemCategories.map((item) => [item.code, item.label] as const);

export const assetItemCategoryLabels = Object.fromEntries(assetItemCategories.map((item) => [item.code, item.label])) as Record<string, string>;

export const assetItemCategoryByCode = Object.fromEntries(assetItemCategories.map((item) => [item.code, item])) as Record<
  AssetItemCategoryCode,
  (typeof assetItemCategories)[number]
>;

export function getAssetItemCategory(code: string | null | undefined) {
  if (!code) return null;
  return assetItemCategoryByCode[code as AssetItemCategoryCode] ?? null;
}
