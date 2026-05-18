import { Cartographic, Cartesian2, JulianDate, Math as CesiumMath, ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium';
import { useEffect } from 'react';

import { setHidden, setText } from '../utils/domUi';

import type { MutableRefObject } from 'react';
import type { Entity, Viewer } from 'cesium';

type FocusLayer = 'flight' | 'military' | 'satellite';

type FocusInfo = {
  id: string;
  layer: FocusLayer;
  title: string;
  subtitle: string;
  altitudeLabel: string;
  speedLabel: string;
  headingLabel: string;
  sourceLabel: string;
  latitude: number;
  longitude: number;
};
const TRACKED_CARD_MIN_REFRESH_MS = 180;

function getProperty(entity: Entity, key: string, now: JulianDate) {
  return entity.properties?.[key]?.getValue?.(now);
}

function buildFocusInfo(entity: Entity): FocusInfo | null {
  const now = JulianDate.now();
  const position = entity.position?.getValue?.(now);
  if (!position) {
    return null;
  }

  const cartographic = Cartographic.fromCartesian(position);
  if (!cartographic) {
    return null;
  }

  const rawLayerType = String(getProperty(entity, 'layerType', now) ?? 'flight');
  const layerType: FocusLayer = rawLayerType === 'satellite'
    ? 'satellite'
    : rawLayerType === 'military'
      ? 'military'
      : 'flight';
  const latitude = CesiumMath.toDegrees(cartographic.latitude);
  const longitude = CesiumMath.toDegrees(cartographic.longitude);
  const sourceTimestamp = String(getProperty(entity, 'sourceTimestamp', now) ?? '--');

  if (layerType === 'satellite') {
    const altitudeKm = Number(getProperty(entity, 'altitudeKm', now) ?? 0);
    const velocityKps = Number(getProperty(entity, 'velocityKps', now) ?? 0);
    const title = String(getProperty(entity, 'name', now) ?? entity.name ?? 'SATELLITE');
    const noradId = String(getProperty(entity, 'noradId', now) ?? '--');

    return {
      id: String(entity.id ?? '--'),
      layer: 'satellite',
      title,
      subtitle: `NORAD ${noradId}`,
      altitudeLabel: `${Math.round(altitudeKm)} KM`,
      speedLabel: `${velocityKps.toFixed(2)} KM/S`,
      headingLabel: '--',
      sourceLabel: `SRC: CelesTrak · ${sourceTimestamp}`,
      latitude,
      longitude,
    };
  }

  const callsign = String(getProperty(entity, 'callsign', now) ?? entity.name ?? 'FLIGHT');
  const altitudeMeters = Number(getProperty(entity, 'altitudeMeters', now) ?? 0);
  const speedKnots = Number(getProperty(entity, 'speedKnots', now) ?? 0);
  const headingDegrees = Number(getProperty(entity, 'headingDegrees', now) ?? 0);

  const sourceName = layerType === 'military' ? 'ADSB.lol Military' : 'OpenSky';
  return {
    id: String(entity.id ?? '--'),
    layer: layerType,
    title: callsign,
    subtitle: String(entity.id ?? '--').replace('flight-', '').replace('mil-', '').toUpperCase(),
    altitudeLabel: `${Math.round(altitudeMeters)} M`,
    speedLabel: `${Math.round(speedKnots)} KT`,
    headingLabel: `${Math.round(headingDegrees)}°`,
    sourceLabel: `SRC: ${sourceName} · ${sourceTimestamp}`,
    latitude,
    longitude,
  };
}

function updateCards(info: FocusInfo) {
  setText('focusCardTitle', info.title);
  setText('focusCardLayer', info.layer.toUpperCase());
  setText('focusCardHex', info.subtitle);
  setText('focusCardRegistration', '--');
  setText('focusCardType', info.layer === 'satellite' ? 'ORBITAL' : 'AIRCRAFT');
  setText('focusCardAltitude', info.altitudeLabel);
  setText('focusCardSpeed', info.speedLabel);
  setText('focusCardHeading', info.headingLabel);
  setText('focusCardSquawk', '--');
  setText('focusCardAffiliation', info.layer === 'satellite' ? 'SPACE' : info.layer === 'military' ? 'MILITARY' : 'CIVIL');
  setText('focusCardSource', info.sourceLabel);

  setText('flightInfoCallsign', info.title);
  setText('flightInfoHex', info.subtitle);
  setText('flightInfoReg', '--');
  setText('flightInfoType', info.layer === 'satellite' ? 'SATELLITE' : 'AIRCRAFT');
  setText('flightInfoOperator', info.layer === 'satellite' ? 'CelesTrak' : info.layer === 'military' ? 'ADSB.lol' : '--');
  setText('flightInfoRoute', '--');
  setText('flightInfoAlt', info.altitudeLabel);
  setText('flightInfoSpeed', info.speedLabel);
  setText('flightInfoHdg', info.headingLabel);
  setText('flightInfoSquawk', '--');
  setText('flightInfoAffil', info.layer === 'satellite' ? 'SPACE' : info.layer === 'military' ? 'MIL' : 'CIVIL');
  setText('flightInfoLat', info.latitude.toFixed(4));
  setText('flightInfoLon', info.longitude.toFixed(4));
  setText('flightInfoVertRate', '--');
  setText('flightInfoSource', info.sourceLabel.replace('SRC: ', ''));

  setHidden('focusAircraftCard', false);
  setHidden('flightInfoPanel', true);
  document.body.classList.add('focus-data-active');
}

function releaseFocus(viewerRef: MutableRefObject<Viewer | null>) {
  setHidden('focusAircraftCard', true);
  setHidden('flightInfoPanel', true);
  document.body.classList.remove('focus-data-active');
  if (viewerRef.current) {
    viewerRef.current.trackedEntity = undefined;
    viewerRef.current.dataSources.values.forEach((dataSource) => {
      dataSource.entities.values.forEach((entity) => {
        entity.show = true;
      });
    });
  }
}

function isolateFocusedEntity(viewer: Viewer, focused: Entity, layer: FocusLayer) {
  const layerType = layer === 'satellite' ? 'satellite' : 'air';
  viewer.dataSources.values.forEach((dataSource) => {
    dataSource.entities.values.forEach((entity) => {
      const id = String(entity.id ?? '');
      const isSatelliteEntity = id.startsWith('sat-');
      const isAirEntity = id.startsWith('flight-') || id.startsWith('mil-');

      if (entity === focused) {
        entity.show = true;
        return;
      }

      if (layerType === 'satellite' && isSatelliteEntity) {
        entity.show = false;
        return;
      }

      if (layerType === 'air' && isAirEntity) {
        entity.show = false;
        return;
      }

      entity.show = true;
    });
  });
}

export function useLegacyShellFlightFocus(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    let handler: ScreenSpaceEventHandler | null = null;
    let attempts = 0;
    let onTickRef: ((clock: unknown) => void) | null = null;
    let mountedViewer: Viewer | null = null;
    let lastCardRenderAt = 0;
    let lastCardRenderKey = '';

    const setupPickHandler = window.setInterval(() => {
      if (handler || attempts > 20) {
        window.clearInterval(setupPickHandler);
        return;
      }

      attempts += 1;
      const viewer = viewerRef.current;
      if (!viewer) {
        return;
      }
      mountedViewer = viewer;

      handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: { position: unknown }) => {
        const position = (click as { position: Cartesian2 }).position;
        const picked = viewer.scene.pick(position) as { id?: Entity } | undefined;
        const entity = picked?.id;
        if (!entity) {
          if (viewer.trackedEntity) {
            releaseFocus(viewerRef);
            (window as Window & { __recenterEarth?: () => void }).__recenterEarth?.();
          }
          return;
        }

        const info = buildFocusInfo(entity);
        if (!info) {
          return;
        }

        viewer.trackedEntity = entity;
        updateCards(info);
        lastCardRenderAt = Date.now();
        lastCardRenderKey = `${info.id}|${info.latitude.toFixed(4)}|${info.longitude.toFixed(4)}|${info.altitudeLabel}|${info.speedLabel}|${info.headingLabel}|${info.sourceLabel}`;
        isolateFocusedEntity(viewer, entity, info.layer);
      }, ScreenSpaceEventType.LEFT_CLICK);

      onTickRef = () => {
        const tracked = viewer.trackedEntity;
        if (!tracked) {
          return;
        }

        const info = buildFocusInfo(tracked);
        if (!info) {
          return;
        }

        const nowMs = Date.now();
        const nextKey = `${info.id}|${info.latitude.toFixed(4)}|${info.longitude.toFixed(4)}|${info.altitudeLabel}|${info.speedLabel}|${info.headingLabel}|${info.sourceLabel}`;
        if (nextKey === lastCardRenderKey && nowMs - lastCardRenderAt < TRACKED_CARD_MIN_REFRESH_MS) {
          return;
        }

        lastCardRenderAt = nowMs;
        lastCardRenderKey = nextKey;
        updateCards(info);
      };

      viewer.clock.onTick.addEventListener(onTickRef);
    }, 350);

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) {
        return;
      }

      if (button.id === 'flightInfoCloseBtn' || button.id === 'flightInfoReleaseBtn') {
        releaseFocus(viewerRef);
        return;
      }

      if (button.id === 'flightInfoFocusBtn') {
        const viewer = viewerRef.current;
        if (viewer?.trackedEntity) {
          viewer.zoomTo(viewer.trackedEntity).catch(() => undefined);
        }
      }
    };

    const onCameraReset = () => {
      releaseFocus(viewerRef);
    };

    document.addEventListener('click', onClick);
    window.addEventListener('vision:camera-reset', onCameraReset);

    return () => {
      window.clearInterval(setupPickHandler);
      document.removeEventListener('click', onClick);
      window.removeEventListener('vision:camera-reset', onCameraReset);
      if (mountedViewer && onTickRef) {
        mountedViewer.clock.onTick.removeEventListener(onTickRef);
      }

      handler?.destroy();
    };
  }, [viewerRef]);
}
