export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(cell: CsvCell) {
  if (cell === null || cell === undefined) return "";
  const text = String(cell);
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * RFC 4180 CSV s BOM-om na početku: bez njega Excel otvara UTF-8 kao
 * Windows-1250 i č/ć/š/ž postanu kvačice.
 */
export function toCsv(header: string[], rows: CsvCell[][]) {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
