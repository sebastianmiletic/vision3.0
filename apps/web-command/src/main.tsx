import { createRoot } from 'react-dom/client';

import App from './App';
import { prepareVisionStartup } from './services/startup/startupBootstrap';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './styles.css';

window.CESIUM_BASE_URL = '/cesiumStatic';

async function bootApp() {
  try {
    await prepareVisionStartup();
  } catch (error) {
    console.warn('Vision startup preload failed; continuing app boot.', error);
  } finally {
    window.__visionStartupReady = true;
    window.dispatchEvent(new CustomEvent('vision:startup-ready'));
  }

  createRoot(document.getElementById('root')!).render(<App />);
}

void bootApp();
