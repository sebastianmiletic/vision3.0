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
  Math as CesiumMath,
  PointGraphics,
  PropertyBag,
  SampledPositionProperty,
  VerticalOrigin,
} from 'cesium';

import { buildCesiumColor, buildIconDataUri } from '../../layer-config/iconFactory';
import { getLayerVisualConfig } from '../../layer-config/layerVisualConfig';
import { setFlightUiStatus } from './flightUiTelemetry';

import type { Viewer } from 'cesium';
import type { FlightTrack } from '@vision/shared-types';

const LAYER_ID = 'vision-flights-layer';
const SMOOTH_SECONDS = 12;
const MAX_SMOOTH_DISTANCE_METERS = 1_200_000;
const ICON_MAX_DISTANCE_METERS = 60_000_000;
const LABEL_MAX_DISTANCE_METERS = 12_000_000;

type VisionEntity = Entity & { __visionVisualSig?: string };

function createFlightPropertyBag(flight: FlightTrack) {
  return new PropertyBag({
    layerType: 'flight',
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

function applyPosition(entity: Entity, flight: FlightTrack) {
  if (!isValidCoordinates(flight.latitude, flight.longitude)) {
    return;
  }

  const nextPosition = Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 12));
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

function applyVisuals(entity: Entity, flight: FlightTrack) {
  const config = getLayerVisualConfig('flights');
  const sig = `${config.color}|${config.iconPreset}|${config.markerSize}|${config.showLabel}|${config.outlineEnabled}|${config.outlineColor}|${config.outlineWidth}|${config.markerOpacity}|${flight.callsign || 'UNK'}`;
  const visionEntity = entity as VisionEntity;
  if (visionEntity.__visionVisualSig === sig) {
    return;
  }

  visionEntity.__visionVisualSig = sig;
  const color = buildCesiumColor(config.color, config.markerOpacity);
  const outlineColor = buildCesiumColor(config.outlineColor, 1);
  const outlineWidth = config.outlineEnabled ? config.outlineWidth : 0;

  if (config.iconPreset === 'dot') {
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
      image: buildIconDataUri(config.iconPreset, config.color, {
        opacity: config.markerOpacity,
        strokeColor: config.outlineEnabled ? config.outlineColor : config.color,
        strokeWidth: outlineWidth,
      }),
      width: config.markerSize * 3,
      height: config.markerSize * 3,
      verticalOrigin: VerticalOrigin.CENTER,
      color,
      alignedAxis: Cartesian3.UNIT_Z,
      rotation: CesiumMath.toRadians(360 - (flight.headingDegrees || 0)),
      distanceDisplayCondition: new DistanceDisplayCondition(0, ICON_MAX_DISTANCE_METERS),
    });
  }

  entity.label = config.showLabel
    ? new LabelGraphics({
        text: flight.callsign || 'UNK',
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
}

function updateEntity(entity: Entity, flight: FlightTrack) {
  entity.name = flight.callsign || 'UNK';
  entity.properties = createFlightPropertyBag(flight);
  applyPosition(entity, flight);
  applyVisuals(entity, flight);
  if (entity.billboard) {
    entity.billboard.rotation = CesiumMath.toRadians(360 - (flight.headingDegrees || 0));
  }
}

function createEntity(flight: FlightTrack): Entity {
  const entity = new Entity({
    id: flight.id,
    name: flight.callsign || 'UNK',
    position: new ConstantPositionProperty(Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 12))),
    properties: createFlightPropertyBag(flight),
  });

  updateEntity(entity, flight);
  return entity;
}

export async function ensureFlightDataSource(viewer: Viewer): Promise<CustomDataSource> {
  const existing = viewer.dataSources.getByName(LAYER_ID)[0];
  if (existing instanceof CustomDataSource) {
    return existing;
  }

  const dataSource = new CustomDataSource(LAYER_ID);
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

export async function renderFlights(viewer: Viewer, flights: FlightTrack[]) {
  const dataSource = await ensureFlightDataSource(viewer);
  const config = getLayerVisualConfig('flights');
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

  dataSource.entities.values
    .filter((entity) => !usedIds.has(String(entity.id)))
    .forEach((entity) => dataSource.entities.remove(entity));

  setFlightUiStatus(`OpenSky network · ${limited.length > 0 ? 'live' : 'waiting...'}`, limited.length);
}
