/**
 * Character Studio pedestal — enumerate every clip, preview by name,
 * let the player bind states. No silent ordinal / "clip not found".
 *
 * Serve: cd experiments/meshy_actor && python3 -m http.server 8765
 * Open:  http://127.0.0.1:8765/browser_explorer/
 */

/** @typedef {"idle"|"walking"|"running"|"waving"|"celebrating"} CharacterState */

const STATES = /** @type {const} */ ([
  // preferred = Meshy library *names* (often wrong). observedClip = what this
  // character.glb actually looks like when you watch it (2026-09-15 eye check).
  {
    id: "idle",
    label: "IDLE",
    key: "1",
    loop: true,
    preferred: ["Idle", "Idle_02", "Idle_03"],
    // This pack has no true idle. Leave unbound rather than fake it.
    observedClip: null,
  },
  {
    id: "walking",
    label: "WALK",
    key: "2",
    loop: true,
    preferred: ["Casual_Walk", "Walking_Woman", "Quick_Walk"],
    // Clip named Idle is a cautious walk.
    observedClip: "Idle",
  },
  {
    id: "running",
    label: "RUN",
    key: "3",
    loop: true,
    preferred: ["Run_02", "Run_03", "RunFast"],
    // Clip named Casual_Walk is clearly a run.
    observedClip: "Casual_Walk",
  },
  {
    id: "waving",
    label: "WAVE",
    key: "4",
    loop: false,
    preferred: ["Wave_One_Hand", "Big_Wave_Hello"],
    // Clip named Run_02 is a one-hand wave.
    observedClip: "Run_02",
  },
  {
    id: "celebrating",
    label: "CELEBRATE",
    key: "5",
    loop: false,
    preferred: ["Victory_Cheer", "Cheer_with_Both_Hands_Up", "Motivational_Cheer"],
    // Clip named Wave_One_Hand is the celebrate. Victory_Cheer stays as alt.
    observedClip: "Wave_One_Hand",
  },
]);

const PRIMARY_SRC = "../output/character.glb";
/** Extra packs Meshy sometimes exports as separate GLBs — still enumerated. */
const EXTRA_PACKS = [
  {
    src: "../output/intermediates/celebrate_alone_59.glb",
    label: "celebrate pack",
  },
];

// Bump when observed remapping changes so stale localStorage cannot fight you.
const STORAGE_KEY = "meshyActor.poseBindings.v2";

const viewer = document.getElementById("viewer");
const statusEl = document.getElementById("status");
const poseListEl = document.getElementById("pose-list");
const stateButtonsEl = document.getElementById("state-buttons");
const bindEditorsEl = document.getElementById("bind-editors");
const assignStateEl = document.getElementById("assign-state");
const badgeName = document.getElementById("badge-name");
const badgeMeta = document.getElementById("badge-meta");
const sparkleLayer = document.getElementById("sparkle-layer");

/**
 * @typedef {{ name: string, src: string, packLabel: string }} Pose
 */

/** @type {Pose[]} */
let poses = [];
/** @type {Map<string, string>} stateId → clip name */
const bindings = new Map();
/** @type {CharacterState | null} */
let activeState = null;
/** @type {string | null} */
let currentClipName = null;
/** @type {string} */
let currentSrc = PRIMARY_SRC;
/** @type {ReturnType<typeof setTimeout>|null} */
let oneShotTimer = null;
let sparklesOn = true;
let hueDeg = 0;
let tintStrength = 0;

function setStatus(msg, err = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", err);
}

