import {
  BillboardGraphics,
  Cartesian2,
  Cartesian3,
  ColorMaterialProperty,
  ConstantPositionProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  Entity,
  ExtrapolationType,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  PathGraphics,
  PointGraphics,
  PolylineGraphics,
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
type TrackPoint = { time: JulianDate; position: Cartesian3; latitude: number; longitude: number; altitudeMeters: number };

const historyBySatelliteId = new Map<string, TrackPoint[]>();

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

function destinationFrom(latDeg: number, lonDeg: number, headingDeg: number, distanceMeters: number) {
  const earthRadiusMeters = 6_371_000;
  const angularDistance = distanceMeters / earthRadiusMeters;
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const bearing = (headingDeg * Math.PI) / 180;

  const nextLat = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance)
      + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLon = lonRad + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
    Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(nextLat),
  );

  return {
    latitude: (nextLat * 180) / Math.PI,
    longitude: (nextLon * 180) / Math.PI,
  };
}

function bearingBetween(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const fromLatRad = (fromLat * Math.PI) / 180;
  const fromLonRad = (fromLon * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;
  const toLonRad = (toLon * Math.PI) / 180;
  const y = Math.sin(toLonRad - fromLonRad) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad)
    - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(toLonRad - fromLonRad);
  const heading = (Math.atan2(y, x) * 180) / Math.PI;
  return (heading + 360) % 360;
}

function applyPosition(entity: Entity, satellite: SatelliteState) {
  if (!isValidCoordinates(satellite.latitude, satellite.longitude)) {
    return;
  }

  const altitudeMeters = Math.max((satellite.altitudeKm || 400) * 1000, 1000);
  const nextPosition = Cartesian3.fromDegrees(satellite.longitude, satellite.latitude, altitudeMeters);
  const now = JulianDate.now();
  const currentPosition = entity.position?.getValue(now);
  const config = getLayerVisualConfig('satellites');
  const historyTtlSeconds = Math.max(180, config.orbitMinutes * 60 + 180);
  const history = historyBySatelliteId.get(satellite.id) ?? [];

  if (currentPosition && Cartesian3.distance(currentPosition, nextPosition) > MAX_SMOOTH_DISTANCE_METERS) {
    history.length = 0;
    entity.position = new ConstantPositionProperty(nextPosition);
    history.push({
      time: now,
      position: nextPosition,
      latitude: satellite.latitude,
      longitude: satellite.longitude,
      altitudeMeters,
    });
    historyBySatelliteId.set(satellite.id, history);
    return;
  }

  history.push({
    time: now,
    position: nextPosition,
    latitude: satellite.latitude,
    longitude: satellite.longitude,
    altitudeMeters,
  });
  const cutoff = JulianDate.addSeconds(now, -historyTtlSeconds, new JulianDate());
  const pruned = history.filter((point) => JulianDate.greaterThanOrEquals(point.time, cutoff));
  historyBySatelliteId.set(satellite.id, pruned);

  const sampled = new SampledPositionProperty();
  sampled.forwardExtrapolationType = ExtrapolationType.HOLD;
  sampled.backwardExtrapolationType = ExtrapolationType.HOLD;
  pruned.forEach((point) => sampled.addSample(point.time, point.position));
  sampled.addSample(JulianDate.addSeconds(now, SMOOTH_SECONDS, new JulianDate()), nextPosition);

  const showPredictive = config.showOrbit || config.showPath;
  if (showPredictive) {
    const leadMinutes = config.showOrbit ? config.orbitMinutes : config.pathLeadMinutes;
    const leadSeconds = leadMinutes * 60;
    const speedMetersPerSecond = Math.max((satellite.velocityKps || 0) * 1000, 0);
    const distanceMeters = speedMetersPerSecond * leadSeconds;
    const previousPoint = pruned.length > 1 ? pruned[pruned.length - 2] : undefined;
    const heading = previousPoint
      ? bearingBetween(previousPoint.latitude, previousPoint.longitude, satellite.latitude, satellite.longitude)
      : 90;
    const projected = destinationFrom(satellite.latitude, satellite.longitude, heading, distanceMeters);
    if (isValidCoordinates(projected.latitude, projected.longitude)) {
      const projectedPosition = Cartesian3.fromDegrees(projected.longitude, projected.latitude, altitudeMeters);
      sampled.addSample(JulianDate.addSeconds(now, leadSeconds, new JulianDate()), projectedPosition);
    }
  }

  entity.position = sampled;
}

