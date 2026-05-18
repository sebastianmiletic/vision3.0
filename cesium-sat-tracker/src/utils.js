export const EARTH_RADIUS_KM = 6371;

export function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function normalizeLongitude(degrees) {
  let value = degrees;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

export function formatAltitudeKm(valueKm) {
  if (!Number.isFinite(valueKm)) {
    return "Alt: -- km";
  }
  return `Alt: ${Math.round(valueKm)} km`;
}

export function formatLatLon(latDeg, lonDeg) {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
    return "Lat/Lon: --";
  }

  const latHem = latDeg >= 0 ? "N" : "S";
  const lonHem = lonDeg >= 0 ? "E" : "W";
  return `Lat/Lon: ${Math.abs(latDeg).toFixed(2)}${latHem}, ${Math.abs(lonDeg).toFixed(2)}${lonHem}`;
}

export function buildSatelliteLabel(name, altKm, latDeg, lonDeg) {
  return `${name}\n${formatAltitudeKm(altKm)}\n${formatLatLon(latDeg, lonDeg)}`;
}

export function cleanSatelliteName(rawName) {
  if (!rawName) {
    return "UNKNOWN";
  }
  return rawName.replace(/^0\s+/, "").trim();
}

export function clampDisplayLimit(value, min = 1, max = 5000) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}
