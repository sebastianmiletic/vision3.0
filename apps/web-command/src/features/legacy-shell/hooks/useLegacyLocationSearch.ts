import { useEffect } from 'react';
import {
  BillboardGraphics,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  ConstantPositionProperty,
  Cartographic,
  Color,
  HeadingPitchRange,
  HeightReference,
  LabelGraphics,
  LabelStyle,
  Math as CesiumMath,
  VerticalOrigin,
} from 'cesium';

import { geocodePlace } from '../../../services/integrations/geocodingService';
import { setText } from '../utils/domUi';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

const SEARCH_PIN_ID = 'vision-search-pin';

type ParsedLatLon = {
  latitude: number;
  longitude: number;
};

function parseLatLon(query: string): ParsedLatLon | null {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : '#26c9ff';
}

function markerSvgDataUri(color: string) {
  const safe = normalizeHexColor(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="${safe}" d="M32 4c-11 0-20 9-20 20 0 14 20 36 20 36s20-22 20-36C52 13 43 4 32 4z"/><circle cx="32" cy="24" r="8" fill="#e9f3ff"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getAccentColor() {
  const cssValue = getComputedStyle(document.documentElement).getPropertyValue('--cyan');
  return normalizeHexColor(cssValue || '#26c9ff');
}

function trimLabel(label: string) {
  return label.length > 52 ? `${label.slice(0, 49)}...` : label;
}

function updateLocationInspectorFields(label: string, latitude: number, longitude: number) {
  const fields = document.getElementById('keyLocationInspectFields');
  if (!fields) {
    return;
  }

  fields.innerHTML = `
    <div><strong>NAME</strong><p>${label}</p></div>
    <div><strong>LAT</strong><p>${latitude.toFixed(6)}</p></div>
    <div><strong>LON</strong><p>${longitude.toFixed(6)}</p></div>
  `;
}

function addOrUpdateSearchPin(viewer: Viewer, label: string, latitude: number, longitude: number) {
  const accent = getAccentColor();
  const entity = viewer.entities.getById(SEARCH_PIN_ID) ?? viewer.entities.add({ id: SEARCH_PIN_ID });
  const cartographic = Cartographic.fromDegrees(longitude, latitude);
  const surfaceHeight = viewer.scene.globe.getHeight(cartographic) ?? 0;

  entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(longitude, latitude, Math.max(surfaceHeight + 14, 14)));
  entity.name = label;
  entity.billboard = new BillboardGraphics({
    image: markerSvgDataUri(accent),
    width: 24,
    height: 24,
    verticalOrigin: VerticalOrigin.BOTTOM,
    heightReference: HeightReference.NONE,
  });
  entity.label = new LabelGraphics({
    text: trimLabel(label),
    font: '12px "Share Tech Mono", monospace',
    fillColor: Color.fromCssColorString(accent),
    style: LabelStyle.FILL_AND_OUTLINE,
    outlineColor: Color.BLACK,
    outlineWidth: 2,
    pixelOffset: new Cartesian2(0, -22),
    showBackground: true,
    verticalOrigin: VerticalOrigin.TOP,
  });
}

function flyToLandmarkPerspective(viewer: Viewer, latitude: number, longitude: number) {
  const target = Cartesian3.fromDegrees(longitude, latitude, 0);
  const sphere = new BoundingSphere(target, 140);
  viewer.trackedEntity = undefined;
  viewer.camera.flyToBoundingSphere(sphere, {
    duration: 2.6,
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(36),
      CesiumMath.toRadians(-29),
      2400,
    ),
  });
}

async function resolveSearchQuery(query: string) {
  const parsed = parseLatLon(query);
  if (parsed) {
    return {
      label: `Coordinates ${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)}`,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  }

  return geocodePlace(query);
}

export function useLegacyLocationSearch(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    const locationSearch = document.getElementById('locationSearch') as HTMLInputElement | null;
    if (!locationSearch) {
      return;
    }

    const onLocationKeydown = async (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      const viewer = viewerRef.current;
      const query = locationSearch.value.trim();
      if (!viewer || !query) {
        return;
      }

      setText('searchStatus', 'Resolving location...');
      const result = await resolveSearchQuery(query);
      if (!result) {
        setText('searchStatus', 'Location not found. Try a clearer place name.');
        return;
      }

      const { label, latitude, longitude } = result;
      addOrUpdateSearchPin(viewer, label, latitude, longitude);
      updateLocationInspectorFields(label, latitude, longitude);

      flyToLandmarkPerspective(viewer, latitude, longitude);
      window.dispatchEvent(new CustomEvent('vision:location-search-resolved', {
        detail: { label, latitude, longitude },
      }));

      setText('searchStatus', `${label} · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      setText('keyLocationInspectStatus', `Inspected: ${label}`);
    };

    locationSearch.addEventListener('keydown', onLocationKeydown);
    return () => locationSearch.removeEventListener('keydown', onLocationKeydown);
  }, [viewerRef]);
}
