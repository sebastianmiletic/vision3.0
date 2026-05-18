import { useEffect } from 'react';

import { setText } from '../utils/domUi';

type ExtraFact = {
  label: string;
  value: string;
};

type StaticProfile = {
  id: string;
  fullName: string;
  birthDate: string;
  gradeBase: number;
  gradeBaseYear: number;
  sport: string;
  eyeColor: string;
  address: string;
  notes: string;
  connectionNames: string;
  extraFacts: ExtraFact[];
  photoDataUrl: string;
  createdAt: string;
  updatedAt: string;
};

type NetworkNode = {
  profile: StaticProfile;
  x: number;
  y: number;
  z: number;
  depth: number;
};

type NetworkEdge = {
  a: string;
  b: string;
  weight: number;
};

const STORAGE_KEY = 'vision-static-profiles-v1';
const STATUS_PREFIX = 'Static Profiling';
const NETWORK_FRAME_INTERVAL_MS = 1000 / 15;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function createProfileId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ageFromBirthDate(birthDate: string, now: Date) {
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

function gradeFromProfile(profile: StaticProfile, nowYear: number) {
  const delta = nowYear - profile.gradeBaseYear;
  return Math.max(1, profile.gradeBase + Math.max(0, delta));
}

function parseExtraFacts(raw: string): ExtraFact[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(':');
      if (separator === -1) {
        return { label: 'Info', value: line };
      }

      return {
        label: line.slice(0, separator).trim() || 'Info',
        value: line.slice(separator + 1).trim() || '--',
      };
    });
}

