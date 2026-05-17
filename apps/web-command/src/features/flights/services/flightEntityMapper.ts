import { Cartesian2, Cartesian3, Color, HeightReference, LabelStyle, VerticalOrigin } from 'cesium';

import type { FlightTrack } from '@vision/shared-types';

export function mapFlightToEntityOptions(flight: FlightTrack) {
  return {
    id: flight.id,
    position: Cartesian3.fromDegrees(flight.longitude, flight.latitude, Math.max(flight.altitudeMeters, 10)),
    point: {
      color: Color.fromCssColorString('#26c9ff').withAlpha(0.94),
      outlineColor: Color.BLACK,
      outlineWidth: 1,
      pixelSize: 7,
      heightReference: HeightReference.NONE,
    },
    label: {
      text: flight.callsign || 'UNK',
      font: '12px "Share Tech Mono", monospace',
      fillColor: Color.fromCssColorString('#d8e7ff'),
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.TOP,
      pixelOffset: new Cartesian2(0, -14),
      showBackground: true,
      backgroundColor: Color.fromCssColorString('rgba(0,0,0,0.55)'),
      backgroundPadding: new Cartesian2(5, 3),
    },
    properties: {
      headingDegrees: flight.headingDegrees,
      speedKnots: flight.speedKnots,
      altitudeMeters: flight.altitudeMeters,
      sourceTimestamp: flight.sourceTimestamp,
    },
  };
}