function clipTokens(name) {
  return String(name || "")
    .split("|")
    .flatMap((part) => part.split("/"))
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalizeKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function displayName(clipName) {
  const tokens = clipTokens(clipName);
  // Prefer the meaningful middle token: Armature|Victory_Cheer|baselayer → Victory_Cheer
  if (tokens.length >= 2) {
    const mid = tokens.find((t) => !/^armature$/i.test(t) && !/baselayer/i.test(t));
    if (mid) return mid;
  }
  return clipName || "(unnamed)";
}

function findPose(clipName) {
  return poses.find((p) => p.name === clipName) || null;
}

function refreshBadge() {
  badgeName.textContent = currentClipName ? displayName(currentClipName) : "—";
  const pose = currentClipName ? findPose(currentClipName) : null;
  const boundTo = [...bindings.entries()]
    .filter(([, clip]) => clip === currentClipName)
    .map(([stateId]) => STATES.find((s) => s.id === stateId)?.label || stateId);
  const bits = [];
  if (currentClipName) bits.push(currentClipName);
  if (pose && pose.src !== PRIMARY_SRC) bits.push(pose.packLabel);
  if (boundTo.length) bits.push(`bound: ${boundTo.join(", ")}`);
  if (activeState) bits.push(`state: ${activeState}`);
  badgeMeta.textContent = bits.join(" · ") || "pick a pose";
}

function refreshPoseList() {
  document.getElementById("pose-count").textContent = String(poses.length);
  poseListEl.innerHTML = "";
  poses.forEach((pose, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pose" + (pose.name === currentClipName ? " playing" : "");
    b.innerHTML = `<span>${displayName(pose.name)}</span><span class="idx">#${i + 1}${
      pose.src !== PRIMARY_SRC ? " · extra" : ""
    }</span>`;
    b.title = pose.name;
    b.addEventListener("click", () => previewPose(pose.name));
    poseListEl.appendChild(b);
  });
}

function refreshStateButtons() {
  stateButtonsEl.innerHTML = "";
  for (const s of STATES) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.state = s.id;
    const clip = bindings.get(s.id);
    b.textContent = clip ? s.label : `${s.label}?`;
    b.title = clip ? `${s.label} → ${clip}` : `${s.label} unbound — assign a pose`;
    b.classList.toggle("active", activeState === s.id);
    b.addEventListener("click", () => requestState(s.id));
    stateButtonsEl.appendChild(b);
  }
}

function refreshBindEditors() {
  bindEditorsEl.innerHTML = "";
  assignStateEl.innerHTML = "";
  for (const s of STATES) {
    const row = document.createElement("div");
    row.className = "bind-row";
    const lab = document.createElement("label");
    lab.textContent = s.label;
    const sel = document.createElement("select");
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "(unbound)";
    sel.appendChild(none);
    for (const pose of poses) {
      const opt = document.createElement("option");
      opt.value = pose.name;
      opt.textContent = displayName(pose.name);
      if (bindings.get(s.id) === pose.name) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener("change", () => {
      if (sel.value) bindings.set(s.id, sel.value);
      else bindings.delete(s.id);
      persistBindings();
      refreshStateButtons();
      refreshBadge();
      setStatus(`Bound ${s.label} → ${sel.value ? displayName(sel.value) : "(unbound)"}`);
    });
    row.appendChild(lab);
    row.appendChild(sel);
    bindEditorsEl.appendChild(row);

    const assignOpt = document.createElement("option");
    assignOpt.value = s.id;
    assignOpt.textContent = s.label;
    assignStateEl.appendChild(assignOpt);
  }
}

function persistBindings() {
  const obj = Object.fromEntries(bindings.entries());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function loadPersistedBindings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    bindings.clear();
    for (const s of STATES) {
      const clip = obj[s.id];
      if (typeof clip === "string" && findPose(clip)) bindings.set(s.id, clip);
    }
    return bindings.size > 0;
  } catch {
    return false;
  }
}

