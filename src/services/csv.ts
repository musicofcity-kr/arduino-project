export interface CsvOptions {
  bom?: boolean;
}

export function csvCell(value: unknown): string {
  const text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  const safeText = typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}

export function rowsToCsv(rows: readonly (readonly unknown[])[], options: CsvOptions = {}): string {
  const body = `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
  return options.bom ? `\uFEFF${body}` : body;
}
