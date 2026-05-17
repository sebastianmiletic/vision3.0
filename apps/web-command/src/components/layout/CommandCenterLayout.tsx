import { useMemo } from 'react';

import { useAppStore } from '../../stores/appStore';

import type { ReactNode } from 'react';

type CommandCenterLayoutProps = {
  children: ReactNode;
};

const layerCards = [
  {
    id: 'orbital-corridors',
    icon: '🌐',
    title: 'Orbital Corridors',
    subtitle: 'Status: Good API: n/a',
    meta: 'Internal',
    enabled: true,
  },
  {
    id: 'pipelines',
    icon: '🛢️',
    title: 'Pipelines',
    subtitle: 'Pipeline network layers ·',
    meta: 'coming soon',
    enabled: false,
  },
  {
    id: 'trade-routes',
    icon: '📦',
    title: 'Trade Routes',
    subtitle: 'Global trade corridors ·',
    meta: 'coming soon',
    enabled: false,
  },
  {
    id: 'undersea-cables',
    icon: '🌊',
    title: 'Undersea Cables',
    subtitle: 'Subsea cable maps · coming',
    meta: 'soon',
    enabled: false,
  },
] as const;

const topTabs = ['QUALITY', 'BALANCED', 'PERFORMANCE', 'SETTINGS', 'RECORD'] as const;
const visionModes = ['Normal', 'CRT', 'NVG', 'Noir', 'Spotlight', 'Ultra'] as const;
const accents = ['CYAN', 'ORANGE', 'GOLD', 'LIME', 'COBALT', 'TEAL', 'ROSE', 'CRIMSON'] as const;

const accentToStore = {
  CYAN: 'cyan',
  ORANGE: 'orange',
  GOLD: 'gold',
  LIME: 'lime',
  COBALT: 'cobalt',
  TEAL: 'teal',
  ROSE: 'rose',
  CRIMSON: 'crimson',
} as const;

