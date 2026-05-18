import {
  Cartesian2,
  Color,
  DistanceDisplayCondition,
  Entity,
  GeoJsonDataSource,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  PolylineOutlineMaterialProperty,
  VerticalOrigin,
} from 'cesium';

import { buildCesiumColor } from '../../layer-config/iconFactory';
import { getLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { setBordersLabelsUiStatus } from './bordersLabelsUiTelemetry';

import type { Viewer } from 'cesium';

const LAYER_KEY = 'bordersLabels';
const COUNTRY_BORDERS_SOURCE_ID = 'vision-country-borders-layer';
const PLACE_LABELS_SOURCE_ID = 'vision-place-labels-layer';
const COUNTRY_BORDERS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson';
const PLACE_LABELS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places_simple.geojson';
const LABEL_MIN_DISTANCE = 0;
const LABEL_MAX_DISTANCE = 1_000_000_000;
const BORDER_MAX_DISTANCE = 1_000_000_000;

type PlaceCandidate = {
  entity: Entity;
  score: number;
  label: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readEntityProps(entity: Entity): Record<string, unknown> {
  const now = JulianDate.now();
  const props = entity.properties?.getValue(now);
  if (!props || typeof props !== 'object') {
    return {};
  }

  return props as Record<string, unknown>;
}

function getPlaceLabel(entity: Entity, props: Record<string, unknown>): string {
  const raw = entity.name
    ?? (typeof props.nameascii === 'string' ? props.nameascii : undefined)
    ?? (typeof props.name === 'string' ? props.name : undefined)
    ?? (typeof props.ls_name === 'string' ? props.ls_name : undefined)
    ?? 'Unknown place';

  return String(raw).replace(/\d+$/, '').trim();
}

function scorePlace(props: Record<string, unknown>): number {
  const labelRank = toNumber(props.labelrank, 12);
  const population = Math.max(0, toNumber(props.pop_max, 0));
  const isCapital = toNumber(props.adm0cap, 0) === 1;
  const isWorldCity = toNumber(props.worldcity, 0) === 1;
  const isMegacity = toNumber(props.megacity, 0) === 1;

  const labelRankScore = Math.max(0, 14 - labelRank) * 16;
  const populationScore = Math.min(120, Math.log10(population + 1) * 15);
  const capitalScore = isCapital ? 85 : 0;
  const worldCityScore = isWorldCity ? 35 : 0;
  const megaCityScore = isMegacity ? 22 : 0;

  return labelRankScore + populationScore + capitalScore + worldCityScore + megaCityScore;
}

function applyBordersStyling(dataSource: GeoJsonDataSource) {
  const config = getLayerVisualConfig(LAYER_KEY);
  const borderColor = buildCesiumColor(config.color, Math.min(1, config.markerOpacity + 0.04));
  const outlineColor = buildCesiumColor(config.outlineColor, Math.min(1, config.markerOpacity * 0.78));
  const width = Math.max(1.3, config.outlineWidth * 1.45);
  const enabled = config.outlineEnabled;

  dataSource.entities.values.forEach((entity) => {
    if (entity.polyline) {
      entity.polyline.show = enabled;
      entity.polyline.width = width;
      entity.polyline.material = new PolylineOutlineMaterialProperty({
        color: borderColor,
        outlineColor,
        outlineWidth: Math.max(1, width * 0.62),
      });
      entity.polyline.distanceDisplayCondition = new DistanceDisplayCondition(0, BORDER_MAX_DISTANCE);
      return;
    }

    if (entity.corridor) {
      entity.corridor.show = enabled;
      entity.corridor.material = borderColor;
      entity.corridor.outline = true;
      entity.corridor.outlineColor = outlineColor;
      entity.corridor.outlineWidth = Math.max(1, width * 0.65);
    }
  });
}

function applyPlaceLabelStyling(dataSource: GeoJsonDataSource): number {
  const config = getLayerVisualConfig(LAYER_KEY);
  const labelColor = buildCesiumColor(config.color, 0.98);
  const labelOutlineColor = buildCesiumColor(config.outlineColor, 0.92);
  const fontSize = Math.max(10, Math.round(config.markerSize + 5));

  const candidates: PlaceCandidate[] = [];
  dataSource.entities.values.forEach((entity) => {
    entity.billboard = undefined;
    entity.point = undefined;
    entity.label = undefined;

    const props = readEntityProps(entity);
    const label = getPlaceLabel(entity, props);
    const score = scorePlace(props);

    candidates.push({
      entity,
      score,
      label,
    });
  });

  if (!config.showLabel) {
    return 0;
  }

  const limit = Math.max(1, config.maxEntities);
  const selected = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  selected.forEach(({ entity, label, score }) => {
    const emphasis = score > 185;
    entity.label = new LabelGraphics({
      text: label,
      font: `${emphasis ? fontSize + 1 : fontSize}px "Share Tech Mono", monospace`,
      fillColor: labelColor,
      outlineColor: labelOutlineColor,
      outlineWidth: Math.max(1, config.outlineWidth + 0.8),
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian2(0, -3),
      showBackground: emphasis,
      backgroundColor: Color.fromCssColorString('#04070c').withAlpha(0.64),
      distanceDisplayCondition: new DistanceDisplayCondition(LABEL_MIN_DISTANCE, LABEL_MAX_DISTANCE),
      disableDepthTestDistance: 5_000_000,
    });
  });

  return selected.length;
}

export async function ensureCountryBordersDataSource(viewer: Viewer): Promise<GeoJsonDataSource> {
  const existing = viewer.dataSources.getByName(COUNTRY_BORDERS_SOURCE_ID)[0];
  if (existing) {
    return existing as GeoJsonDataSource;
  }

  const dataSource = new GeoJsonDataSource(COUNTRY_BORDERS_SOURCE_ID);
  await dataSource.load(COUNTRY_BORDERS_URL, {
    stroke: Color.TRANSPARENT,
    strokeWidth: 2.1,
    clampToGround: true,
  });
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

export async function ensurePlaceLabelsDataSource(viewer: Viewer): Promise<GeoJsonDataSource> {
  const existing = viewer.dataSources.getByName(PLACE_LABELS_SOURCE_ID)[0];
  if (existing) {
    return existing as GeoJsonDataSource;
  }

  const dataSource = new GeoJsonDataSource(PLACE_LABELS_SOURCE_ID);
  await dataSource.load(PLACE_LABELS_URL, {
    markerSymbol: '',
    markerSize: 1,
    clampToGround: false,
  });
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

export async function applyBordersLabelsLayer(viewer: Viewer, enabled: boolean) {
  const bordersSource = await ensureCountryBordersDataSource(viewer);
  const labelsSource = await ensurePlaceLabelsDataSource(viewer);
  const borderSources = viewer.dataSources.getByName(COUNTRY_BORDERS_SOURCE_ID);
  const labelSources = viewer.dataSources.getByName(PLACE_LABELS_SOURCE_ID);
  const config = getLayerVisualConfig(LAYER_KEY);
  const bordersEnabled = enabled && config.outlineEnabled;
  const labelsEnabled = enabled && config.showLabel;

  borderSources.forEach((source) => {
    source.show = bordersEnabled;
  });
  labelSources.forEach((source) => {
    source.show = labelsEnabled;
  });

  if (!enabled) {
    setBordersLabelsUiStatus('Natural Earth borders · disabled', 0);
    viewer.scene.requestRender();
    return;
  }

  if (bordersEnabled) {
    applyBordersStyling(bordersSource);
  }
  const labelCount = labelsEnabled ? applyPlaceLabelStyling(labelsSource) : 0;
  const borderCount = bordersSource.entities.values.length;
  if (!bordersEnabled && !labelsEnabled) {
    setBordersLabelsUiStatus('Natural Earth borders · hidden by config', 0);
  } else if (!bordersEnabled) {
    setBordersLabelsUiStatus('Natural Earth borders · off', labelCount);
  } else {
    setBordersLabelsUiStatus(`Natural Earth borders · ${borderCount} segments`, labelCount);
  }
  viewer.scene.requestRender();
}