function profileFallbackAvatar(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f2438" />
          <stop offset="100%" stop-color="#091019" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" fill="url(#bg)" />
      <circle cx="120" cy="120" r="96" fill="rgba(44,193,255,0.2)" stroke="rgba(44,193,255,0.65)" stroke-width="3" />
      <text x="120" y="136" text-anchor="middle" fill="#d9efff" font-family="Orbitron, sans-serif" font-size="62">${initials}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function serializeProfiles(profiles: StaticProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function seededProfiles(): StaticProfile[] {
  const nowIso = new Date().toISOString();
  const baseYear = new Date().getFullYear() - 2;
  return [
    {
      id: createProfileId(),
      fullName: 'Ava Thompson',
      birthDate: '2008-11-12',
      gradeBase: 9,
      gradeBaseYear: baseYear,
      sport: 'Basketball',
      eyeColor: 'Hazel',
      address: '14 Kent Ave, Sydney',
      notes: 'Captain in school team, robotics club member.',
      connectionNames: 'Noah Martinez, Mia Patel',
      extraFacts: [{ label: 'House', value: 'Blue Falcons' }, { label: 'Club', value: 'Robotics' }],
      photoDataUrl: profileFallbackAvatar('Ava Thompson'),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: createProfileId(),
      fullName: 'Noah Martinez',
      birthDate: '2009-03-01',
      gradeBase: 8,
      gradeBaseYear: baseYear,
      sport: 'Basketball',
      eyeColor: 'Brown',
      address: '2 Bay St, Sydney',
      notes: 'Keeps training stats and team schedules.',
      connectionNames: 'Ava Thompson',
      extraFacts: [{ label: 'Preferred Position', value: 'Point Guard' }],
      photoDataUrl: profileFallbackAvatar('Noah Martinez'),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: createProfileId(),
      fullName: 'Mia Patel',
      birthDate: '2008-07-24',
      gradeBase: 9,
      gradeBaseYear: baseYear,
      sport: 'Tennis',
      eyeColor: 'Green',
      address: '14 Kent Ave, Sydney',
      notes: 'Science olympiad + tennis state qualifier.',
      connectionNames: 'Ava Thompson',
      extraFacts: [{ label: 'Tutor Subject', value: 'Physics' }],
      photoDataUrl: profileFallbackAvatar('Mia Patel'),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

function loadProfilesFromStorage(): StaticProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seededProfiles();
      serializeProfiles(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid profile store');
    }
    return parsed as StaticProfile[];
  } catch (error) {
    console.error('Failed to parse static profile storage', error);
    const seeded = seededProfiles();
    serializeProfiles(seeded);
    return seeded;
  }
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function linksForProfiles(profiles: StaticProfile[], now: Date) {
  const links = new Map<string, NetworkEdge>();
  const nowYear = now.getFullYear();
  const byName = new Map<string, StaticProfile>();
  profiles.forEach((profile) => byName.set(normalizeText(profile.fullName), profile));

  const registerEdge = (aId: string, bId: string, weight: number) => {
    const [first, second] = [aId, bId].sort();
    if (!first || !second || first === second) {
      return;
    }
    const key = `${first}|${second}`;
    const existing = links.get(key);
    if (existing) {
      existing.weight += weight;
      return;
    }
    links.set(key, { a: first, b: second, weight });
  };

  for (let i = 0; i < profiles.length; i += 1) {
    for (let j = i + 1; j < profiles.length; j += 1) {
      const left = profiles[i];
      const right = profiles[j];
      let weight = 0;

      if (gradeFromProfile(left, nowYear) === gradeFromProfile(right, nowYear)) {
        weight += 1;
      }
      if (normalizeText(left.sport) && normalizeText(left.sport) === normalizeText(right.sport)) {
        weight += 1;
      }
      if (normalizeText(left.address) && normalizeText(left.address) === normalizeText(right.address)) {
        weight += 1;
      }

      if (weight > 0) {
        registerEdge(left.id, right.id, weight);
      }
    }
  }

  profiles.forEach((profile) => {
    profile.connectionNames
      .split(',')
      .map((part) => normalizeText(part))
      .filter(Boolean)
      .forEach((name) => {
        const match = byName.get(name);
        if (match && match.id !== profile.id) {
          registerEdge(profile.id, match.id, 2);
        }
      });
  });

  return Array.from(links.values());
}

function baseNodePositions(count: number) {
  if (count <= 0) {
    return [];
  }
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const y = 1 - t * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    positions.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    });
  }
  return positions;
}

function drawNetwork(
  canvas: HTMLCanvasElement,
  profiles: StaticProfile[],
  links: NetworkEdge[],
  selectedId: string | null,
  now: Date,
  tickMs: number,
) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const displayWidth = canvas.clientWidth || 520;
  const displayHeight = canvas.clientHeight || 240;
  const dpr = window.devicePixelRatio || 1;
  const targetWidth = Math.max(1, Math.floor(displayWidth * dpr));
  const targetHeight = Math.max(1, Math.floor(displayHeight * dpr));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);

  context.fillStyle = 'rgba(3, 11, 18, 0.78)';
  context.fillRect(0, 0, displayWidth, displayHeight);
  context.strokeStyle = 'rgba(42, 95, 130, 0.24)';
  context.lineWidth = 1;
  for (let x = 0; x < displayWidth; x += 24) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, displayHeight);
    context.stroke();
  }
  for (let y = 0; y < displayHeight; y += 24) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(displayWidth, y + 0.5);
    context.stroke();
  }

  if (!profiles.length) {
    context.fillStyle = 'rgba(194, 222, 246, 0.9)';
    context.font = '12px "Share Tech Mono", monospace';
    context.fillText('No profiles yet. Add a person to initialize the network.', 16, 28);
    return;
  }

  const base = baseNodePositions(profiles.length);
  const indexById = new Map<string, number>();
  profiles.forEach((profile, index) => indexById.set(profile.id, index));

  const nowYear = now.getFullYear();
  const spin = tickMs * 0.00024;
  const tilt = 0.45;
  const centerX = displayWidth * 0.5;
  const centerY = displayHeight * 0.53;
  const radius = Math.min(displayWidth, displayHeight) * 0.33;

  const nodes: NetworkNode[] = profiles.map((profile, index) => {
    const basePoint = base[index];
    const cosSpin = Math.cos(spin + index * 0.16);
    const sinSpin = Math.sin(spin + index * 0.16);
    const x1 = basePoint.x * cosSpin - basePoint.z * sinSpin;
    const z1 = basePoint.x * sinSpin + basePoint.z * cosSpin;
    const y1 = basePoint.y;

    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);
    const y2 = y1 * cosTilt - z1 * sinTilt;
    const z2 = y1 * sinTilt + z1 * cosTilt;
    const perspective = 1 / (1.8 - z2 * 0.7);

    return {
      profile,
      x: centerX + x1 * radius * perspective,
      y: centerY + y2 * radius * perspective,
      z: z2,
      depth: perspective,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.profile.id, node]));
  const sortedLinks = [...links].sort((a, b) => {
    const aLeft = nodeById.get(a.a);
    const aRight = nodeById.get(a.b);
    const bLeft = nodeById.get(b.a);
    const bRight = nodeById.get(b.b);
    const aDepth = (aLeft?.z ?? 0) + (aRight?.z ?? 0);
    const bDepth = (bLeft?.z ?? 0) + (bRight?.z ?? 0);
    return aDepth - bDepth;
  });

  sortedLinks.forEach((edge) => {
    const left = nodeById.get(edge.a);
    const right = nodeById.get(edge.b);
    if (!left || !right) {
      return;
    }
    const glow = Math.min(0.82, 0.18 + edge.weight * 0.14 + (left.depth + right.depth) * 0.16);
    context.strokeStyle = `rgba(38, 197, 255, ${glow})`;
    context.lineWidth = 1 + edge.weight * 0.4;
    context.beginPath();
    context.moveTo(left.x, left.y);
    context.lineTo(right.x, right.y);
    context.stroke();
  });

  nodes
    .sort((a, b) => a.z - b.z)
    .forEach((node) => {
      const isSelected = selectedId === node.profile.id;
      const nodeGrade = gradeFromProfile(node.profile, nowYear);
      const baseRadius = 5 + node.depth * 3.2;
      const finalRadius = isSelected ? baseRadius + 3 : baseRadius;
      const color = isSelected ? 'rgba(90, 225, 255, 0.95)' : 'rgba(202, 226, 248, 0.86)';

      context.beginPath();
      context.fillStyle = 'rgba(9, 32, 46, 0.88)';
      context.arc(node.x, node.y, finalRadius + 2.2, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.fillStyle = color;
      context.arc(node.x, node.y, finalRadius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = 'rgba(220, 238, 255, 0.95)';
      context.font = '10px "Share Tech Mono", monospace';
      const label = `${node.profile.fullName.split(' ')[0]} · G${nodeGrade}`;
      context.fillText(label, node.x + finalRadius + 4, node.y - finalRadius - 1);
    });
}

export function useLegacyStaticProfilingAddon() {
  useEffect(() => {
    const panel = document.getElementById('staticProfilingPanel');
    const gallery = document.getElementById('staticProfilingGallery');
    const detail = document.getElementById('staticProfilingDetail');
    const searchInput = document.getElementById('staticProfilingSearchInput') as HTMLInputElement | null;
    const addButton = document.getElementById('staticProfilingAddBtn') as HTMLButtonElement | null;
    const modal = document.getElementById('staticProfilingFormModal');
    const closeButton = document.getElementById('staticProfilingFormCloseBtn') as HTMLButtonElement | null;
    const cancelButton = document.getElementById('staticProfilingCancelBtn') as HTMLButtonElement | null;
    const form = document.getElementById('staticProfilingForm') as HTMLFormElement | null;
    const photoInput = document.getElementById('staticProfilingPhotoInput') as HTMLInputElement | null;
    const canvas = document.getElementById('staticProfilingNetworkCanvas') as HTMLCanvasElement | null;
    const personCount = document.getElementById('staticProfilingPersonCount');
    const connectionCount = document.getElementById('staticProfilingConnectionCount');

    if (!panel || !gallery || !detail || !searchInput || !addButton || !modal || !closeButton || !cancelButton
      || !form || !photoInput || !canvas || !personCount || !connectionCount) {
      return;
    }

    const nameInput = form.querySelector<HTMLInputElement>('#staticProfilingNameInput');
    const birthDateInput = form.querySelector<HTMLInputElement>('#staticProfilingBirthDateInput');
    const gradeInput = form.querySelector<HTMLInputElement>('#staticProfilingGradeInput');
    const gradeYearInput = form.querySelector<HTMLInputElement>('#staticProfilingGradeYearInput');
    const sportInput = form.querySelector<HTMLInputElement>('#staticProfilingSportInput');
    const eyeColorInput = form.querySelector<HTMLInputElement>('#staticProfilingEyeColorInput');
    const addressInput = form.querySelector<HTMLInputElement>('#staticProfilingAddressInput');
    const connectionsInput = form.querySelector<HTMLInputElement>('#staticProfilingConnectionsInput');
    const extraInfoInput = form.querySelector<HTMLTextAreaElement>('#staticProfilingExtraInfoInput');
    const notesInput = form.querySelector<HTMLTextAreaElement>('#staticProfilingNotesInput');

    if (!nameInput || !birthDateInput || !gradeInput || !gradeYearInput || !sportInput || !eyeColorInput
      || !addressInput || !connectionsInput || !extraInfoInput || !notesInput) {
      return;
    }

    let profiles = loadProfilesFromStorage();
    let selectedProfileId: string | null = profiles[0]?.id ?? null;
    let query = '';
    let now = new Date();
    let frameHandle: number | null = null;
    let minuteTicker: number | null = null;

    const filteredProfiles = () => {
      if (!query) {
        return profiles;
      }
      const nowYear = now.getFullYear();
      return profiles.filter((profile) => {
        const grade = `g${gradeFromProfile(profile, nowYear)}`;
        const source = [
          profile.fullName,
          profile.sport,
          profile.address,
          profile.eyeColor,
          grade,
          profile.notes,
          profile.connectionNames,
        ].map(normalizeText).join(' ');
        return source.includes(query);
      });
    };

    const openModal = () => {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      if (!gradeYearInput.value) {
        gradeYearInput.value = String(new Date().getFullYear());
      }
      nameInput.focus();
    };

    const closeModal = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      form.reset();
      gradeYearInput.value = String(new Date().getFullYear());
    };

    const renderDetail = (profile: StaticProfile | undefined) => {
      if (!profile) {
        detail.innerHTML = 'Select a person to view full profile data.';
        return;
      }

      const age = ageFromBirthDate(profile.birthDate, now);
      const grade = gradeFromProfile(profile, now.getFullYear());
      const extraRows = profile.extraFacts.length
        ? profile.extraFacts.map((fact) => `
          <div class="static-profiling-detail-row">
            <span>${escapeHtml(fact.label)}</span>
            <strong>${escapeHtml(fact.value)}</strong>
          </div>
        `).join('')
        : '<p class="static-profiling-empty">No additional facts yet.</p>';

      const connectionLabels = profile.connectionNames
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      detail.innerHTML = `
        <article class="static-profiling-detail-card">
          <img src="${escapeHtml(profile.photoDataUrl)}" alt="${escapeHtml(profile.fullName)}">
          <div>
            <h4>${escapeHtml(profile.fullName)}</h4>
            <p>Age ${age} · Grade ${grade} · ${escapeHtml(profile.sport)}</p>
            <p>${escapeHtml(profile.address)}</p>
            <p>Eye colour: ${escapeHtml(profile.eyeColor)}</p>
          </div>
        </article>
        <div class="static-profiling-detail-grid">
          <div class="static-profiling-detail-row">
            <span>Birth Date</span>
            <strong>${escapeHtml(profile.birthDate)}</strong>
          </div>
          <div class="static-profiling-detail-row">
            <span>Auto Grade</span>
            <strong>${grade} (base ${profile.gradeBase} @ ${profile.gradeBaseYear})</strong>
          </div>
          <div class="static-profiling-detail-row">
            <span>Connections</span>
            <strong>${connectionLabels.length ? escapeHtml(connectionLabels.join(', ')) : '--'}</strong>
          </div>
        </div>
        <p class="static-profiling-detail-notes">${escapeHtml(profile.notes || 'No notes yet.')}</p>
        <section class="static-profiling-detail-extra">
          <header><h5>Additional Info</h5></header>
          ${extraRows}
        </section>
        <div class="static-profiling-detail-actions">
          <button class="chip" id="staticProfilingDeleteBtn" type="button" data-static-profile-delete="${escapeHtml(profile.id)}">DELETE PERSON</button>
        </div>
      `;
    };

    const renderGallery = () => {
      const visible = filteredProfiles();
      if (!visible.length) {
        gallery.innerHTML = '<p class="static-profiling-empty">No people match this search.</p>';
        return;
      }

      const nowYear = now.getFullYear();
      gallery.innerHTML = visible.map((profile) => {
        const grade = gradeFromProfile(profile, nowYear);
        const age = ageFromBirthDate(profile.birthDate, now);
        const activeClass = selectedProfileId === profile.id ? 'active' : '';
        return `
          <article class="static-profiling-card ${activeClass}" data-static-profile-select="${escapeHtml(profile.id)}">
            <img src="${escapeHtml(profile.photoDataUrl)}" alt="${escapeHtml(profile.fullName)}">
            <div class="static-profiling-card-body">
              <h4>${escapeHtml(profile.fullName)}</h4>
              <p>Age ${age} · Grade ${grade}</p>
              <p>${escapeHtml(profile.sport)} · ${escapeHtml(profile.eyeColor)} eyes</p>
            </div>
          </article>
        `;
      }).join('');
    };

    const renderCounts = (links: NetworkEdge[]) => {
      const total = profiles.length;
      personCount.textContent = String(total);
      connectionCount.textContent = String(links.length);
      setText('staticProfilingAddonCount', String(total));
      setText('staticProfilingStatus', `${STATUS_PREFIX} online · ${total} profile${total === 1 ? '' : 's'} tracked`);
      setText(
        'staticProfilingAddonStatus',
        total > 0
          ? `${total} people indexed · ${links.length} active links`
          : 'No profiles yet · open addon to add people',
      );
    };

    const renderNetworkFrame = (links: NetworkEdge[]) => {
      drawNetwork(canvas, profiles, links, selectedProfileId, now, Date.now());
    };

    const renderAll = () => {
      const links = linksForProfiles(profiles, now);
      if (selectedProfileId && !profiles.some((profile) => profile.id === selectedProfileId)) {
        selectedProfileId = profiles[0]?.id ?? null;
      }
      renderGallery();
      renderDetail(profiles.find((profile) => profile.id === selectedProfileId));
      renderCounts(links);
      renderNetworkFrame(links);
    };

    const persistAndRender = () => {
      profiles = [...profiles].sort((a, b) => a.fullName.localeCompare(b.fullName));
      serializeProfiles(profiles);
      renderAll();
    };

    const onShellClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const openCard = target.closest<HTMLElement>('[data-static-profile-select]');
      if (openCard) {
        const profileId = openCard.getAttribute('data-static-profile-select');
        if (profileId) {
          selectedProfileId = profileId;
          renderAll();
        }
      }

      const deleteAction = target.closest<HTMLElement>('[data-static-profile-delete]');
      if (deleteAction) {
        const profileId = deleteAction.getAttribute('data-static-profile-delete');
        if (!profileId) {
          return;
        }
        const profile = profiles.find((item) => item.id === profileId);
        if (!profile) {
          return;
        }
        const confirmed = window.confirm(`Delete ${profile.fullName} from Static Profiling?`);
        if (!confirmed) {
          return;
        }
        profiles = profiles.filter((item) => item.id !== profileId);
        if (selectedProfileId === profileId) {
          selectedProfileId = profiles[0]?.id ?? null;
        }
        persistAndRender();
      }
    };

    const onSearchInput = () => {
      query = normalizeText(searchInput.value);
      renderGallery();
    };

    const onAddPerson = () => openModal();
    const onCloseModal = () => closeModal();

    const onFormSubmit = async (event: SubmitEvent) => {
      event.preventDefault();

      const fullName = nameInput.value.trim();
      const birthDate = birthDateInput.value;
      const gradeBase = Number.parseInt(gradeInput.value, 10);
      const gradeBaseYear = Number.parseInt(gradeYearInput.value, 10);
      const sport = sportInput.value.trim();
      const eyeColor = eyeColorInput.value.trim();
      const address = addressInput.value.trim();
      const connectionNames = connectionsInput.value.trim();
      const notes = notesInput.value.trim();
      const extraFacts = parseExtraFacts(extraInfoInput.value);

      if (!fullName || !birthDate || !Number.isFinite(gradeBase) || !Number.isFinite(gradeBaseYear)
        || !sport || !eyeColor || !address) {
        setText('staticProfilingStatus', `${STATUS_PREFIX} form incomplete. Fill all required fields.`);
        return;
      }

      let photoDataUrl = profileFallbackAvatar(fullName);
      const selectedPhoto = photoInput.files?.[0];
      if (selectedPhoto) {
        try {
          const result = await readImageAsDataUrl(selectedPhoto);
          if (result) {
            photoDataUrl = result;
          }
        } catch (error) {
          console.error('Failed to convert profile image', error);
          setText('staticProfilingStatus', `${STATUS_PREFIX} image read failed. Fallback avatar used.`);
        }
      }

      const timestamp = new Date().toISOString();
      const profile: StaticProfile = {
        id: createProfileId(),
        fullName,
        birthDate,
        gradeBase,
        gradeBaseYear,
        sport,
        eyeColor,
        address,
        notes,
        connectionNames,
        extraFacts,
        photoDataUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      profiles = [...profiles, profile];
      selectedProfileId = profile.id;
      closeModal();
      persistAndRender();
      setText('staticProfilingStatus', `${STATUS_PREFIX} added ${fullName}.`);
    };

    let lastNetworkFrameAt = 0;
    let panelVisibilityObserver: MutationObserver | null = null;

    const isNetworkPanelVisible = () => !panel.classList.contains('hidden') && !document.hidden;

    const stopNetworkLoop = () => {
      if (frameHandle !== null) {
        window.cancelAnimationFrame(frameHandle);
        frameHandle = null;
      }
    };

    const animationLoop = (timestamp: number) => {
      if (!isNetworkPanelVisible()) {
        frameHandle = null;
        return;
      }

      if (timestamp - lastNetworkFrameAt >= NETWORK_FRAME_INTERVAL_MS) {
        lastNetworkFrameAt = timestamp;
        const links = linksForProfiles(profiles, now);
        renderNetworkFrame(links);
      }
      frameHandle = window.requestAnimationFrame(animationLoop);
    };

    const startNetworkLoop = () => {
      if (frameHandle !== null || !isNetworkPanelVisible()) {
        return;
      }
      frameHandle = window.requestAnimationFrame(animationLoop);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopNetworkLoop();
        return;
      }

      startNetworkLoop();
    };

    gradeYearInput.value = String(new Date().getFullYear());
    renderAll();
    startNetworkLoop();
    minuteTicker = window.setInterval(() => {
      now = new Date();
      renderAll();
    }, 30_000);

    panelVisibilityObserver = new MutationObserver(() => {
      if (isNetworkPanelVisible()) {
        startNetworkLoop();
        return;
      }
      stopNetworkLoop();
    });
    panelVisibilityObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });

    panel.addEventListener('click', onShellClick);
    searchInput.addEventListener('input', onSearchInput);
    addButton.addEventListener('click', onAddPerson);
    closeButton.addEventListener('click', onCloseModal);
    cancelButton.addEventListener('click', onCloseModal);
    form.addEventListener('submit', onFormSubmit);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      panel.removeEventListener('click', onShellClick);
      searchInput.removeEventListener('input', onSearchInput);
      addButton.removeEventListener('click', onAddPerson);
      closeButton.removeEventListener('click', onCloseModal);
      cancelButton.removeEventListener('click', onCloseModal);
      form.removeEventListener('submit', onFormSubmit);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopNetworkLoop();
      panelVisibilityObserver?.disconnect();
      if (minuteTicker !== null) {
        window.clearInterval(minuteTicker);
      }
    };
  }, []);
}
