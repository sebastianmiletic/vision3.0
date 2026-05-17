import {
  BillboardGraphics,
  Cartesian2,
  Cartesian3,
  ConstantPositionProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  Entity,
  ExtrapolationType,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  PointGraphics,
  PropertyBag,
  SampledPositionProperty,
  VerticalOrigin,
} from 'cesium';

import { buildCesiumColor, buildIconDataUri } from '../../layer-config/iconFactory';
import { getLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { setSatelliteUiStatus } from './satelliteUiTelemetry';

import type { Viewer } from 'cesium';
import type { SatelliteState } from '@vision/shared-types';

const LAYER_ID = 'vision-satellites-layer';
const SMOOTH_SECONDS = 20;
const MAX_SMOOTH_DISTANCE_METERS = 4_000_000;
const ICON_MAX_DISTANCE_METERS = 70_000_000;
const LABEL_MAX_DISTANCE_METERS = 14_000_000;

type VisionEntity = Entity & { __visionVisualSig?: string };

function createSatellitePropertyBag(satellite: SatelliteState) {
  return new PropertyBag({
    layerType: 'satellite',
    name: satellite.name,
    noradId: satellite.noradId,
    altitudeKm: satellite.altitudeKm,
    velocityKps: satellite.velocityKps,
    latitude: satellite.latitude,
    longitude: satellite.longitude,
    sourceTimestamp: satellite.sourceTimestamp,
  });
}

function isValidCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function applyPosition(entity: Entity, satellite: SatelliteState) {
  if (!isValidCoordinates(satellite.latitude, satellite.longitude)) {
    return;
  }

  const altitudeMeters = Math.max((satellite.altitudeKm || 400) * 1000, 1000);
  const nextPosition = Cartesian3.fromDegrees(satellite.longitude, satellite.latitude, altitudeMeters);
  const now = JulianDate.now();
  const currentPosition = entity.position?.getValue(now);

  if (currentPosition && Cartesian3.distance(currentPosition, nextPosition) > MAX_SMOOTH_DISTANCE_METERS) {
    entity.position = new ConstantPositionProperty(nextPosition);
    return;
  }

  const sampled = new SampledPositionProperty();
  sampled.forwardExtrapolationType = ExtrapolationType.HOLD;
  sampled.backwardExtrapolationType = ExtrapolationType.HOLD;
  sampled.addSample(now, currentPosition ?? nextPosition);
  sampled.addSample(JulianDate.addSeconds(now, SMOOTH_SECONDS, new JulianDate()), nextPosition);
  entity.position = sampled;
}

function applyVisuals(entity: Entity, satellite: SatelliteState) {
  const config = getLayerVisualConfig('satellites');
  const sig = `${config.color}|${config.iconPreset}|${config.markerSize}|${config.showLabel}|${config.outlineEnabled}|${config.outlineColor}|${config.outlineWidth}|${config.markerOpacity}|${satellite.name || satellite.noradId}`;
  const visionEntity = entity as VisionEntity;
  if (visionEntity.__visionVisualSig === sig) {
    return;
  }

  visionEntity.__visionVisualSig = sig;
  const color = buildCesiumColor(config.color, config.markerOpacity);
  const outlineColor = buildCesiumColor(config.outlineColor, 1);
  const outlineWidth = config.outlineEnabled ? config.outlineWidth : 0;
  const preset = config.iconPreset === 'dot' ? 'satellite' : config.iconPreset;

  entity.point = config.iconPreset === 'dot' ? new PointGraphics({
    color,
    outlineColor,
    outlineWidth,
    pixelSize: config.markerSize,
    distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
  }) : undefined;
  entity.billboard = config.iconPreset === 'dot' ? undefined : new BillboardGraphics({
    image: buildIconDataUri(preset, config.color, {
      opacity: config.markerOpacity,
      strokeColor: config.outlineEnabled ? config.outlineColor : config.color,
      strokeWidth: outlineWidth,
    }),
    width: config.markerSize * 3,
    height: config.markerSize * 3,
    verticalOrigin: VerticalOrigin.CENTER,
    color,
    distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
  });

  entity.label = config.showLabel
    ? new LabelGraphics({
        text: satellite.name || `SAT-${satellite.noradId}`,
        font: '11px "Share Tech Mono", monospace',
        fillColor: color,
        outlineColor,
        outlineWidth: Math.max(1, outlineWidth + 1),
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.TOP,
        pixelOffset: new Cartesian2(0, -12),
        showBackground: true,
        distanceDisplayCondition: new DistanceDisplayCondition(0, LABEL_MAX_DISTANCE_METERS),
      })
    : undefined;
}

function updateEntity(entity: Entity, satellite: SatelliteState) {
  entity.name = satellite.name;
  entity.properties = createSatellitePropertyBag(satellite);
  applyPosition(entity, satellite);
  applyVisuals(entity, satellite);
}

function createEntity(satellite: SatelliteState): Entity {
  const entity = new Entity({
    id: satellite.id,
    name: satellite.name,
    properties: createSatellitePropertyBag(satellite),
  });

  updateEntity(entity, satellite);
  return entity;
}

export async function ensureSatelliteDataSource(viewer: Viewer): Promise<CustomDataSource> {
  const existing = viewer.dataSources.getByName(LAYER_ID)[0];
  if (existing instanceof CustomDataSource) {
    return existing;
  }

  const dataSource = new CustomDataSource(LAYER_ID);
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

export async function renderSatellites(viewer: Viewer, satellites: SatelliteState[]) {
  const dataSource = await ensureSatelliteDataSource(viewer);
  const config = getLayerVisualConfig('satellites');
  const limited = satellites
    .filter((satellite) => isValidCoordinates(satellite.latitude, satellite.longitude))
    .slice(0, config.maxEntities);

  const usedIds = new Set<string>();
  limited.forEach((satellite) => {
    usedIds.add(satellite.id);
    const entity = dataSource.entities.getById(satellite.id);
    if (entity) {
      updateEntity(entity, satellite);
      return;
    }

    dataSource.entities.add(createEntity(satellite));
  });

  dataSource.entities.values
    .filter((entity) => !usedIds.has(String(entity.id)))
    .forEach((entity) => dataSource.entities.remove(entity));

  setSatelliteUiStatus(`CelesTrak · ${limited.length > 0 ? 'live' : 'waiting...'}`, limited.length);
}
