import { useEffect } from 'react';
import {
  Cartesian3,
  Color,
  ConstantPositionProperty,
  LabelGraphics,
  LabelStyle,
  Math as CesiumMath,
  PointGraphics,
  VerticalOrigin,
} from 'cesium';

import { fetchCctvCountries, fetchCctvWebcamById, fetchCctvWebcams } from '../../../services/integrations/cctvService';
import { setText } from '../utils/domUi';

import type { CctvCamera, CctvCountry } from '../../addons/cctv/types';
import type { MutableRefObject } from 'react';
import type { Viewer } from 'cesium';

const BASE_LIMIT = 60;
const TOKEN_REFRESH_MS = 9 * 60 * 1000;
const STARTUP_RETRY_MS = 2500;
const CCTV_PIN_ID = 'vision-cctv-pin';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cameraImageUrl(camera: CctvCamera): string {
  return camera.images.current.preview
    || camera.images.current.thumbnail
    || camera.images.daylight.preview
    || camera.images.daylight.thumbnail
    || '';
}

function cameraMetaLine(camera: CctvCamera): string {
  const lastUpdated = camera.lastUpdatedOn ? new Date(camera.lastUpdatedOn).toLocaleString() : '--';
  const views = Number.isFinite(camera.viewCount) ? camera.viewCount.toLocaleString() : '--';
  return `${camera.location.country || '--'} · ${camera.location.region || '--'} · ${camera.location.city || '--'} · ${camera.status.toUpperCase()} · ${views} views · ${lastUpdated}`;
}

function sortCameras(cameras: CctvCamera[], mode: string): CctvCamera[] {
  const copy = [...cameras];
  if (mode === 'recent') {
    copy.sort((a, b) => (new Date(b.lastUpdatedOn ?? 0).getTime()) - (new Date(a.lastUpdatedOn ?? 0).getTime()));
    return copy;
  }
  if (mode === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title));
    return copy;
  }
  copy.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
  return copy;
}

function normalizedRegion(camera: CctvCamera) {
  return camera.location.regionCode || camera.location.region || '';
}

function isTransientNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('Failed to fetch') || error.message.includes('NetworkError');
}

function flyToCctvCamera(viewer: Viewer, camera: CctvCamera) {
  const lat = camera.location.latitude;
  const lon = camera.location.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return;
  }

  const destination = Cartesian3.fromDegrees(lon, lat, 1600);
  viewer.trackedEntity = undefined;
  viewer.camera.flyTo({
    destination,
    duration: 2.2,
    orientation: {
      heading: CesiumMath.toRadians(28),
      pitch: CesiumMath.toRadians(-34),
      roll: 0,
    },
  });

  const existing = viewer.entities.getById(CCTV_PIN_ID) ?? viewer.entities.add({ id: CCTV_PIN_ID });
  existing.name = camera.title;
  existing.position = new ConstantPositionProperty(Cartesian3.fromDegrees(lon, lat, 14));
  existing.point = new PointGraphics({
    color: Color.fromCssColorString('#26c9ff'),
    outlineColor: Color.BLACK,
    outlineWidth: 2,
    pixelSize: 11,
  });
  existing.label = new LabelGraphics({
    text: camera.title.length > 52 ? `${camera.title.slice(0, 49)}...` : camera.title,
    font: '12px "Share Tech Mono", monospace',
    fillColor: Color.fromCssColorString('#26c9ff'),
    outlineColor: Color.BLACK,
    outlineWidth: 2,
    style: LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: VerticalOrigin.TOP,
    showBackground: true,
  });
}

