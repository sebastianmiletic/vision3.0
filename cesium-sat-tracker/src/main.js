import "cesium/Build/Cesium/Widgets/widgets.css";
import { createViewer } from "./cesiumSetup.js";
import { fetchTLEGroup } from "./tleFetcher.js";
import { SatelliteTracker } from "./satelliteTracker.js";
import { wireUiControls } from "./uiControls.js";

async function main() {
  const viewer = createViewer("viewerContainer");
  const tracker = new SatelliteTracker(viewer, {
    maxSatellites: 200,
    orbitMinutes: 90,
    orbitStepSeconds: 30
  });

  const loadGroup = async (groupName) => {
    const tleRecords = await fetchTLEGroup(groupName);
    tracker.loadFromTLERecords(tleRecords, groupName);
    return Math.min(tleRecords.length, tracker.maxSatellites);
  };

  const ui = wireUiControls({
    viewer,
    tracker,
    loadGroup
  });

  try {
    ui.setStatus("Loading active satellites...");
    const count = await loadGroup("active");
    ui.setStatus(`Loaded ${count} satellites from active.`);
    ui.renderSatelliteList();
  } catch (error) {
    ui.setStatus(`Failed to load CelesTrak data: ${error.message}`, true);
  }
}

main();
