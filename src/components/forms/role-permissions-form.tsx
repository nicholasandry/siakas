"use client";

import type { RbacPermissionItem } from "@/lib/rbac";

type RolePermissionsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  roleCode: string;
  roleName: string;
  permissions: RbacPermissionItem[];
  grantedCodes: string[];
  readOnly?: boolean;
};

const resourceLabels: Record<string, string> = {
  unit: "Unit",
  "badan-hukum": "Badan Hukum",
  asset: "Aset",
  "tax-master": "Master Pajak",
  rbac: "RBAC",
  audit: "Audit",
};

function groupPermissions(permissions: RbacPermissionItem[]) {
  return permissions.reduce<Record<string, RbacPermissionItem[]>>((groups, permission) => {
    const key = permission.resource;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(permission);
    return groups;
  }, {});
}

export function RolePermissionsForm({
  action,
  submitLabel,
  roleCode,
  roleName,
  permissions,
  grantedCodes,
  readOnly = false,
}: RolePermissionsFormProps) {
  const grantedSet = new Set(grantedCodes);
  const groups = groupPermissions(permissions);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="roleCode" value={roleCode} />

      <p className="text-sm text-slate-600">
        Atur permission untuk role <span className="font-semibold text-slate-900">{roleName}</span>.
        {readOnly ? " Role sistem ini tidak dapat diubah." : null}
      </p>

      {Object.entries(groups).map(([resource, items]) => (
        <section key={resource} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {resourceLabels[resource] ?? resource}
            </h3>
            {!readOnly ? (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    document
                      .querySelectorAll<HTMLInputElement>(`input[data-perm-resource="${resource}"]`)
                      .forEach((input) => {
                        input.checked = true;
                      });
                  }}
                >
                  Pilih semua
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    document
                      .querySelectorAll<HTMLInputElement>(`input[data-perm-resource="${resource}"]`)
                      .forEach((input) => {
                        input.checked = false;
                      });
                  }}
                >
                  Kosongkan
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((permission) => (
              <label
                key={permission.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name={`perm_${permission.code}`}
                  data-perm-resource={resource}
                  defaultChecked={grantedSet.has(permission.code)}
                  disabled={readOnly}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 disabled:opacity-60"
                />
                <span>
                  <span className="block font-medium text-slate-900">{permission.code}</span>
                  <span className="block text-xs text-slate-500">{permission.description ?? permission.action}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      {!readOnly ? (
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {submitLabel}
        </button>
      ) : null}
    </form>
  );
}
