import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { fileURLToPath } from "node:url";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "./cesiumStatic";

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/Assets`, dest: "cesiumStatic" },
        { src: `${cesiumSource}/Workers`, dest: "cesiumStatic" },
        { src: `${cesiumSource}/ThirdParty`, dest: "cesiumStatic" },
        { src: `${cesiumSource}/Widgets`, dest: "cesiumStatic" }
      ]
    })
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl)
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
