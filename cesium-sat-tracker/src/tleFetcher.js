import { cleanSatelliteName } from "./utils.js";

const CELESTRAK_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php";

export async function fetchTLEGroup(groupName) {
  const url = new URL(CELESTRAK_BASE_URL);
  url.searchParams.set("GROUP", groupName);
  url.searchParams.set("FORMAT", "tle");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`CelesTrak request failed: HTTP ${response.status}`);
  }

  const text = await response.text();
  const parsed = parseTLEText(text);

  if (!parsed.length) {
    throw new Error("No TLEs returned for this group.");
  }

  return parsed;
}

export function parseTLEText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const satellites = [];

  for (let i = 0; i < lines.length; i += 3) {
    const nameLine = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (!nameLine || !line1 || !line2) {
      continue;
    }

    if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) {
      continue;
    }

    satellites.push({
      id: `${cleanSatelliteName(nameLine)}-${i}`,
      name: cleanSatelliteName(nameLine),
      line1,
      line2
    });
  }

  return satellites;
}
