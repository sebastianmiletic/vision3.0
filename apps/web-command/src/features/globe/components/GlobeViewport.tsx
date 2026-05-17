import { useFlightsLayer } from '../../flights/hooks/useFlightsLayer';
import { useMilitaryFlightsLayer } from '../../military-flights/hooks/useMilitaryFlightsLayer';
import { useSatellitesLayer } from '../../satellites/hooks/useSatellitesLayer';

import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

type GlobeViewportProps = {
  viewerRef: MutableRefObject<Viewer | null>;
};

export function GlobeViewport({ viewerRef }: GlobeViewportProps) {
  useFlightsLayer(viewerRef);
  useMilitaryFlightsLayer(viewerRef);
  useSatellitesLayer(viewerRef);

  return <div id="cesiumContainer" className="globe-canvas-host" aria-label="3D command globe viewport" />;
}
