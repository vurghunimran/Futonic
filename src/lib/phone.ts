export function normalizePhone(value: string) {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!trimmed.startsWith("+") && digits.length === 10 && digits.startsWith("0")) digits = `994${digits.slice(1)}`;
  else if (!trimmed.startsWith("+") && digits.length === 9) digits = `994${digits}`;
  if (digits.length < 8 || digits.length > 15) throw new Error("Enter a valid telephone number including country code.");
  return `+${digits}`;
}

export function phoneLookupValues(value: string) {
  const canonical = normalizePhone(value);
  const legacy = value.trim().replace(/[^+\d]/g, "");
  return [...new Set([canonical, legacy])];
}
