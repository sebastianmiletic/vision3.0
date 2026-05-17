import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const cesiumRoot = path.resolve(appRoot, '../../node_modules/cesium/Build/Cesium');
const targetRoot = path.resolve(appRoot, 'public/cesiumStatic');

if (!existsSync(cesiumRoot)) {
  throw new Error(`Cesium build assets not found at ${cesiumRoot}`);
}

mkdirSync(targetRoot, { recursive: true });

for (const dir of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  const source = path.join(cesiumRoot, dir);
  const destination = path.join(targetRoot, dir);

  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });
}

console.log(`[web-command] Cesium static assets synced -> ${targetRoot}`);
