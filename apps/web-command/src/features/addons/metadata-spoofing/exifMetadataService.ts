import * as exifr from 'exifr';

export type MetadataSummaryItem = {
  label: string;
  value: string;
};

export type MetadataTagItem = {
  key: string;
  value: string;
};

export type ParsedMetadataReport = {
  summary: MetadataSummaryItem[];
  tags: MetadataTagItem[];
  rawJson: string;
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '--';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '--';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(6);
  }

  if (typeof value === 'string') {
    return value.trim() || '--';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }

  return JSON.stringify(value);
}

function buildSummary(file: File, parsed: Record<string, unknown>): MetadataSummaryItem[] {
  const summary: MetadataSummaryItem[] = [
    { label: 'File Name', value: file.name },
    { label: 'File Type', value: file.type || 'Unknown' },
    { label: 'File Size', value: formatBytes(file.size) },
    { label: 'Camera', value: formatValue(parsed.Model ?? parsed.Make) },
    { label: 'Lens', value: formatValue(parsed.LensModel) },
    { label: 'Captured', value: formatValue(parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.ModifyDate) },
    { label: 'ISO', value: formatValue(parsed.ISO) },
    { label: 'Exposure', value: formatValue(parsed.ExposureTime) },
    { label: 'F Number', value: formatValue(parsed.FNumber) },
    { label: 'Focal Length', value: formatValue(parsed.FocalLength) },
    { label: 'Latitude', value: formatValue(parsed.latitude ?? parsed.GPSLatitude) },
    { label: 'Longitude', value: formatValue(parsed.longitude ?? parsed.GPSLongitude) },
  ];

  return summary;
}

function buildTags(parsed: Record<string, unknown>): MetadataTagItem[] {
  return Object.entries(parsed)
    .filter(([, value]) => value !== null && value !== undefined && formatValue(value) !== '--')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      value: formatValue(value),
    }));
}

export async function extractExifMetadata(file: File): Promise<ParsedMetadataReport> {
  const parsedData = (await exifr.parse(file, true)) as Record<string, unknown> | null;
  const parsed = parsedData ?? {};

  return {
    summary: buildSummary(file, parsed),
    tags: buildTags(parsed),
    rawJson: JSON.stringify(parsed, null, 2),
  };
}
