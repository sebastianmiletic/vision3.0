import { setText } from './domUi';

export const WORLD_TEXTURE_FILTERS: Record<string, string> = {
  'hyperreal-earth': 'contrast(1.04) saturate(1.04) brightness(1)',
  'true-color': 'none',
  'space-night': 'brightness(0.6) contrast(1.4) saturate(0.3)',
  'geoint-high-contrast': 'contrast(1.1) saturate(1.02) brightness(0.97)',
  'polar-clarity': 'contrast(1.08) saturate(0.9) brightness(1.01)',
  'infrared-scout': 'sepia(0.12) saturate(1.06) hue-rotate(-10deg) contrast(1.08) brightness(0.95)',
};

const LAYER_GROUP_ORDER = [
  'global-movement',
  'natural-events',
  'news-conflict',
  'global-data',
  'government-access',
  'markets-data',
  'network-configuration',
  'lines',
  'location-markers',
  'addons',
] as const;

function getLayerSectionsInDisplayOrderInternal() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.layer-section'));
  const groups = new Map<string, HTMLElement>();
  sections.forEach((section) => {
    const group = section.dataset.layerGroup;
    if (group && !groups.has(group)) {
      groups.set(group, section);
    }
  });

  const ordered = LAYER_GROUP_ORDER.map((group) => groups.get(group)).filter((section): section is HTMLElement => Boolean(section));
  sections.forEach((section) => {
    if (!ordered.includes(section)) {
      ordered.push(section);
    }
  });

  return ordered;
}

export function getLayerSectionsInDisplayOrder() {
  return getLayerSectionsInDisplayOrderInternal();
}

function isGroupOff(section: HTMLElement) {
  return section.classList.contains('group-off');
}

function applyGroupOffStyles(section: HTMLElement, dotIndex: number) {
  const tab = document.getElementById('layerGroupActive');
  if (tab) {
    tab.classList.toggle('group-off', isGroupOff(section));
  }

  const dotsWrap = document.getElementById('layerSectionDots');
  const dot = dotsWrap?.children?.item(dotIndex);
  if (dot) {
    dot.classList.toggle('group-off', isGroupOff(section));
  }
}

export function updateLayerSection(index: number) {
  const sections = getLayerSectionsInDisplayOrderInternal();
  if (!sections.length) {
    return;
  }

  const activeIndex = ((index % sections.length) + sections.length) % sections.length;
  const activeSection = sections[activeIndex];
  if (!activeSection) {
    return;
  }

  sections.forEach((section, sectionIndex) => {
    const active = sectionIndex === activeIndex;
    section.classList.toggle('is-active', active);
    section.setAttribute('aria-hidden', active ? 'false' : 'true');
  });

  const title = activeSection.querySelector('h3')?.textContent ?? 'Layer Group';
  const meta = activeSection.querySelector('p')?.textContent ?? 'Telemetry';
  setText('activeLayerGroupLabel', title);
  setText('layerGroupActiveTitle', title);
  setText('layerGroupActiveMeta', meta);

  const dotsWrap = document.getElementById('layerSectionDots');
  if (!dotsWrap) {
    return;
  }

  if (!dotsWrap.children.length) {
    sections.forEach((_, dotIndex) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'layer-section-dot';
      dot.dataset.layerSectionIndex = String(dotIndex);
      dot.setAttribute('aria-label', `Layer section ${dotIndex + 1}`);
      dotsWrap.appendChild(dot);
    });
  }

  Array.from(dotsWrap.children).forEach((dotNode, dotIndex) => {
    dotNode.classList.toggle('active', dotIndex === activeIndex);
  });

  applyGroupOffStyles(activeSection, activeIndex);
}

export function updateEffectSliders() {
  const root = document.documentElement;
  const read = (id: string, fallback: string) => Number((document.getElementById(id) as HTMLInputElement | null)?.value ?? fallback);

  const pix = read('pixelation', '0');
  const dist = read('distortion', '0');
  const inst = read('instability', '0');
  const blur = read('sceneBlur', '0');
  const bloom = read('bloomStrength', '0.25');
  const sharpen = read('sharpenStrength', '0.56');
  const spotlight = read('spotlightStrength', '1');

  root.style.setProperty('--pix', String(pix));
  root.style.setProperty('--dist', String(dist));
  root.style.setProperty('--inst', String(inst));
  root.style.setProperty('--scene-blur', String(blur));
  root.style.setProperty('--spotlight-strength', String(Math.min(1, Math.max(0, spotlight))));

  setText('bloomValue', `${Math.round((bloom / 3) * 100)}%`);
  setText('sharpenValue', `${Math.round(sharpen * 100)}%`);
  setText('spotlightValue', `${Math.round(spotlight * 100)}%`);
}