export function CommandCenterLayout({ children }: CommandCenterLayoutProps) {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const layers = useAppStore((state) => state.layers);
  const toggleLayer = useAppStore((state) => state.toggleLayer);

  const location = useMemo(
    () => 'P.za del Colosseo, 1, 00184 Roma RM, Italy (GOOGLE) · right-drag to orbit',
    [],
  );

  return (
    <div className="vision-shell">
      <header className="browser-chrome">
        <div className="browser-nav">
          <span>←</span>
          <span>→</span>
          <span>⟳</span>
          <span>⌂</span>
        </div>
        <div className="browser-url">◉ localhost:8081</div>
        <div className="browser-tools">
          <span>⌁</span>
          <span>⛶</span>
          <span>⇩</span>
          <span>⋮</span>
        </div>
      </header>

      <div className="scene-frame">
        <div className="overlay-top-meta">LOC: PERMISSION_DENIED</div>

        <section className="left-hud hud-panel">
          <div className="logo-area">
            <h1>VISION V2.0</h1>
            <p>DELTA GLOBAL INTELLIGENCE</p>
          </div>

          <div className="status-lines">
            <p>TOP SECRET // SI-TK // NOFORN</p>
            <p>11-4166 OPS-4117</p>
            <p>GLOBAL NEAR LINCOLN MEMORIAL (WASHINGTON DC)</p>
          </div>

          <div className="layer-deck">
            <div className="deck-header">
              <span>DATA LAYERS</span>
              <button type="button" className="tiny-pill active">
                LINES
              </button>
            </div>

            <div className="deck-carousel">
              <button type="button" className="nav-square">
                ‹
              </button>
              <div className="deck-card active">
                <strong>LINES</strong>
                <span>ORBITAL + ROUTES</span>
              </div>
              <button type="button" className="nav-square">
                ›
              </button>
            </div>

            <div className="dot-row" aria-hidden>
              <span />
              <span />
              <span className="active" />
              <span />
            </div>
          </div>

          <div className="layer-cards">
            {layerCards.map((card) => {
              const isEnabled = layers[card.id] ?? card.enabled;
              return (
                <article key={card.id} className={`layer-row ${isEnabled ? 'enabled' : 'disabled'}`}>
                  <div className="layer-title-row">
                    <h3>
                      <span>{card.icon}</span>
                      {card.title}
                    </h3>
                    <span className={`check-tag ${isEnabled ? 'on' : 'off'}`}>◱</span>
                  </div>
                  <p>{card.subtitle}</p>
                  <p className="meta-line">{card.meta}</p>
                  <div className="layer-ops">
                    <button type="button" className="mini-control">
                      CFG
                    </button>
                    <button
                      type="button"
                      className={`mini-control ${isEnabled ? 'active' : ''}`}
                      onClick={() => toggleLayer(card.id)}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="center-stage">
          <div className="top-style-tabs hud-panel">
            {topTabs.map((tab) => (
              <button key={tab} type="button" className={`top-tab ${tab === 'BALANCED' ? 'active' : ''}`}>
                {tab}
              </button>
            ))}
            <button type="button" className="top-tab moon">
              ☾
            </button>
          </div>

          <div className="globe-holder">{children}</div>

          <div className="reticle" aria-hidden>
            <span />
            <span />
          </div>

          <div className="mode-dock hud-panel">
            <div className="mode-tabs">
              {visionModes.map((mode) => (
                <button key={mode} type="button" className={`mode-tab ${mode === 'Spotlight' ? 'active' : ''}`}>
                  {mode}
                </button>
              ))}
            </div>
            <div className="search-box">⌕ colleseum</div>
            <div className="dock-location">{location}</div>
          </div>
        </section>

        <section className="right-hud hud-panel">
          <div className="style-header">
            <span>ACTIVE STYLE</span>
            <h2>SPOTLIGHT</h2>
          </div>

          <div className="params-panel inner-panel">
            <div className="panel-title-row">
              <span>PARAMETERS</span>
              <button type="button" className="plus-btn">
                +
              </button>
            </div>

            <div className="param-block">
              <label>PIXELATION</label>
              <div className="track">
                <i style={{ width: '7%' }} />
              </div>
            </div>

            <div className="param-block">
              <label>DISTORTION</label>
              <div className="track">
                <i style={{ width: '7%' }} />
              </div>
            </div>

            <div className="param-block">
              <label>INSTABILITY</label>
              <div className="track">
                <i style={{ width: '7%' }} />
              </div>
            </div>

            <div className="param-block">
              <label>BLUR</label>
              <div className="track">
                <i style={{ width: '7%' }} />
              </div>
            </div>
          </div>

          <div className="telemetry-lines">
            <p>GSD: 0.57M</p>
            <p>ALT: 515M</p>
          </div>

          <div className="inner-panel camera-focus">
            <h4>CAMERA FOCUS</h4>
            <div className="split-buttons">
              <button type="button" className="active">
                MOUSE
              </button>
              <button type="button">CROSSHAIR</button>
            </div>
            <p>Left-drag to pan, right-drag to orbit place view.</p>
          </div>

          <div className="inner-panel shader-panel">
            <h4>CUSTOM SHADER</h4>
            <div className="shader-enabled">
              <span>ENABLED</span>
              <button type="button" className="active">
                ON
              </button>
            </div>
            <div className="accent-label">ACCENT</div>
            <div className="accent-bar" />

            <div className="accent-grid">
              {accents.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  className={theme.accent === accentToStore[accent] ? 'active' : ''}
                  onClick={() => setTheme({ accent: accentToStore[accent] })}
                >
                  {accent}
                </button>
              ))}
            </div>

            <button type="button" className="reset-btn" onClick={() => setTheme({ accent: 'teal' })}>
              RESET CUSTOM
            </button>

            <p className="shader-copy">
              Accent recolors cyan highlights (REC, location telemetry, ALT/GSD, focus ALT/SPD/HDG, active controls).
              Background stays black.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
