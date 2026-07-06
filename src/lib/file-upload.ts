import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function saveAssetUpload(file: File, assetId: string) {
  if (file.size === 0) {
    throw new Error("File lampiran kosong");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Ukuran file lampiran maksimal 10 MB");
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Tipe file tidak didukung. Gunakan PDF atau gambar (JPG/PNG/WebP/GIF)");
  }

  const bytes = await file.arrayBuffer();
  const uploadDir = path.join(process.cwd(), "public", "uploads", "assets", assetId);
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${sanitizeFileName(file.name || "lampiran")}`;
  const absolutePath = path.join(uploadDir, fileName);
  await writeFile(absolutePath, Buffer.from(bytes));

  return `/uploads/assets/${assetId}/${fileName}`;
}
