/**
 * Art Scout Chase — end-to-end playthrough prototype
 * Textual inspection: window.ArtScout.state + #debug-state
 */
(() => {
  const DESTINATIONS = [
    {
      id: "candy_harbor",
      name: "Candy Harbor",
      plateClass: "plate-candy",
      clueId: "red-hat",
      prompt: "Find the red hat.",
      foundPhrase: "Hat for the Look Book!",
    },
    {
      id: "cloud_kitchen",
      name: "Cloud Kitchen",
      plateClass: "plate-cloud",
      clueId: "striped-scarf",
      prompt: "Find the scarf.",
      foundPhrase: "Scarf says whoosh!",
    },
    {
      id: "mossy_library",
      name: "Mossy Library",
      plateClass: "plate-mossy",
      clueId: "fox-friend",
      prompt: "Find the fox.",
      foundPhrase: "Fox friend found!",
    },
  ];

  const CHIP_TO_SOCKET = {
    "red-hat": "hat",
    "striped-scarf": "scarf",
    "fox-friend": "friend",
  };

  const state = {
    beat: "brand",
    destinationIndex: 0,
    visited: [],
    cluesFound: [],
    missesOnCurrent: 0,
    selectedChip: null,
    sockets: { hat: null, scarf: null, friend: null },
    assembled: false,
    tricksterFound: false,
    log: [],
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function logBeat(name, detail = {}) {
    const entry = { t: Date.now(), beat: name, ...detail };
    state.log.push(entry);
    console.log(`art-scout:beat ${name}`, detail);
    renderDebug();
  }

  function renderDebug() {
    const el = $("#debug-state");
    if (!el) return;
    el.textContent = JSON.stringify(
      {
        beat: state.beat,
        destinationIndex: state.destinationIndex,
        place: DESTINATIONS[state.destinationIndex]?.id,
        cluesFound: state.cluesFound,
        missesOnCurrent: state.missesOnCurrent,
        selectedChip: state.selectedChip,
        sockets: state.sockets,
        assembled: state.assembled,
        tricksterFound: state.tricksterFound,
      },
      null,
      2
    );
  }

  function setScene(name) {
    state.beat = name;
    $$(".scene").forEach((s) => s.classList.remove("active"));
    const panel = $(`[data-scene-panel="${name}"]`);
    if (panel) panel.classList.add("active");
    $("#app").dataset.scene = name;
    spawnSparkles(6);
    logBeat(name);
  }

  function spawnSparkles(n = 4) {
    const layer = $(".sparkle-layer");
    if (!layer) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.style.left = `${10 + Math.random() * 80}%`;
      s.style.top = `${40 + Math.random() * 50}%`;
      s.style.animationDelay = `${Math.random() * 0.4}s`;
      layer.appendChild(s);
      setTimeout(() => s.remove(), 2800);
    }
  }

  function availableDestinations() {
    return DESTINATIONS.map((d, i) => ({ ...d, index: i })).filter(
      (d) => !state.cluesFound.includes(d.clueId)
    );
  }

  function syncTravelUI() {
    const dest = DESTINATIONS[state.destinationIndex];
    const plate = $("#travel-plate");
    plate.className = `plate travel-plate ${dest.plateClass}`;
    $("#place-name").textContent = dest.name;
    $$("#sparkle-progress .dot").forEach((dot, i) => {
      dot.classList.toggle("on", i < state.cluesFound.length);
    });
  }

  function openTravel() {
    const open = availableDestinations();
    if (open.length === 0) {
      openAssemble();
      return;
    }
    // Prefer first unfinished destination so a 6yo never stalls.
    state.destinationIndex = open[0].index;
    syncTravelUI();
    setScene("travel");
  }

  function openInvestigate() {
    const dest = DESTINATIONS[state.destinationIndex];
    state.missesOnCurrent = 0;
    const plate = $("#investigate-plate");
    plate.className = `plate investigate-plate ${dest.plateClass}`;
    $("#status-phrase").textContent = dest.prompt;
    $("#satchel-count").textContent = String(state.cluesFound.length);

    $$(".hotspot", plate).forEach((h) => {
      const id = h.dataset.clueId;
      const show = id === dest.clueId && !state.cluesFound.includes(id);
      h.style.display = show ? "block" : "none";
      h.classList.remove("hint", "found");
      h.disabled = !show;
    });
    setScene("investigate");
  }

  function findClue(clueId) {
    if (state.cluesFound.includes(clueId)) return;
    const dest = DESTINATIONS.find((d) => d.clueId === clueId);
    const hotspot = $(`[data-clue-id="${clueId}"]`);
    if (hotspot) hotspot.classList.add("found");
    state.cluesFound.push(clueId);
    if (dest && !state.visited.includes(dest.id)) state.visited.push(dest.id);
    $("#status-phrase").textContent = dest?.foundPhrase || "Found it!";
    $("#satchel-count").textContent = String(state.cluesFound.length);
    spawnSparkles(12);
    logBeat("clue-found", { clueId });

    setTimeout(() => {
      if (state.cluesFound.length >= 3) openAssemble();
      else openTravel();
    }, 1100);
  }

  function openAssemble() {
    state.selectedChip = null;
    state.sockets = { hat: null, scarf: null, friend: null };
    state.assembled = false;
    $$(".socket").forEach((s) => {
      s.classList.remove("filled", "target");
      s.textContent = "";
    });
    $$(".chip").forEach((c) => {
      c.classList.remove("selected", "placed");
      // Only real clues start enabled; decoy always available for silly play.
      if (c.dataset.chipId !== "banana" && !state.cluesFound.includes(c.dataset.chipId)) {
        c.classList.add("placed");
      }
    });
    $("#trickster-reveal").hidden = true;
    $("#silhouette").dataset.assembled = "false";
    $("#find-them-btn").hidden = true;
    setScene("assemble");
  }

  function selectChip(chipId) {
    state.selectedChip = chipId;
    $$(".chip").forEach((c) => c.classList.toggle("selected", c.dataset.chipId === chipId));
    $$(".socket").forEach((s) => s.classList.add("target"));
    renderDebug();
  }

  function placeChip(socket) {
    const chipId = state.selectedChip;
    if (!chipId) return;

    if (chipId === "banana") {
      // Silly decoy — giggles away, never blocks success.
      const chip = $(`[data-chip-id="banana"]`);
      chip?.classList.add("miss-wobble");
      spawnSparkles(8);
      state.selectedChip = null;
      $$(".chip").forEach((c) => c.classList.remove("selected"));
      $$(".socket").forEach((s) => s.classList.remove("target"));
      logBeat("decoy-giggle", { chipId });
      renderDebug();
      return;
    }

    const fits = CHIP_TO_SOCKET[chipId];
    if (fits !== socket) {
      // Gentle redirect: snap to the correct socket instead of punishing.
      socket = fits;
    }
    if (state.sockets[socket]) return;

    state.sockets[socket] = chipId;
    const socketEl = $(`[data-socket="${socket}"]`);
    const chipEl = $(`[data-chip-id="${chipId}"]`);
    if (socketEl) {
      socketEl.classList.add("filled");
      socketEl.textContent = chipEl?.textContent || "★";
    }
    chipEl?.classList.add("placed");
    chipEl?.classList.remove("selected");
    state.selectedChip = null;
    $$(".socket").forEach((s) => s.classList.remove("target"));
    spawnSparkles(6);
    logBeat("socket-filled", { socket, chipId });

    const filled = Object.values(state.sockets).every(Boolean);
    if (filled) {
      state.assembled = true;
      $("#silhouette").dataset.assembled = "true";
      $("#trickster-reveal").hidden = false;
      $("#find-them-btn").hidden = false;
      logBeat("assembled");
    }
    renderDebug();
  }

  function openPanorama() {
    setScene("panorama");
    const scroller = $("#panorama-scroller");
    if (scroller) scroller.scrollLeft = 80;
  }

  function celebrate() {
    state.tricksterFound = true;
    spawnSparkles(20);
    setScene("celebrate");
  }

  function resetGame() {
    state.destinationIndex = 0;
    state.visited = [];
    state.cluesFound = [];
    state.missesOnCurrent = 0;
    state.selectedChip = null;
    state.sockets = { hat: null, scarf: null, friend: null };
    state.assembled = false;
    state.tricksterFound = false;
    state.log = [];
    setScene("brand");
  }

  function onMissInvestigate(event) {
    if (state.beat !== "investigate") return;
    if (event.target.closest(".hotspot, .satchel, .cta")) return;
    state.missesOnCurrent += 1;
    const plate = $("#investigate-plate");
    plate.classList.remove("miss-wobble");
    void plate.offsetWidth;
    plate.classList.add("miss-wobble");
    spawnSparkles(3);
    if (state.missesOnCurrent >= 2) {
      const dest = DESTINATIONS[state.destinationIndex];
      const hotspot = $(`[data-clue-id="${dest.clueId}"]`);
      hotspot?.classList.add("hint");
    }
    renderDebug();
  }

  function handleAction(action, target) {
    switch (action) {
      case "start":
        if (state.beat !== "brand") return;
        setScene("briefing");
        break;
      case "follow":
        if (state.beat !== "briefing") return;
        openTravel();
        break;
      case "prev-destination": {
        if (state.beat !== "travel") return;
        const open = availableDestinations();
        if (!open.length) return;
        const pos = open.findIndex((d) => d.index === state.destinationIndex);
        const next = open[(pos - 1 + open.length) % open.length];
        state.destinationIndex = next.index;
        syncTravelUI();
        logBeat("travel-swipe", { dir: "prev", place: next.id });
        break;
      }
      case "next-destination": {
        if (state.beat !== "travel") return;
        const open = availableDestinations();
        if (!open.length) return;
        const pos = open.findIndex((d) => d.index === state.destinationIndex);
        const next = open[(pos + 1) % open.length];
        state.destinationIndex = next.index;
        syncTravelUI();
        logBeat("travel-swipe", { dir: "next", place: next.id });
        break;
      }
      case "go-destination":
        if (state.beat !== "travel") return;
        openInvestigate();
        break;
      case "find-them":
        if (state.beat !== "assemble" || !state.assembled) return;
        openPanorama();
        break;
      case "again":
        if (state.beat !== "celebrate" && state.beat !== "done") return;
        resetGame();
        break;
      case "done":
        if (state.beat !== "celebrate") return;
        setScene("done");
        break;
      case "peek-lookbook":
        if (state.beat !== "investigate") return;
        logBeat("peek-lookbook", { clues: [...state.cluesFound] });
        break;
      default:
        break;
    }
  }

  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      handleAction(actionEl.dataset.action, actionEl);
      return;
    }

    const clueEl = e.target.closest("[data-clue-id]");
    if (clueEl && state.beat === "investigate") {
      findClue(clueEl.dataset.clueId);
      return;
    }
    if (clueEl && state.beat === "panorama" && clueEl.dataset.clueId === "trickster") {
      clueEl.classList.add("found");
      celebrate();
      return;
    }

    const chipEl = e.target.closest("[data-chip-id]");
    if (chipEl && state.beat === "assemble" && !chipEl.classList.contains("placed")) {
      selectChip(chipEl.dataset.chipId);
      return;
    }

    const socketEl = e.target.closest("[data-socket]");
    if (socketEl && state.beat === "assemble") {
      placeChip(socketEl.dataset.socket);
      return;
    }

    if (state.beat === "investigate") onMissInvestigate(e);
  });

  // Touch-friendly swipe on travel plate
  let touchX = null;
  document.addEventListener(
    "touchstart",
    (e) => {
      if (state.beat !== "travel") return;
      touchX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchend",
    (e) => {
      if (state.beat !== "travel" || touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      handleAction(dx < 0 ? "next-destination" : "prev-destination");
    },
    { passive: true }
  );

  // Keyboard assist for agent playthroughs
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && state.beat === "brand") handleAction("start");
  });

  if (new URLSearchParams(location.search).has("debug")) {
    document.body.classList.add("show-debug");
  }

  window.ArtScout = {
    state,
    destinations: DESTINATIONS,
    /** Agent helper: run a full happy-path playthrough */
    async autoPlay(stepMs = 350) {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const click = (sel) => {
        const el = $(sel);
        if (!el) throw new Error(`Missing ${sel}`);
        el.click();
      };
      resetGame();
      await sleep(stepMs);
      click('[data-action="start"]');
      await sleep(stepMs);
      click('[data-action="follow"]');
      await sleep(stepMs);
      for (const dest of DESTINATIONS) {
        // Wait until travel (or assemble after the last clue).
        const deadline = Date.now() + 5000;
        while (state.beat !== "travel" && state.beat !== "assemble" && Date.now() < deadline) {
          await sleep(50);
        }
        if (state.beat === "assemble") break;
        while (DESTINATIONS[state.destinationIndex].id !== dest.id) {
          click('[data-action="next-destination"]');
          await sleep(stepMs / 2);
        }
        click('[data-action="go-destination"]');
        await sleep(stepMs);
        click(`[data-clue-id="${dest.clueId}"]`);
        // findClue auto-advances after ~1100ms
        const afterClue = Date.now() + 5000;
        while (
          state.cluesFound.length < DESTINATIONS.indexOf(dest) + 1 &&
          Date.now() < afterClue
        ) {
          await sleep(50);
        }
        await sleep(1200);
      }
      {
        const deadline = Date.now() + 5000;
        while (state.beat !== "assemble" && Date.now() < deadline) await sleep(50);
      }
      click('[data-chip-id="red-hat"]');
      await sleep(stepMs);
      click('[data-socket="hat"]');
      await sleep(stepMs);
      click('[data-chip-id="striped-scarf"]');
      await sleep(stepMs);
      click('[data-socket="scarf"]');
      await sleep(stepMs);
      click('[data-chip-id="fox-friend"]');
      await sleep(stepMs);
      click('[data-socket="friend"]');
      await sleep(stepMs);
      if (!state.assembled) throw new Error("assemble failed");
      click('[data-action="find-them"]');
      await sleep(stepMs);
      click('[data-clue-id="trickster"]');
      await sleep(stepMs);
      return {
        beat: state.beat,
        cluesFound: [...state.cluesFound],
        assembled: state.assembled,
        tricksterFound: state.tricksterFound,
        sockets: { ...state.sockets },
      };
    },
  };

  setScene("brand");
  renderDebug();
})();