export function useLegacyCctvAddon(viewerRef: MutableRefObject<Viewer | null>) {
  useEffect(() => {
    const countriesSelect = document.getElementById('cctvCountrySelect') as HTMLSelectElement | null;
    const regionsSelect = document.getElementById('cctvRegionSelect') as HTMLSelectElement | null;
    const citySelect = document.getElementById('cctvCitySelect') as HTMLSelectElement | null;
    const statusSelect = document.getElementById('cctvStatusSelect') as HTMLSelectElement | null;
    const sortSelect = document.getElementById('cctvSortSelect') as HTMLSelectElement | null;
    const searchInput = document.getElementById('cctvSearchInput') as HTMLInputElement | null;
    const listNode = document.getElementById('cctvCameraList');
    const previewImage = document.getElementById('cctvQuickPreviewImage') as HTMLImageElement | null;
    const previewTitle = document.getElementById('cctvQuickTitle');
    const previewMeta = document.getElementById('cctvQuickMeta');
    const previewCoords = document.getElementById('cctvQuickCoords');
    const refreshBtn = document.getElementById('cctvRefreshBtn') as HTMLButtonElement | null;
    const resetBtn = document.getElementById('cctvResetFiltersBtn') as HTMLButtonElement | null;
    const loadMoreBtn = document.getElementById('cctvLoadMoreBtn') as HTMLButtonElement | null;
    const fullscreenBtn = document.getElementById('cctvFullscreenBtn') as HTMLButtonElement | null;
    const openPlayerBtn = document.getElementById('cctvOpenPlayerBtn') as HTMLButtonElement | null;

    if (!countriesSelect || !regionsSelect || !citySelect || !statusSelect || !sortSelect || !searchInput
      || !listNode || !previewImage || !previewTitle || !previewMeta || !previewCoords || !refreshBtn
      || !resetBtn || !loadMoreBtn || !fullscreenBtn || !openPlayerBtn) {
      return;
    }

    let isMounted = true;
    let countries: CctvCountry[] = [];
    let cameras: CctvCamera[] = [];
    let selectedCamera: CctvCamera | null = null;
    let loadedTotal = 0;
    let offset = 0;
    let activeCountry = '';
    let refreshTimer: number | null = null;
    let startupRetryTimer: number | null = null;

    const setStatus = (message: string) => {
      setText('cctvMonitorStatus', message);
      setText('cctvAddonStatus', message);
    };

    const renderCountries = () => {
      const options = ['<option value="">All countries</option>']
        .concat(countries.map((country) => `<option value="${escapeHtml(country.code)}">${escapeHtml(country.name)}</option>`));
      countriesSelect.innerHTML = options.join('');
    };

    const renderRegionAndCityOptions = () => {
      const regionMap = new Map<string, string>();
      const citySet = new Set<string>();

      cameras.forEach((camera) => {
        const regionCode = normalizedRegion(camera);
        if (regionCode) {
          regionMap.set(regionCode, camera.location.region || regionCode);
        }
        if (camera.location.city) {
          citySet.add(camera.location.city);
        }
      });

      const regionOptions = ['<option value="">All states/regions</option>']
        .concat(Array.from(regionMap.entries())
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([code, label]) => `<option value="${escapeHtml(code)}">${escapeHtml(label)}</option>`));
      regionsSelect.innerHTML = regionOptions.join('');

      const cityOptions = ['<option value="">All cities</option>']
        .concat(Array.from(citySet.values())
          .sort((a, b) => a.localeCompare(b))
          .map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`));
      citySelect.innerHTML = cityOptions.join('');
    };

    const renderQuickView = (camera: CctvCamera | null) => {
      selectedCamera = camera;
      if (!camera) {
        previewImage.removeAttribute('src');
        previewImage.alt = 'No camera selected';
        previewTitle.textContent = 'No Camera Selected';
        previewMeta.textContent = 'Pick a camera from the list.';
        previewCoords.textContent = '--';
        return;
      }

      const imageUrl = cameraImageUrl(camera);
      previewImage.src = imageUrl;
      previewImage.alt = camera.title;
      previewTitle.textContent = camera.title;
      previewMeta.textContent = cameraMetaLine(camera);
      previewCoords.textContent = `${camera.location.latitude.toFixed(5)}, ${camera.location.longitude.toFixed(5)}`;
    };

    const renderCameraList = () => {
      const regionFilter = regionsSelect.value;
      const cityFilter = citySelect.value;
      const statusFilter = statusSelect.value;
      const sortMode = sortSelect.value;
      const search = searchInput.value.trim().toLowerCase();

      const filtered = cameras.filter((camera) => {
        if (regionFilter && normalizedRegion(camera) !== regionFilter) {
          return false;
        }
        if (cityFilter && camera.location.city !== cityFilter) {
          return false;
        }
        if (statusFilter && camera.status !== statusFilter) {
          return false;
        }
        if (search && !camera.title.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      });

      const sorted = sortCameras(filtered, sortMode);
      setText('cctvCameraCount', `${sorted.length}`);
      setText('cctvAddonCount', `${sorted.length}`);

      if (!sorted.length) {
        listNode.innerHTML = '<p class="cctv-empty">No cameras match this filter set.</p>';
        renderQuickView(null);
        return;
      }

      listNode.innerHTML = sorted.map((camera) => {
        const isActive = selectedCamera && selectedCamera.webcamId === camera.webcamId;
        const imageUrl = cameraImageUrl(camera);
        return `
          <article class="cctv-card ${isActive ? 'active' : ''}" data-cctv-select="${camera.webcamId}">
            <img class="cctv-card-preview" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(camera.title)}" loading="lazy">
            <div class="cctv-card-body">
              <h3>${escapeHtml(camera.title)}</h3>
              <p>${escapeHtml(camera.location.country || '--')} · ${escapeHtml(camera.location.region || '--')}</p>
              <p>${escapeHtml(camera.location.city || '--')} · ${camera.status.toUpperCase()} · ${camera.viewCount.toLocaleString()} views</p>
              <div class="cctv-card-actions">
                <button type="button" class="chip" data-cctv-quick="${camera.webcamId}">QUICK VIEW</button>
                <button type="button" class="chip" data-cctv-full="${camera.webcamId}">FULLSCREEN</button>
              </div>
            </div>
          </article>
        `;
      }).join('');

      const stillPresent = selectedCamera && sorted.some((camera) => camera.webcamId === selectedCamera?.webcamId);
      if (!stillPresent) {
        renderQuickView(sorted[0] ?? null);
      }
    };

    const mergeCameras = (incoming: CctvCamera[]) => {
      const map = new Map<number, CctvCamera>();
      cameras.forEach((camera) => map.set(camera.webcamId, camera));
      incoming.forEach((camera) => map.set(camera.webcamId, camera));
      cameras = Array.from(map.values());
    };

    const loadCameras = async (replace: boolean) => {
      if (!isMounted) {
        return;
      }

      const countryCode = countriesSelect.value;
      const regionCode = regionsSelect.value;
      const nextOffset = replace ? 0 : offset;
      const sortBy = sortSelect.value === 'recent' ? 'lastUpdatedOn,desc' : 'viewCount,desc';
      setStatus('Loading CCTV camera feed...');

      try {
        const response = await fetchCctvWebcams({
          countryCode: countryCode || undefined,
          regionCode: regionCode || undefined,
          limit: BASE_LIMIT,
          offset: nextOffset,
          sortBy,
        });
        if (!isMounted) {
          return;
        }

        loadedTotal = response.total;
        if (replace) {
          cameras = response.webcams;
          offset = response.webcams.length;
          activeCountry = countryCode;
        } else {
          mergeCameras(response.webcams);
          offset += response.webcams.length;
        }

        renderRegionAndCityOptions();
        if (regionCode) {
          regionsSelect.value = regionCode;
        }
        renderCameraList();

        const statusLabel = `${cameras.length}/${loadedTotal || cameras.length} cams loaded`;
        setStatus(`CCTV online · ${statusLabel}`);
        loadMoreBtn.disabled = cameras.length >= loadedTotal;
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Failed to load CCTV cameras', error);
        }
        setStatus('CCTV feed unavailable. Check API key/network.');

        if (replace && startupRetryTimer === null) {
          startupRetryTimer = window.setTimeout(() => {
            startupRetryTimer = null;
            void loadCameras(true);
          }, STARTUP_RETRY_MS);
        }
      }
    };

    const refreshSelectedCamera = async () => {
      if (!selectedCamera) {
        return;
      }
      try {
        const refreshed = await fetchCctvWebcamById(selectedCamera.webcamId);
        if (!isMounted || !refreshed) {
          return;
        }
        cameras = cameras.map((camera) => camera.webcamId === refreshed.webcamId ? refreshed : camera);
        renderQuickView(refreshed);
      } catch (error) {
        console.error('Failed to refresh selected CCTV camera', error);
      }
    };

    const refreshVisibleCameraUrls = async () => {
      const countryCode = countriesSelect.value;
      const regionCode = regionsSelect.value;
      const sortBy = sortSelect.value === 'recent' ? 'lastUpdatedOn,desc' : 'viewCount,desc';
      try {
        const refreshed = await fetchCctvWebcams({
          countryCode: countryCode || undefined,
          regionCode: regionCode || undefined,
          limit: BASE_LIMIT,
          offset: 0,
          sortBy,
        });
        if (!isMounted) {
          return;
        }

        mergeCameras(refreshed.webcams);
        renderRegionAndCityOptions();
        renderCameraList();
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Failed to refresh CCTV camera tokenized URLs', error);
        }
      }
    };

    const loadCountries = async () => {
      setStatus('Loading CCTV country catalog...');
      try {
        countries = await fetchCctvCountries();
        if (!isMounted) {
          return;
        }
        renderCountries();
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('Failed to load CCTV countries', error);
        }
        setStatus('CCTV country catalog unavailable. Retrying...');

        if (startupRetryTimer === null) {
          startupRetryTimer = window.setTimeout(() => {
            startupRetryTimer = null;
            void loadCountries();
            void loadCameras(true);
          }, STARTUP_RETRY_MS);
        }
      }
    };

    const openSelectedFullscreen = () => {
      const camera = selectedCamera;
      if (!camera) {
        return;
      }
      const imageUrl = cameraImageUrl(camera);
      if (!imageUrl) {
        return;
      }
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    };

    const openSelectedPlayer = () => {
      const camera = selectedCamera;
      if (!camera?.player?.day) {
        return;
      }
      window.open(camera.player.day, '_blank', 'noopener,noreferrer');
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const openTrigger = target.closest<HTMLElement>('[data-addon-open="cctv-monitor"]');
      if (openTrigger) {
        if (!cameras.length || countriesSelect.value !== activeCountry) {
          void loadCameras(true);
        }
      }

      const selectNode = target.closest<HTMLElement>('[data-cctv-select]');
      if (selectNode) {
        const cameraId = Number(selectNode.getAttribute('data-cctv-select'));
        const camera = cameras.find((item) => item.webcamId === cameraId) ?? null;
        renderQuickView(camera);
        if (camera && viewerRef.current) {
          flyToCctvCamera(viewerRef.current, camera);
        }
        renderCameraList();
        return;
      }

      const quickNode = target.closest<HTMLElement>('[data-cctv-quick]');
      if (quickNode) {
        const cameraId = Number(quickNode.getAttribute('data-cctv-quick'));
        const camera = cameras.find((item) => item.webcamId === cameraId) ?? null;
        renderQuickView(camera);
        if (camera && viewerRef.current) {
          flyToCctvCamera(viewerRef.current, camera);
        }
        renderCameraList();
        return;
      }

      const fullNode = target.closest<HTMLElement>('[data-cctv-full]');
      if (fullNode) {
        const cameraId = Number(fullNode.getAttribute('data-cctv-full'));
        const camera = cameras.find((item) => item.webcamId === cameraId) ?? null;
        if (camera) {
          renderQuickView(camera);
          if (viewerRef.current) {
            flyToCctvCamera(viewerRef.current, camera);
          }
          openSelectedFullscreen();
        }
      }
    };

    const onCountryChange = () => {
      regionsSelect.value = '';
      citySelect.value = '';
      offset = 0;
      void loadCameras(true);
    };

    const onRegionChange = () => {
      citySelect.value = '';
      offset = 0;
      void loadCameras(true);
    };

    const onFilterInput = () => {
      renderCameraList();
    };

    const onRefresh = () => {
      offset = 0;
      void loadCameras(true);
      void refreshSelectedCamera();
    };

    const onResetFilters = () => {
      countriesSelect.value = '';
      regionsSelect.value = '';
      citySelect.value = '';
      statusSelect.value = '';
      sortSelect.value = 'views';
      searchInput.value = '';
      offset = 0;
      void loadCameras(true);
    };

    const onLoadMore = () => {
      void loadCameras(false);
    };

    const onFullscreen = () => openSelectedFullscreen();
    const onOpenPlayer = () => openSelectedPlayer();

    countriesSelect.addEventListener('change', onCountryChange);
    regionsSelect.addEventListener('change', onRegionChange);
    citySelect.addEventListener('change', onFilterInput);
    statusSelect.addEventListener('change', onFilterInput);
    sortSelect.addEventListener('change', onFilterInput);
    searchInput.addEventListener('input', onFilterInput);
    refreshBtn.addEventListener('click', onRefresh);
    resetBtn.addEventListener('click', onResetFilters);
    loadMoreBtn.addEventListener('click', onLoadMore);
    fullscreenBtn.addEventListener('click', onFullscreen);
    openPlayerBtn.addEventListener('click', onOpenPlayer);
    document.addEventListener('click', onClick);

    void loadCountries().then(() => loadCameras(true));
    refreshTimer = window.setInterval(() => {
      void refreshSelectedCamera();
      void refreshVisibleCameraUrls();
    }, TOKEN_REFRESH_MS);

    return () => {
      isMounted = false;
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }
      if (startupRetryTimer !== null) {
        window.clearTimeout(startupRetryTimer);
      }
      countriesSelect.removeEventListener('change', onCountryChange);
      regionsSelect.removeEventListener('change', onRegionChange);
      citySelect.removeEventListener('change', onFilterInput);
      statusSelect.removeEventListener('change', onFilterInput);
      sortSelect.removeEventListener('change', onFilterInput);
      searchInput.removeEventListener('input', onFilterInput);
      refreshBtn.removeEventListener('click', onRefresh);
      resetBtn.removeEventListener('click', onResetFilters);
      loadMoreBtn.removeEventListener('click', onLoadMore);
      fullscreenBtn.removeEventListener('click', onFullscreen);
      openPlayerBtn.removeEventListener('click', onOpenPlayer);
      document.removeEventListener('click', onClick);
    };
  }, [viewerRef]);
}
