
export const parseCommaList = (value: string) =>
  value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

export const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
};

export const uniq = (arr: string[]) => Array.from(new Set(arr));

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

export const formatNumber = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString();
};

export const formatPct = (value: number | null | undefined) => {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '-';
  return `${(n * 100).toFixed(1)}%`;
};

export const progressPct = (used: number, limit: number | null) => {
  if (!limit || limit <= 0) return 0;
  const pct = Math.floor((used / limit) * 100);
  return Math.max(0, Math.min(100, pct));
};

export const copyToClipboard = async (text: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
