export function renderTemplate(template: string, variables: Record<string, any>) {
  return template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, key) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

export function safeJsonParse(input: string) {
  try {
    return { ok: true as const, value: JSON.parse(input) };
  } catch (err: any) {
    return { ok: false as const, error: err?.message || 'Invalid JSON' };
  }
}