function autoGuessBindings() {
  bindings.clear();
  const used = new Set();

  // 1) Observed remapping for this Meshy pack (names lie; motion doesn't).
  for (const s of STATES) {
    if (!s.observedClip) continue;
    const hit = findPose(s.observedClip);
    if (hit && !used.has(hit.name)) {
      bindings.set(s.id, hit.name);
      used.add(hit.name);
    }
  }

  // 2) Fall back to Meshy library name guesses only for still-unbound states.
  for (const s of STATES) {
    if (bindings.has(s.id)) continue;
    if (s.observedClip === null) continue; // explicitly no clip (idle)
    for (const want of s.preferred) {
      const wantKey = normalizeKey(want);
      const hit = poses.find((p) => {
        if (used.has(p.name)) return false;
        if (normalizeKey(p.name) === wantKey) return true;
        return clipTokens(p.name).some((t) => normalizeKey(t) === wantKey);
      });
      if (hit) {
        bindings.set(s.id, hit.name);
        used.add(hit.name);
        break;
      }
    }
  }

  persistBindings();
  refreshBindEditors();
  refreshStateButtons();
  const unbound = STATES.filter((s) => !bindings.has(s.id)).map((s) => s.label);
  setStatus(
    unbound.length
      ? `Observed remap applied. Unbound (ok if intentional): ${unbound.join(", ")}.`
      : `Observed remap bound all ${STATES.length} states.`
  );
}

async function ensureSrc(src) {
  if (currentSrc === src && viewer.loaded) return;
  setStatus(`Loading ${src}…`);
  currentSrc = src;
  const done = new Promise((resolve, reject) => {
    const onLoad = () => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = (ev) => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onErr);
      reject(ev.detail?.sourceError || new Error("load failed"));
    };
    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onErr);
  });
  viewer.src = src;
  await done;
}

async function playClip(clipName, { loop = true, asState = null } = {}) {
  if (oneShotTimer) {
    clearTimeout(oneShotTimer);
    oneShotTimer = null;
  }
  const pose = findPose(clipName);
  if (!pose) {
    setStatus(`Clip not in enumerated list: ${clipName}`, true);
    return;
  }

  await ensureSrc(pose.src);
  viewer.animationName = pose.name;
  try {
    viewer.play({ repetitions: loop ? Infinity : 1 });
  } catch {
    viewer.play();
  }

  currentClipName = pose.name;
  activeState = asState;
  refreshBadge();
  refreshPoseList();
  refreshStateButtons();
  setStatus(`Playing ${displayName(pose.name)}`);

  if (!loop) {
    const returnTo =
      bindings.get("walking") ||
      bindings.get("running") ||
      bindings.get("idle") ||
      poses[0]?.name;
    const returnState = bindings.get("walking")
      ? "walking"
      : bindings.get("running")
        ? "running"
        : bindings.get("idle")
          ? "idle"
          : null;
    const onFinish = () => {
      viewer.removeEventListener("finished", onFinish);
      if (currentClipName === pose.name && returnTo) {
        playClip(returnTo, { loop: true, asState: returnState });
      }
    };
    viewer.addEventListener("finished", onFinish);
    oneShotTimer = setTimeout(() => {
      viewer.removeEventListener("finished", onFinish);
      if (currentClipName === pose.name && returnTo) {
        playClip(returnTo, { loop: true, asState: returnState });
      }
    }, 5000);
  }
}

function previewPose(clipName) {
  playClip(clipName, { loop: true, asState: null });
}

function requestState(stateId) {
  const meta = STATES.find((s) => s.id === stateId);
  const clip = bindings.get(stateId);
  if (!clip) {
    setStatus(`${meta.label} is unbound — pick a pose from the list, then ASSIGN`, true);
    assignStateEl.value = stateId;
    activeState = stateId;
    refreshStateButtons();
    refreshBadge();
    return;
  }
  playClip(clip, { loop: meta.loop, asState: stateId });
}

function assignCurrentToSelectedState() {
  if (!currentClipName) {
    setStatus("Preview a pose first", true);
    return;
  }
  const stateId = assignStateEl.value;
  const meta = STATES.find((s) => s.id === stateId);
  bindings.set(stateId, currentClipName);
  persistBindings();
  refreshBindEditors();
  refreshStateButtons();
  refreshBadge();
  setStatus(`Assigned ${meta.label} → ${displayName(currentClipName)}`);
}

