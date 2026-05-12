import { useEffect, useRef } from 'react';
import {
  Cartesian3,
  Color,
  createWorldTerrainAsync,
  Ion,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';

import { createPhotorealisticTileset } from '../services/tileProvider';

export function useCesiumViewer(containerId: string) {
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    let mounted = true;
    const provider = import.meta.env.VITE_TILE_PROVIDER ?? 'google';

    if (import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN) {
      Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;
    }

    async function start() {
      const terrainProvider = await createWorldTerrainAsync();

      const viewer = new Viewer(containerId, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        fullscreenButton: false,
        terrainProvider,
      });

      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true;
      }
      if (viewer.scene.skyBox) {
        viewer.scene.skyBox.show = true;
      }
      viewer.scene.backgroundColor = Color.BLACK;
      viewer.scene.globe.depthTestAgainstTerrain = true;

      const tileset = await createPhotorealisticTileset({
        provider,
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      });

      viewer.scene.primitives.add(tileset);

      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(12.4922, 41.8902, 2500),
        orientation: {
          heading: CesiumMath.toRadians(42),
          pitch: CesiumMath.toRadians(-42),
          roll: 0,
        },
        duration: 2.4,
      });

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction(() => undefined, ScreenSpaceEventType.WHEEL);

      if (mounted) {
        viewerRef.current = viewer;
      } else {
        handler.destroy();
        viewer.destroy();
      }
    }

    start().catch((error) => {
      console.error('Failed to initialize Cesium viewer', error);
    });

    return () => {
      mounted = false;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [containerId]);

  return viewerRef;
}