function applyVisuals(entity: Entity, satellite: SatelliteState) {
  const config = getLayerVisualConfig('satellites');
  const sig = `${config.color}|${config.iconPreset}|${config.markerSize}|${config.showLabel}|${config.outlineEnabled}|${config.outlineColor}|${config.outlineWidth}|${config.markerOpacity}|${config.showTrail}|${config.trailMinutes}|${config.showPath}|${config.pathLeadMinutes}|${config.showOrbit}|${config.orbitMinutes}|${satellite.name || satellite.noradId}`;
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

  const trailSeconds = config.showOrbit
    ? config.orbitMinutes * 60
    : config.showTrail ? config.trailMinutes * 60 : 0;
  const leadSeconds = config.showOrbit
    ? config.orbitMinutes * 60
    : config.showPath ? config.pathLeadMinutes * 60 : 0;

  if (trailSeconds > 0 || leadSeconds > 0) {
    entity.path = new PathGraphics({
      width: Math.max(1, config.outlineWidth + 1),
      leadTime: leadSeconds,
      trailTime: trailSeconds,
      resolution: 10,
      material: new ColorMaterialProperty(buildCesiumColor(config.color, Math.min(0.66, config.markerOpacity))),
      distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
    });
  } else {
    entity.path = undefined;
  }

  if (config.showOrbit || config.showPath) {
    const history = historyBySatelliteId.get(satellite.id) ?? [];
    const started = history[0];
    const previousPoint = history.length > 1 ? history[history.length - 2] : undefined;
    const heading = previousPoint
      ? bearingBetween(previousPoint.latitude, previousPoint.longitude, satellite.latitude, satellite.longitude)
      : 90;
    const leadMinutes = config.showOrbit ? config.orbitMinutes : config.pathLeadMinutes;
    const distanceMeters = Math.max((satellite.velocityKps || 0) * 1000, 0) * leadMinutes * 60;
    const projected = destinationFrom(satellite.latitude, satellite.longitude, heading, distanceMeters);
    if (isValidCoordinates(projected.latitude, projected.longitude)) {
      const altitudeMeters = Math.max((satellite.altitudeKm || 400) * 1000, 1000);
      const startPosition = started
        ? Cartesian3.fromDegrees(started.longitude, started.latitude, started.altitudeMeters)
        : Cartesian3.fromDegrees(satellite.longitude, satellite.latitude, altitudeMeters);
      const currentPosition = Cartesian3.fromDegrees(satellite.longitude, satellite.latitude, altitudeMeters);
      const projectedPosition = Cartesian3.fromDegrees(projected.longitude, projected.latitude, altitudeMeters);
      entity.polyline = new PolylineGraphics({
        positions: [startPosition, currentPosition, projectedPosition],
        width: Math.max(1, config.outlineWidth + 1),
        material: new ColorMaterialProperty(buildCesiumColor(config.color, 0.42)),
        distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
      });
    }
  } else {
    entity.polyline = undefined;
  }
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

  for (let index = dataSource.entities.values.length - 1; index >= 0; index -= 1) {
    const entity = dataSource.entities.values[index];
    if (!entity) {
      continue;
    }
    const entityId = String(entity.id);
    if (usedIds.has(entityId)) {
      continue;
    }
    historyBySatelliteId.delete(entityId);
    dataSource.entities.remove(entity);
  }

  setSatelliteUiStatus(`CelesTrak · ${limited.length > 0 ? 'live' : 'waiting...'}`, limited.length);
  viewer.scene.requestRender();
}
