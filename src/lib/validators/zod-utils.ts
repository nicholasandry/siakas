import { z } from "zod";

export function valuesOf<const T extends readonly { value: string }[]>(options: T) {
  return options.map((item) => item.value) as [T[number]["value"], ...T[number]["value"][]];
}

export function optionalTrimmedString() {
  return z.preprocess((value) => value ?? "", z.string()).transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  });
}

export function requiredTrimmedString(message = "Wajib diisi") {
  return z.string().trim().min(1, message);
}

export function formatZodError(error: z.ZodError) {
  const first = error.issues[0];
  if (!first) {
    return "Data tidak valid";
  }

  const field = first.path.length > 0 ? `${String(first.path[0])}: ` : "";
  return `${field}${first.message}`;
}

export function formatZodFieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !fields[key]) {
      fields[key] = issue.message;
    }
  }

  return fields;
}

export function parseZod<T>(schema: z.ZodType<T>, data: unknown, label = "Form"): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  return result.data;
}

export function formDataToRecord(formData: FormData) {
  const record: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }

  return record;
}
