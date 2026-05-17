export function setText(id: string, value: string) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

export function setHidden(id: string, hidden: boolean) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.classList.toggle('hidden', hidden);
  node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function parseHex(hex: string) {
  const clean = hex.trim().replace('#', '');
  if (clean.length !== 6) {
    return null;
  }

  const value = Number.parseInt(clean, 16);
  if (Number.isNaN(value)) {
    return null;
  }

  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function rgba(hex: string, alpha: number) {
  const parsed = parseHex(hex);
  if (!parsed) {
    return `rgba(38, 201, 255, ${alpha})`;
  }

  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

export function applyAccent(hex: string) {
  const root = document.documentElement;
  root.style.setProperty('--cyan', hex);
  root.style.setProperty('--ui-accent-soft', rgba(hex, 0.76));
  root.style.setProperty('--ui-accent-faint', rgba(hex, 0.34));
  root.style.setProperty('--ui-accent-glow', rgba(hex, 0.2));
}
