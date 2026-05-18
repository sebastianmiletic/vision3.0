import * as Cesium from "cesium";

export function createViewer(containerId) {
  const viewer = new Cesium.Viewer(containerId, {
    imageryProvider: new Cesium.OpenStreetMapImageryProvider({
      url: "https://a.tile.openstreetmap.org/"
    }),
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: true,
    sceneModePicker: true,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: true,
    animation: true,
    timeline: true,
    shouldAnimate: true,
    fullscreenButton: false
  });

  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.clock.shouldAnimate = true;
  viewer.clock.multiplier = 1;
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
  viewer.clock.startTime = Cesium.JulianDate.clone(viewer.clock.currentTime);
  viewer.clock.stopTime = Cesium.JulianDate.addDays(
    viewer.clock.currentTime,
    7,
    new Cesium.JulianDate()
  );
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

  return viewer;
}
