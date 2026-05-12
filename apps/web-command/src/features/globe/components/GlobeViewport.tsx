import { useFlightsLayer } from '../../flights/hooks/useFlightsLayer';
import { useCesiumViewer } from '../hooks/useCesiumViewer';

const CESIUM_CONTAINER_ID = 'cesiumContainer';

export function GlobeViewport() {
  const viewerRef = useCesiumViewer(CESIUM_CONTAINER_ID);
  useFlightsLayer(viewerRef);

  return <div id={CESIUM_CONTAINER_ID} className="globe-canvas-host" aria-label="3D command globe viewport" />;
}
