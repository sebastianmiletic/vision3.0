import { createRoot } from 'react-dom/client';

import App from './App';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './styles.css';

window.CESIUM_BASE_URL = '/cesiumStatic';

createRoot(document.getElementById('root')!).render(<App />);
