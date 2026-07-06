"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type ExistingAttachment = {
  id: string;
  attachmentType: string;
  filePath: string;
  notes: string | null;
};

type NewAttachmentRow = {
  key: string;
  attachmentType: string;
  notes: string;
};

const attachmentTypeOptions = [
  ["foto", "Foto"],
  ["dokumen", "Dokumen"],
  ["sertifikat", "Sertifikat"],
  ["lainnya", "Lainnya"],
] as const;

const fieldClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

const textareaClassName =
  "min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

type AssetAttachmentsFieldProps = {
  existing?: ExistingAttachment[];
};

export function AssetAttachmentsField({ existing = [] }: AssetAttachmentsFieldProps) {
  const [keptExisting, setKeptExisting] = useState(() => new Set(existing.map((item) => item.id)));
  const [newRows, setNewRows] = useState<NewAttachmentRow[]>([
    { key: "new-0", attachmentType: "foto", notes: "" },
  ]);

  function addRow() {
    setNewRows((rows) => [...rows, { key: `new-${Date.now()}`, attachmentType: "foto", notes: "" }]);
  }

  function removeRow(key: string) {
    setNewRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  return (
    <div className="space-y-4">
      {existing.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Lampiran tersimpan</p>
          {existing.map((item) => {
            const kept = keptExisting.has(item.id);

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={kept}
                    onChange={(event) => {
                      setKeptExisting((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(item.id);
                        } else {
                          next.delete(item.id);
                        }
                        return next;
                      });
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="font-medium text-slate-900">{item.attachmentType}</span>
                    <span className="mt-1 block text-slate-600">{item.filePath}</span>
                    {item.notes ? <span className="mt-1 block text-slate-500">{item.notes}</span> : null}
                  </span>
                </label>
                {kept ? (
                  <>
                    <input type="hidden" name="keepAttachmentIds" value={item.id} />
                    <input type="hidden" name={`attachmentType_${item.id}`} value={item.attachmentType} />
                    <input type="hidden" name={`attachmentPath_${item.id}`} value={item.filePath} />
                    <input type="hidden" name={`attachmentNotes_${item.id}`} value={item.notes ?? ""} />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-800">Tambah lampiran baru</p>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Baris lampiran
          </button>
        </div>

        {newRows.map((row, index) => (
          <div key={row.key} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Jenis lampiran</span>
              <select
                name="newAttachmentType"
                defaultValue={row.attachmentType}
                className={fieldClassName}
              >
                {attachmentTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>File</span>
              <input
                type="file"
                name="newAttachmentFile"
                accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Catatan</span>
              <textarea
                name="newAttachmentNotes"
                defaultValue={row.notes}
                className={textareaClassName}
                placeholder={`Catatan lampiran ${index + 1}`}
              />
            </label>
            {newRows.length > 1 ? (
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus baris
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">Format: PDF, JPG, PNG, WebP, GIF. Maksimal 10 MB per file.</p>
    </div>
  );
}
