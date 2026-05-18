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
  Math as CesiumMath,
  PathGraphics,
  PointGraphics,
  PolylineGraphics,
  PropertyBag,
  SampledPositionProperty,
  VerticalOrigin,
} from 'cesium';

import { buildCesiumColor, buildIconDataUri } from '../../layer-config/iconFactory';
import { getLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { setMilitaryFlightUiStatus } from './militaryFlightUiTelemetry';

import type { Viewer } from 'cesium';
import type { FlightTrack } from '@vision/shared-types';

const LAYER_ID = 'vision-military-flights-layer';
const SMOOTH_SECONDS = 10;
const MAX_SMOOTH_DISTANCE_METERS = 900_000;
const ICON_MAX_DISTANCE_METERS = 1_000_000_000;
const LABEL_MAX_DISTANCE_METERS = 1_000_000_000;

type VisionEntity = Entity & { __visionVisualSig?: string };
type TrackPoint = { time: JulianDate; position: Cartesian3; latitude: number; longitude: number; altitudeMeters: number };

const historyByMilitaryId = new Map<string, TrackPoint[]>();

function createPropertyBag(flight: FlightTrack) {
  return new PropertyBag({
    layerType: 'military',
    callsign: flight.callsign || 'UNK',
    headingDegrees: flight.headingDegrees,
    speedKnots: flight.speedKnots,
    altitudeMeters: flight.altitudeMeters,
    latitude: flight.latitude,
    longitude: flight.longitude,
    sourceTimestamp: flight.sourceTimestamp,
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
  const latRad = CesiumMath.toRadians(latDeg);
  const lonRad = CesiumMath.toRadians(lonDeg);
  const bearing = CesiumMath.toRadians(headingDeg);

  const nextLat = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance)
      + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLon = lonRad + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
    Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(nextLat),
  );

  return {
    latitude: CesiumMath.toDegrees(nextLat),
    longitude: CesiumMath.toDegrees(nextLon),
  };
}

function applyPosition(entity: Entity, flight: FlightTrack) {
  if (!isValidCoordinates(flight.latitude, flight.longitude)) {
    return;
  }

  const nextPosition = Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 12));
  const now = JulianDate.now();
  const currentPosition = entity.position?.getValue(now);
  const config = getLayerVisualConfig('military');
  const historyTtlSeconds = Math.max(120, config.trailMinutes * 60 + 120);
  const history = historyByMilitaryId.get(flight.id) ?? [];

  if (currentPosition && Cartesian3.distance(currentPosition, nextPosition) > MAX_SMOOTH_DISTANCE_METERS) {
    history.length = 0;
    entity.position = new ConstantPositionProperty(nextPosition);
    history.push({
      time: now,
      position: nextPosition,
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitudeMeters: Math.max(flight.altitudeMeters, 12),
    });
    historyByMilitaryId.set(flight.id, history);
    return;
  }

  history.push({
    time: now,
    position: nextPosition,
    latitude: flight.latitude,
    longitude: flight.longitude,
    altitudeMeters: Math.max(flight.altitudeMeters, 12),
  });
  const cutoff = JulianDate.addSeconds(now, -historyTtlSeconds, new JulianDate());
  const pruned = history.filter((point) => JulianDate.greaterThanOrEquals(point.time, cutoff));
  historyByMilitaryId.set(flight.id, pruned);

  const sampled = new SampledPositionProperty();
  sampled.forwardExtrapolationType = ExtrapolationType.HOLD;
  sampled.backwardExtrapolationType = ExtrapolationType.HOLD;
  pruned.forEach((point) => sampled.addSample(point.time, point.position));
  sampled.addSample(JulianDate.addSeconds(now, SMOOTH_SECONDS, new JulianDate()), nextPosition);

  if (config.showPath) {
    const leadSeconds = config.pathLeadMinutes * 60;
    const distanceMeters = Math.max(0, flight.speedKnots) * 0.514444 * leadSeconds;
    const projected = destinationFrom(flight.latitude, flight.longitude, flight.headingDegrees || 0, distanceMeters);
    if (isValidCoordinates(projected.latitude, projected.longitude)) {
      const projectedPosition = Cartesian3.fromDegrees(projected.longitude, projected.latitude, Math.max(flight.altitudeMeters, 12));
      sampled.addSample(JulianDate.addSeconds(now, leadSeconds, new JulianDate()), projectedPosition);
    }
  }

  entity.position = sampled;
}

