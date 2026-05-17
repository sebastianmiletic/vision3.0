import { Color } from 'cesium';

import type { LayerIconPreset } from './layerVisualConfig';

function normalizeColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#26c9ff';
}

type IconStyleOptions = {
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
};

function normalizeOpacity(opacity: number | undefined) {
  if (!Number.isFinite(opacity)) {
    return 0.96;
  }
  return Math.min(1, Math.max(0.1, Number(opacity)));
}

function normalizeStrokeWidth(width: number | undefined) {
  if (!Number.isFinite(width)) {
    return 0;
  }
  return Math.min(6, Math.max(0, Number(width)));
}

function svgForPreset(preset: LayerIconPreset, color: string, options?: IconStyleOptions): string {
  const safeFill = normalizeColor(color);
  const safeStroke = normalizeColor(options?.strokeColor ?? '#000000');
  const strokeWidth = normalizeStrokeWidth(options?.strokeWidth);
  const opacity = normalizeOpacity(options?.opacity);
  const strokeAttrs = strokeWidth > 0 ? ` stroke="${safeStroke}" stroke-width="${strokeWidth}"` : '';

  if (preset === 'plane') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="${safeFill}" fill-opacity="${opacity}"${strokeAttrs} d="M32 3c1.5 0 2.7 1.2 2.7 2.7v13l15.8 7.6c1.9.9 2.7 3.2 1.7 5l-1.8 3.2c-.9 1.6-2.8 2.2-4.4 1.5l-11.3-5v9.6l6.4 8.5c1.1 1.4 1 3.4-.3 4.7l-2.6 2.6c-1.3 1.3-3.3 1.4-4.7.3L32 52.1l-1.4 4.7c-.4 1.5-1.7 2.5-3.2 2.5h-3.8c-1.5 0-2.8-1-3.2-2.5L19 52.1l-1.5 1.6c-1.3 1.1-3.3 1-4.6-.3l-2.6-2.6c-1.3-1.3-1.4-3.3-.3-4.7l6.4-8.5V32l-11.3 5c-1.6.7-3.5.1-4.4-1.5l-1.8-3.2c-1-1.8-.2-4.1 1.7-5l15.8-7.6v-13C16.4 4.2 17.6 3 19.1 3h12.9z"/></svg>`;
  }

  if (preset === 'satellite') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="24" y="24" width="16" height="16" rx="3" fill="${safeFill}" fill-opacity="${opacity}"${strokeAttrs}/><rect x="6" y="26" width="14" height="12" rx="2" fill="${safeFill}" fill-opacity="${opacity * 0.86}"${strokeAttrs}/><rect x="44" y="26" width="14" height="12" rx="2" fill="${safeFill}" fill-opacity="${opacity * 0.86}"${strokeAttrs}/><rect x="29" y="8" width="6" height="12" fill="${safeFill}" fill-opacity="${opacity}"${strokeAttrs}/><rect x="29" y="44" width="6" height="12" fill="${safeFill}" fill-opacity="${opacity}"${strokeAttrs}/></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="${safeFill}" fill-opacity="${opacity}"${strokeAttrs}/></svg>`;
}

export function buildIconDataUri(preset: LayerIconPreset, color: string, options?: IconStyleOptions): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgForPreset(preset, color, options))}`;
}

export function buildCesiumColor(color: string, alpha = 0.94): Color {
  return Color.fromCssColorString(normalizeColor(color)).withAlpha(alpha);
}
