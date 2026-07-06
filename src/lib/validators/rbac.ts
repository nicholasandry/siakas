import { z } from "zod";

import { optionalTrimmedString, requiredTrimmedString } from "@/lib/validators/zod-utils";

const MIN_PASSWORD_LENGTH = 8;

export const rbacUserCreateSchema = z.object({
  name: requiredTrimmedString("Nama wajib diisi").max(160, "Nama maksimal 160 karakter"),
  email: z.string().trim().email("Format email tidak valid").max(191, "Email terlalu panjang"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password minimal ${MIN_PASSWORD_LENGTH} karakter`),
  roleId: requiredTrimmedString("Role wajib dipilih"),
  unitId: optionalTrimmedString(),
  badanHukumId: optionalTrimmedString(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const rbacUserUpdateSchema = rbacUserCreateSchema.omit({ email: true, password: true });

export const rbacPasswordResetSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password minimal ${MIN_PASSWORD_LENGTH} karakter`),
    confirmPassword: z.string().min(MIN_PASSWORD_LENGTH, `Password minimal ${MIN_PASSWORD_LENGTH} karakter`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
