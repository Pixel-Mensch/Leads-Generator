const SOURCE_LABELS: Record<string, string> = {
  overpass: "OpenStreetMap",
  gelbeseiten: "Gelbe Seiten",
  both: "Kombinierte Quellen",
};

export function formatSourceToken(source: string | null | undefined): string | null {
  const trimmed = source?.trim();
  if (!trimmed) return null;

  return SOURCE_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

export function formatSourceName(sourceName: string | null | undefined): string | null {
  const labels = (sourceName ?? "")
    .split(",")
    .map((value) => formatSourceToken(value))
    .filter((value): value is string => Boolean(value));

  if (!labels.length) return null;

  return [...new Set(labels)].join(", ");
}
