export function wireUiControls({ viewer, tracker, loadGroup }) {
  const groupSelect = document.getElementById("groupSelect");
  const satLimitSelect = document.getElementById("satLimit");
  const loadGroupBtn = document.getElementById("loadGroupBtn");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const orbitToggleBtn = document.getElementById("orbitToggleBtn");
  const searchInput = document.getElementById("searchInput");
  const satelliteList = document.getElementById("satelliteList");
  const statusText = document.getElementById("statusText");
  const speedButtons = Array.from(document.querySelectorAll(".speed-btn"));

  let currentSearch = "";
  let orbitVisible = true;

  function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("error", isError);
  }

  function setSpeed(speed) {
    viewer.clock.multiplier = speed;
    speedButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.speed) === speed);
    });
  }

  function renderSatelliteList() {
    const satellites = tracker.getSatellites(currentSearch);

    satelliteList.innerHTML = "";

    if (!satellites.length) {
      const empty = document.createElement("div");
      empty.className = "satellite-meta";
      empty.textContent = "No satellites match the current filter.";
      satelliteList.appendChild(empty);
      return;
    }

    satellites.forEach((satellite) => {
      const row = document.createElement("div");
      row.className = "satellite-row";

      const main = document.createElement("div");
      main.className = "satellite-main";

      const name = document.createElement("div");
      name.className = "satellite-name";
      name.textContent = satellite.name;

      const meta = document.createElement("div");
      meta.className = "satellite-meta";
      meta.textContent = Number.isFinite(satellite.altitudeKm)
        ? `Altitude: ${Math.round(satellite.altitudeKm)} km`
        : "Altitude: --";

      main.append(name, meta);

      const actions = document.createElement("div");
      actions.className = "satellite-actions";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.textContent = satellite.visible ? "Hide" : "Show";
      toggleBtn.addEventListener("click", () => {
        tracker.toggleSatelliteVisibility(satellite.id);
        renderSatelliteList();
      });

      const focusBtn = document.createElement("button");
      focusBtn.type = "button";
      focusBtn.textContent = "Track";
      focusBtn.disabled = !satellite.visible;
      focusBtn.addEventListener("click", () => {
        tracker.focusSatellite(satellite.id);
      });

      actions.append(toggleBtn, focusBtn);
      row.append(main, actions);
      satelliteList.appendChild(row);
    });
  }

  tracker.onUpdate = () => {
    renderSatelliteList();
  };

  loadGroupBtn.addEventListener("click", async () => {
    const group = groupSelect.value;
    const limit = Number(satLimitSelect.value);
    setStatus(`Loading ${group} satellites...`);

    try {
      tracker.setMaxSatellites(limit);
      const count = await loadGroup(group);
      renderSatelliteList();
      setStatus(`Loaded ${count} satellites from ${group}.`);
    } catch (error) {
      setStatus(`Error: ${error.message}`, true);
    }
  });

  playPauseBtn.addEventListener("click", () => {
    const shouldAnimate = viewer.clock.shouldAnimate;
    viewer.clock.shouldAnimate = !shouldAnimate;
    playPauseBtn.textContent = shouldAnimate ? "Play" : "Pause";
  });

  orbitToggleBtn.addEventListener("click", () => {
    orbitVisible = !orbitVisible;
    tracker.setOrbitPathsVisible(orbitVisible);
    orbitToggleBtn.textContent = orbitVisible ? "Hide Orbits" : "Show Orbits";
  });

  speedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const speed = Number(button.dataset.speed);
      if (Number.isFinite(speed)) {
        setSpeed(speed);
      }
    });
  });

  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    renderSatelliteList();
  });

  setSpeed(1);
  setStatus("Ready.");

  return {
    renderSatelliteList,
    setStatus
  };
}
