import { GlobeViewport } from '../globe/components/GlobeViewport';
import { useCesiumViewer } from '../globe/hooks/useCesiumViewer';

import { LegacyHtmlSection } from './components/LegacyHtmlSection';
import { useLegacyShellRuntime } from './hooks/useLegacyShellRuntime';

import bootHtml from './sections/boot.html?raw';
import hudAndOverlaysHtml from './sections/hud-and-overlays.html?raw';
import leftRailHtml from './sections/left-rail.html?raw';
import rightRailHtml from './sections/right-rail.html?raw';
import bottomAndModalsHtml from './sections/bottom-and-modals.html?raw';
import floatingPanelsHtml from './sections/floating-panels.html?raw';

export function VisionLegacyShell() {
  const viewerRef = useCesiumViewer('cesiumContainer');
  useLegacyShellRuntime(viewerRef);

  return (
    <>
      <LegacyHtmlSection html={bootHtml} className="legacy-boot-root" />

      <main id="frame">
        <GlobeViewport viewerRef={viewerRef} />

        <div className="pixel-noise" />
        <div className="scanlines" />
        <div className="vignette" />
        <div className="spotlight-mask" />
        <div className="afk-overlay hidden" id="afkOverlay" aria-hidden="true">
          <div className="afk-lightspeed-field" id="afkLightspeedField" aria-hidden="true" />
          <div className="afk-label">AFK</div>
        </div>

        <LegacyHtmlSection html={hudAndOverlaysHtml} />
        <LegacyHtmlSection html={leftRailHtml} />
        <LegacyHtmlSection html={rightRailHtml} />
        <LegacyHtmlSection html={bottomAndModalsHtml} />

        <div className="reticle" />
        <LegacyHtmlSection html={floatingPanelsHtml} />
      </main>
    </>
  );
}