async function loadPoseCatalog() {
  /** @type {Pose[]} */
  const catalog = [];

  // Primary asset
  await ensureSrc(PRIMARY_SRC);
  for (const name of viewer.availableAnimations || []) {
    catalog.push({ name, src: PRIMARY_SRC, packLabel: "character.glb" });
  }

  // Extra packs (celebrate, etc.) — load briefly to read animation names
  for (const pack of EXTRA_PACKS) {
    try {
      await ensureSrc(pack.src);
      for (const name of viewer.availableAnimations || []) {
        if (!catalog.some((p) => p.name === name && p.src === pack.src)) {
          catalog.push({ name, src: pack.src, packLabel: pack.label });
        }
      }
    } catch (e) {
      console.warn("extra pack missing", pack.src, e);
    }
  }

  // Return to primary for default display
  await ensureSrc(PRIMARY_SRC);
  poses = catalog;
}

function wireAppearance() {
  const hue = document.getElementById("knob-hue");
  const tint = document.getElementById("knob-tint");
  const spark = document.getElementById("knob-sparkles");
  const toggle = document.getElementById("btn-sparkle-toggle");
  const reset = document.getElementById("btn-reset-look");

  const apply = () => {
    const strength = tintStrength / 100;
    viewer.style.filter =
      strength <= 0.001
        ? "none"
        : `hue-rotate(${hueDeg}deg) saturate(${1 + strength * 1.8})`;
    sparkleLayer.style.opacity = sparklesOn
      ? String((Number(spark.value) / 100) * 0.55)
      : "0";
    sparkleLayer.classList.toggle("off", !sparklesOn);
  };

  hue.addEventListener("input", () => {
    hueDeg = Number(hue.value);
    apply();
  });
  tint.addEventListener("input", () => {
    tintStrength = Number(tint.value);
    apply();
  });
  spark.addEventListener("input", apply);
  toggle.addEventListener("click", () => {
    sparklesOn = !sparklesOn;
    toggle.textContent = sparklesOn ? "SPARKLES ON" : "SPARKLES OFF";
    toggle.classList.toggle("active", sparklesOn);
    apply();
  });
  reset.addEventListener("click", () => {
    hue.value = "0";
    tint.value = "0";
    spark.value = "40";
    hueDeg = 0;
    tintStrength = 0;
    sparklesOn = true;
    toggle.textContent = "SPARKLES ON";
    toggle.classList.add("active");
    apply();
  });
  apply();
}

function onKey(e) {
  const hit = STATES.find((s) => s.key === e.key);
  if (hit) requestState(hit.id);
}

async function main() {
  wireAppearance();
  addEventListener("keydown", onKey);
  document.getElementById("btn-assign").addEventListener("click", assignCurrentToSelectedState);
  document.getElementById("btn-auto").addEventListener("click", () => {
    autoGuessBindings();
  });
  document.getElementById("btn-clear").addEventListener("click", () => {
    bindings.clear();
    persistBindings();
    refreshBindEditors();
    refreshStateButtons();
    setStatus("Bindings cleared — assign poses manually");
  });
  document.getElementById("btn-save").addEventListener("click", () => {
    persistBindings();
    setStatus("Bindings saved to localStorage");
  });

  await customElements.whenDefined("model-viewer");
  setStatus("Enumerating poses…");
  await loadPoseCatalog();

  refreshPoseList();
  const hadSaved = loadPersistedBindings();
  if (!hadSaved) autoGuessBindings();
  else {
    refreshBindEditors();
    refreshStateButtons();
  }

  const startClip =
    bindings.get("walking") ||
    bindings.get("running") ||
    bindings.get("idle") ||
    poses[0]?.name;
  if (startClip) {
    await playClip(startClip, {
      loop: true,
      asState: bindings.get("walking")
        ? "walking"
        : bindings.get("running")
          ? "running"
          : bindings.get("idle")
            ? "idle"
            : null,
    });
  }

  setStatus(
    `Enumerated ${poses.length} pose(s). Meshy names are remapped by eye — IDLE unbound (no true idle).`
  );
  refreshBadge();
}

main().catch((e) => {
  console.error(e);
  setStatus(String(e.message || e), true);
});