function applyVisuals(entity: Entity, flight: FlightTrack) {
  const config = getLayerVisualConfig('military');
  const sig = `${config.color}|${config.iconPreset}|${config.markerSize}|${config.showLabel}|${config.outlineEnabled}|${config.outlineColor}|${config.outlineWidth}|${config.markerOpacity}|${config.showTrail}|${config.trailMinutes}|${config.showPath}|${config.pathLeadMinutes}|${flight.callsign || 'UNK'}`;
  const visionEntity = entity as VisionEntity;
  if (visionEntity.__visionVisualSig === sig) {
    return;
  }

  visionEntity.__visionVisualSig = sig;
  const color = buildCesiumColor(config.color, config.markerOpacity);
  const outlineColor = buildCesiumColor(config.outlineColor, 1);
  const outlineWidth = config.outlineEnabled ? config.outlineWidth : 0;
  const preset = config.iconPreset === 'satellite' ? 'plane' : config.iconPreset;

  if (preset === 'dot') {
    entity.point = new PointGraphics({
      color,
      outlineColor,
      outlineWidth,
      pixelSize: config.markerSize,
      distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
    });
    entity.billboard = undefined;
  } else {
    entity.point = undefined;
    entity.billboard = new BillboardGraphics({
      image: buildIconDataUri('plane', config.color, {
        opacity: config.markerOpacity,
        strokeColor: config.outlineEnabled ? config.outlineColor : config.color,
        strokeWidth: outlineWidth,
      }),
      width: config.markerSize * 3.2,
      height: config.markerSize * 3.2,
      verticalOrigin: VerticalOrigin.CENTER,
      color,
      alignedAxis: Cartesian3.UNIT_Z,
      rotation: CesiumMath.toRadians(360 - (flight.headingDegrees || 0)),
      distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
    });
  }

  entity.label = config.showLabel
    ? new LabelGraphics({
        text: flight.callsign || 'MIL',
        font: '12px "Share Tech Mono", monospace',
        fillColor: color,
        outlineColor,
        outlineWidth: Math.max(1, outlineWidth + 1),
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.TOP,
        pixelOffset: new Cartesian2(0, -14),
        showBackground: true,
        distanceDisplayCondition: new DistanceDisplayCondition(0, LABEL_MAX_DISTANCE_METERS),
      })
    : undefined;

  if (config.showTrail || config.showPath) {
    entity.path = new PathGraphics({
      width: Math.max(1, config.outlineWidth + 1),
      leadTime: config.showPath ? config.pathLeadMinutes * 60 : 0,
      trailTime: config.showTrail ? config.trailMinutes * 60 : 0,
      resolution: 10,
      material: new ColorMaterialProperty(buildCesiumColor(config.color, Math.min(0.7, config.markerOpacity))),
      distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
    });
  } else {
    entity.path = undefined;
  }

  if (config.showPath) {
    const distanceMeters = Math.max(0, flight.speedKnots) * 0.514444 * config.pathLeadMinutes * 60;
    const projected = destinationFrom(flight.latitude, flight.longitude, flight.headingDegrees || 0, distanceMeters);
    if (isValidCoordinates(projected.latitude, projected.longitude)) {
      const history = historyByMilitaryId.get(flight.id) ?? [];
      const started = history[0];
      const startPosition = started
        ? Cartesian3.fromDegrees(started.longitude, started.latitude, started.altitudeMeters)
        : Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 12));
      const currentPosition = Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 12));
      const projectedPosition = Cartesian3.fromDegrees(projected.longitude, projected.latitude, Math.max(flight.altitudeMeters, 12));
      entity.polyline = new PolylineGraphics({
        positions: [startPosition, currentPosition, projectedPosition],
        width: Math.max(1, config.outlineWidth + 1),
        material: new ColorMaterialProperty(buildCesiumColor(config.color, 0.46)),
        distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
      });
    }
  } else {
    entity.polyline = undefined;
  }
}

function updateEntity(entity: Entity, flight: FlightTrack) {
  entity.name = flight.callsign || 'MIL';
  entity.properties = createPropertyBag(flight);
  applyPosition(entity, flight);
  applyVisuals(entity, flight);
  if (entity.billboard) {
    entity.billboard.rotation = CesiumMath.toRadians(360 - (flight.headingDegrees || 0));
  }
}

function createEntity(flight: FlightTrack): Entity {
  const entity = new Entity({
    id: flight.id,
    name: flight.callsign || 'MIL',
    position: new ConstantPositionProperty(Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 12))),
    properties: createPropertyBag(flight),
  });

  updateEntity(entity, flight);
  return entity;
}

export async function ensureMilitaryFlightDataSource(viewer: Viewer): Promise<CustomDataSource> {
  const existing = viewer.dataSources.getByName(LAYER_ID)[0];
  if (existing instanceof CustomDataSource) {
    return existing;
  }

  const dataSource = new CustomDataSource(LAYER_ID);
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

export async function renderMilitaryFlights(viewer: Viewer, flights: FlightTrack[]) {
  const dataSource = await ensureMilitaryFlightDataSource(viewer);
  const config = getLayerVisualConfig('military');
  const limited = flights
    .filter((flight) => isValidCoordinates(flight.latitude, flight.longitude))
    .slice(0, config.maxEntities);

  const usedIds = new Set<string>();
  limited.forEach((flight) => {
    usedIds.add(flight.id);
    const entity = dataSource.entities.getById(flight.id);
    if (entity) {
      updateEntity(entity, flight);
      return;
    }
    dataSource.entities.add(createEntity(flight));
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
    historyByMilitaryId.delete(entityId);
    dataSource.entities.remove(entity);
  }

  setMilitaryFlightUiStatus(`ADSB.lol military · ${limited.length > 0 ? 'live' : 'waiting...'}`, limited.length);
  viewer.scene.requestRender();
}
