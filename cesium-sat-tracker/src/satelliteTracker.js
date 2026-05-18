import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { buildSatelliteLabel, clampDisplayLimit, normalizeLongitude, radiansToDegrees } from "./utils.js";

export class SatelliteTracker {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.orbitMinutes = options.orbitMinutes ?? 90;
    this.orbitStepSeconds = options.orbitStepSeconds ?? 30;
    this.maxSatellites = clampDisplayLimit(options.maxSatellites ?? 200);
    this.orbitPathsVisible = true;
    this.groupName = "active";

    this.satellites = [];
    this.byId = new Map();
    this.onUpdate = null;
  }

  setMaxSatellites(limit) {
    this.maxSatellites = clampDisplayLimit(limit);
  }

  clearSatellites() {
    for (const sat of this.satellites) {
      this.viewer.entities.remove(sat.entity);
      if (sat.orbitEntity) {
        this.viewer.entities.remove(sat.orbitEntity);
      }
    }

    this.satellites = [];
    this.byId.clear();
    this.viewer.trackedEntity = undefined;
    this.emitUpdate();
  }

  loadFromTLERecords(records, groupName = this.groupName) {
    this.clearSatellites();
    this.groupName = groupName;

    const selected = records.slice(0, this.maxSatellites);

    for (const record of selected) {
      let satrec;
      try {
        satrec = satellite.twoline2satrec(record.line1, record.line2);
      } catch {
        continue;
      }

      const satData = {
        id: record.id,
        name: record.name,
        line1: record.line1,
        line2: record.line2,
        satrec,
        entity: null,
        orbitEntity: null,
        orbitPathProperty: null,
        visible: true,
        lastState: null
      };

      satData.entity = this.createSatelliteEntity(satData);
      satData.orbitEntity = this.createOrbitEntity(satData);
      this.satellites.push(satData);
      this.byId.set(satData.id, satData);
    }

    this.emitUpdate();
  }

  createSatelliteEntity(satData) {
    const position = new Cesium.CallbackProperty((time) => {
      const jsDate = Cesium.JulianDate.toDate(time);
      const state = this.calculateState(satData.satrec, jsDate);
      satData.lastState = state;

      if (!state) {
        return undefined;
      }

      return Cesium.Cartesian3.fromDegrees(state.lonDeg, state.latDeg, state.altMeters);
    }, false);

    const labelText = new Cesium.CallbackProperty((time) => {
      const jsDate = Cesium.JulianDate.toDate(time);
      const state = satData.lastState ?? this.calculateState(satData.satrec, jsDate);
      if (!state) {
        return `${satData.name}\nNo propagation data`;
      }
      return buildSatelliteLabel(satData.name, state.altKm, state.latDeg, state.lonDeg);
    }, false);

    return this.viewer.entities.add({
      id: satData.id,
      name: satData.name,
      position,
      point: {
        pixelSize: 6,
        color: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1
      },
      label: {
        text: labelText,
        font: "13px sans-serif",
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: Cesium.Color.fromBytes(0, 0, 0, 170),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(10, 10),
        scale: 0.6,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000)
      }
    });
  }

  createOrbitEntity(satData) {
    satData.orbitPathProperty = this.buildOrbitPathProperty(satData.satrec, new Date());

    return this.viewer.entities.add({
      id: `${satData.id}-orbit`,
      name: `${satData.name} Orbit`,
      position: satData.orbitPathProperty,
      path: {
        resolution: this.orbitStepSeconds,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.fromCssColorString("#66c2ff")
        }),
        width: 1.6,
        leadTime: this.orbitMinutes * 60,
        trailTime: 0,
        show: this.orbitPathsVisible
      }
    });
  }

  buildOrbitPathProperty(satrec, startDate) {
    const sampled = new Cesium.SampledPositionProperty();
    const stepMs = this.orbitStepSeconds * 1000;
    const totalMs = this.orbitMinutes * 60 * 1000;

    for (let delta = 0; delta <= totalMs; delta += stepMs) {
      const sampleDate = new Date(startDate.getTime() + delta);
      const state = this.calculateState(satrec, sampleDate);
      if (!state) {
        continue;
      }

      const time = Cesium.JulianDate.fromDate(sampleDate);
      const cartesian = Cesium.Cartesian3.fromDegrees(state.lonDeg, state.latDeg, state.altMeters);
      sampled.addSample(time, cartesian);
    }

    return sampled;
  }

  calculateState(satrec, jsDate) {
    const pv = satellite.propagate(satrec, jsDate);
    if (!pv || !pv.position) {
      return null;
    }

    const gmst = satellite.gstime(jsDate);
    const geodetic = satellite.eciToGeodetic(pv.position, gmst);

    const latDeg = radiansToDegrees(geodetic.latitude);
    const lonDeg = normalizeLongitude(radiansToDegrees(geodetic.longitude));
    const altKm = geodetic.height;

    if (![latDeg, lonDeg, altKm].every(Number.isFinite)) {
      return null;
    }

    return {
      latDeg,
      lonDeg,
      altKm,
      altMeters: altKm * 1000
    };
  }

  setOrbitPathsVisible(show) {
    this.orbitPathsVisible = Boolean(show);
    for (const sat of this.satellites) {
      if (sat.orbitEntity?.path) {
        sat.orbitEntity.path.show = sat.visible && this.orbitPathsVisible;
      }
    }
    this.emitUpdate();
  }

  toggleSatelliteVisibility(id) {
    const sat = this.byId.get(id);
    if (!sat) {
      return;
    }

    sat.visible = !sat.visible;
    sat.entity.show = sat.visible;

    if (sat.orbitEntity) {
      sat.orbitEntity.show = sat.visible;
      if (sat.orbitEntity.path) {
        sat.orbitEntity.path.show = sat.visible && this.orbitPathsVisible;
      }
    }

    if (!sat.visible && this.viewer.trackedEntity?.id === id) {
      this.viewer.trackedEntity = undefined;
    }

    this.emitUpdate();
  }

  focusSatellite(id) {
    const sat = this.byId.get(id);
    if (!sat || !sat.visible) {
      return;
    }

    this.viewer.trackedEntity = sat.entity;
    this.viewer.flyTo(sat.entity, {
      duration: 1.2,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), 1_500_000)
    });
  }

  getSatellites(searchTerm = "") {
    const query = searchTerm.trim().toLowerCase();
    return this.satellites
      .filter((sat) => (query ? sat.name.toLowerCase().includes(query) : true))
      .map((sat) => ({
        id: sat.id,
        name: sat.name,
        visible: sat.visible,
        altitudeKm: sat.lastState?.altKm
      }));
  }

  emitUpdate() {
    if (typeof this.onUpdate === "function") {
      this.onUpdate(this.getSatellites());
    }
  }
}
