export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getOptionalString(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  return value.length > 0 ? value : null;
}

export function getNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  if (value.length === 0) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getInteger(formData: FormData, key: string) {
  const parsed = getNumber(formData, key);
  return parsed === null ? null : Math.trunc(parsed);
}

export function getDateValue(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  return value.length > 0 ? value : null;
}

export function getFormStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

export function requireString(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}
