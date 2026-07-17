import { CODE_PREFIXES, CONFIDENCE_WEIGHTS } from './constants';
import type { AssetTypeName, Coordinates } from './types';

export function generateAssetCode(type: AssetTypeName, sequence: number): string {
  const prefix = CODE_PREFIXES[type];
  return `${prefix}-${String(sequence).padStart(6, '0')}`;
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\sáéíóúüñÁÉÍÓÚÜÑ-]/g, '')
    .replace(/(?:^|\s+)\w/g, (char) => char.toUpperCase())
    .trim();
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isWithinBounds(
  coords: Coordinates,
  bounds: { north: number; south: number; east: number; west: number }
): boolean {
  return (
    coords.latitude >= bounds.south &&
    coords.latitude <= bounds.north &&
    coords.longitude >= bounds.west &&
    coords.longitude <= bounds.east
  );
}

export function calculateConfidenceScore(params: {
  validCoordinates: boolean;
  nameIdentified: boolean;
  noDuplicates: boolean;
  hasPhoto: boolean;
  reviewedByAdmin: boolean;
}): number {
  let score = 0;
  if (params.validCoordinates) score += CONFIDENCE_WEIGHTS.VALID_COORDINATES;
  if (params.nameIdentified) score += CONFIDENCE_WEIGHTS.NAME_IDENTIFIED;
  if (params.noDuplicates) score += CONFIDENCE_WEIGHTS.NO_DUPLICATES;
  if (params.hasPhoto) score += CONFIDENCE_WEIGHTS.HAS_PHOTO;
  if (params.reviewedByAdmin) score += CONFIDENCE_WEIGHTS.REVIEWED_BY_ADMIN;
  return Math.min(score, 100);
}

export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aVal =
    sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

export function isDuplicate(
  a: Coordinates,
  b: Coordinates,
  thresholdMeters = 5
): boolean {
  return haversineDistance(a, b) <= thresholdMeters;
}

export function parseWhatsapCoordinate(text: string): Coordinates | null {
  const patterns = [
    /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/,
    /coord(?:enadas)?:?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }
  return null;
}

export function extractAssetName(text: string, type: 'CAJA' | 'MUFFLE'): string | null {
  const pattern =
    type === 'CAJA'
      ? /caja\s*[-:]?\s*(\d+|[a-zA-Z0-9\s]+)/i
      : /mufla\s*[-:]?\s*(\d+|[a-zA-Z0-9\s]+)/i;

  const match = text.match(pattern);
  if (match) {
    return normalizeName(`${type} ${match[1].trim()}`);
  }
  return null;
}

export function parseWhatsAppExport(content: string): Array<{
  rawText: string;
  name?: string;
  coords?: Coordinates;
  assetType?: 'CAJA' | 'MUFFLE';
}> {
  const lines = content.split('\n');
  const results: Array<{
    rawText: string;
    name?: string;
    coords?: Coordinates;
    assetType?: 'CAJA' | 'MUFFLE';
  }> = [];

  for (const line of lines) {
    const cleaned = line
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
      .replace(/\d{1,2}:\d{2}/g, '')
      .replace(/[^\x20-\x7EáéíóúüñÁÉÍÓÚÜÑ\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 5) continue;

    const coords = parseWhatsapCoordinate(cleaned);
    const cajaName = extractAssetName(cleaned, 'CAJA');
    const muffeName = extractAssetName(cleaned, 'MUFFLE');

    if (coords || cajaName || muffeName) {
      results.push({
        rawText: cleaned,
        name: cajaName || muffeName || undefined,
        coords: coords || undefined,
        assetType: cajaName ? 'CAJA' : muffeName ? 'MUFFLE' : undefined,
      });
    }
  }

  return results;
}
