#!/usr/bin/env node
/**
 * Compiles production markdown + filesystem into a versioned, richly tagged catalog.
 * Output: viewer/public/data/manifest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(__dirname, "../public/data/manifest.json");

const STYLE_SUFFIX =
  "Layered cut-paper illustration, late-antique 376 CE, stacked paper planes soft drop shadows, handmade paper fibre, scissor-cut edges torn deckle for damage, light as flat translucent wedges, palette deep indigo bone iron grey tarnished gold gold only for light heat fire sun, 16:9 horizontal with crop headroom, no text no watermark no invented heraldry no medieval plate no mail hauberks, named principals stylized visible cut-paper faces, crowds faceless silhouettes, same dignity Gothic and Roman, not Batman not black void silhouettes, off-center composition.";

const PALETTE_R1 =
  "deep indigo · bone · iron grey · tarnished gold (light/heat only)";
const MEDIUM_R1 = "layered cut-paper (R1)";
const MEDIUM_R3 = "charcoal / graphite on toned paper (R3)";

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function pngMeta(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const buf = fs.readFileSync(absPath);
  const stat = fs.statSync(absPath);
  let width;
  let height;
  if (buf.toString("ascii", 1, 4) === "PNG" && buf.length >= 24) {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  }
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
  const aspect =
    width && height
      ? `${(width / height).toFixed(3)}:1 (~${Math.round((width / height) * 9)}:${9})`
      : undefined;
  return {
    width,
    height,
    aspectRatio: aspect,
    fileSizeBytes: stat.size,
    contentHash: hash,
    mtime: stat.mtime.toISOString(),
  };
}

function parseShotList(md) {
  const shots = [];
  let section = "";
  let sectionTitle = "";
  let sectionNarrative = "";

  for (const line of md.split("\n")) {
    const sec = line.match(/^## ([A-F])\.\s+(.+)$/);
    if (sec) {
      section = sec[1];
      sectionTitle = sec[2].trim();
      continue;
    }
    if (line.startsWith("**") && section && !line.startsWith("|")) {
      sectionNarrative = line.replace(/\*\*/g, "").trim();
    }
    const row = line.match(
      /^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/
    );
    if (!row) continue;

    const filename = row[2].trim();
    const moodRaw = row[3].trim();
    const description = row[4].trim().replace(/\*\*/g, "");
    const moodMatch = moodRaw.match(/^(\d+)\s+(.+)$/);
    const register = filename.includes("-R3") ? "R3" : "R1";

    shots.push({
      shotNumber: Number(row[1]),
      id: filename.replace(/\.png$/, ""),
      filename,
      section,
      sectionTitle,
      sectionNarrative,
      mood: moodMatch
        ? { number: Number(moodMatch[1]), name: moodMatch[2].trim() }
        : { number: 0, name: moodRaw },
      register,
      description,
      category: filename.startsWith("VAL-") ? "character" : "scene",
    });
  }
  return shots;
}

function parseReview(md) {
  const review = {};
  let mode = null;

  for (const line of md.split("\n")) {
    if (line.startsWith("## PASS")) mode = "pass";
    else if (line.startsWith("## REJECT")) mode = "reject";
    else if (line.startsWith("## v2 iteration")) mode = null;
    else if (line.includes("Still flag for your eye")) mode = "flags";

    if (mode === "pass" || mode === "reject") {
      const row = line.match(/^\|\s*`?([^`|]+)`?\s*\|\s*([^|]*)\|/);
      if (!row || row[1] === "File" || row[1].includes("---")) continue;
      if (mode === "pass") {
        review[row[1].trim()] = {
          status: "pass",
          notes: row[2].trim() || undefined,
        };
      } else {
        const fixRow = line.match(
          /^\|\s*`?([^`|]+)`?\s*\|\s*([^|]+)\|\s*([^|]+)\|/
        );
        if (fixRow) {
          review[fixRow[1].trim()] = {
            status: "reject",
            rejectReason: fixRow[2].trim(),
            v2Fix: fixRow[3].trim(),
          };
        }
      }
    }

    if (mode === "flags") {
      const flag = line.match(/^-\s*`([^`]+)`\s*—\s*(.+)$/);
      if (flag) {
        review[flag[1]] = {
          ...(review[flag[1]] || { status: "pass" }),
          flagged: true,
          notes: flag[2].trim(),
        };
      }
    }
  }
  return review;
}

function parsePrompts(sh) {
  const prompts = {};
  const lines = sh.split("\n");
  let pendingOut = null;

  for (let i = 0; i < lines.length; i++) {
    const gen = lines[i].match(
      /generate\s+"\$ROOT\/assets\/(characters|scenes)\/([^"]+)"\s*\\?$/
    );
    if (gen) {
      pendingOut = gen[2];
      continue;
    }
    if (pendingOut) {
      const desc = lines[i].match(/^\s*"([^"]+)"/);
      if (desc) {
        prompts[pendingOut] = `${desc[1]}. ${STYLE_SUFFIX}`;
        pendingOut = null;
      }
    }
    const r3 = lines[i].match(
      /--output "\$ROOT\/assets\/scenes\/([^"]+)"\s*\\?$/
    );
    if (r3 && lines[i + 1]?.includes("--prompt")) {
      const pm = lines[i + 1].match(/--prompt "([^"]+)"/);
      if (pm) prompts[r3[1]] = pm[1];
    }
  }
  return prompts;
}

/** Contextual enrichment keyed by id or section. */
function contextFor(shot) {
  const id = shot.id;
  const section = shot.section;

  const base = {
    era: "Late Antiquity",
    materialCulture:
      "Late 4th century CE: scale/mail only (no lorica segmentata); no invented heraldry; gold = light/heat only",
  };

  // Turnarounds / character sheets
  if (id === "FRI-001-turnaround") {
    return {
      ...base,
      yearApprox: "376 CE (identity lock)",
      location: "n/a — character sheet",
      setting: "four-view turnaround on bone ground",
      characters: ["FRI-001 Fritigern"],
      factions: ["Gothic"],
      narrativeRole: "identity reference — face visible all views",
      emotionalDirection: "watchful calm default",
      scale: "character sheet",
      framing: "four orthographic / ¾ views",
      light: "neutral sheet lighting",
      continuityNotes: "Tallest Gothic principal; cleaner jaw vs Alavivus",
    };
  }
  if (id === "ALA-001-turnaround") {
    return {
      ...base,
      yearApprox: "376 CE (identity lock)",
      location: "n/a — character sheet",
      setting: "four-view turnaround on bone ground",
      characters: ["ALA-001 Alavivus"],
      factions: ["Gothic"],
      narrativeRole: "identity reference — NOT Alaric",
      emotionalDirection: "reserved, slightly withdrawn",
      scale: "character sheet",
      framing: "four views",
      continuityNotes: "Shorter/leaner; fuller beard; one-shoulder cloak pin",
    };
  }
  if (id === "LUP-001-turnaround") {
    return {
      ...base,
      yearApprox: "376 CE (identity lock)",
      location: "n/a — character sheet",
      setting: "four-view turnaround on bone ground",
      characters: ["LUP-001 Lupicinus"],
      factions: ["Roman"],
      narrativeRole: "Roman host identity lock — Principle 5 anti-caricature",
      emotionalDirection: "convivial competence",
      scale: "character sheet",
      framing: "four views",
      continuityNotes: "Same height as Gothic leaders; calcei; no gold trim",
    };
  }
  if (id === "VAL-001-turnaround") {
    return {
      ...base,
      yearApprox: "376–378 CE (identity lock)",
      location: "n/a — character sheet",
      setting: "four-view turnaround, COURT costume",
      characters: ["VAL-001 Valens"],
      factions: ["Roman"],
      narrativeRole: "imperial antagonist identity — Hubris→Terror→Ruin arc",
      emotionalDirection: "impatient calculating default",
      scale: "character sheet",
      framing: "four views",
      continuityNotes: "Purple as deeper indigo plane; ordinary build",
    };
  }
  if (id === "BANQUET-PAIR-001") {
    return {
      ...base,
      yearApprox: "376 CE",
      location: "Marcianople (proximity)",
      setting: "paired Gothic principals reference",
      characters: ["FRI-001 Fritigern", "ALA-001 Alavivus"],
      factions: ["Gothic"],
      narrativeRole: "relative scale / costume contrast lock",
      scale: "character pair",
      framing: "side-by-side comparison",
    };
  }

  // Section-level defaults
  const bySection = {
    A: {
      yearApprox: "376–378 CE",
      location: "Eastern imperial sphere / Adrianople campaign",
      characters: ["VAL-001 Valens"],
      factions: ["Roman"],
      narrativeRole: "Boss arc — Valens as institutional power",
    },
    B: {
      yearApprox: "376 CE",
      location: "Danube frontier — Roman processing corrals",
      factions: ["Gothic", "Roman"],
      narrativeRole: "Humiliation — institutional cruelty, not caricature",
      emotionalDirection: "degradation through procedure",
      weather: "harsh overhead / washed bone light",
      materialCulture:
        base.materialCulture + "; Roman poles/lanes; wax tablets without visible text",
    },
    C: {
      yearApprox: "c. 375–376 CE",
      location: "Gothic flight toward Danube / petition space",
      factions: ["Gothic", "Roman"],
      narrativeRole: "Flight, petition, endurance, tenderness",
      characters: ["FRI-001 Fritigern", "ALA-001 Alavivus"],
    },
    D: {
      yearApprox: "376 CE",
      location: "Marcianople — banquet hall / courtyard / gate",
      factions: ["Gothic", "Roman"],
      characters: ["FRI-001 Fritigern", "ALA-001 Alavivus", "LUP-001 Lupicinus"],
      narrativeRole: "Banquet betrayal arc",
      withheld:
        id.includes("BETRAYAL-03")
          ? "Interior violence remains unknowable (R3 register)"
          : "Murder occurs off-frame or at edge of knowledge",
    },
    E: {
      yearApprox: "376–377 CE",
      location: "Gothic wagon laager (circle defense)",
      factions: ["Gothic", "Roman"],
      narrativeRole: "Real battle composition — not symbolic",
      emotionalDirection: "Fury / defense",
      scale: "battle — aerial to intimate",
    },
    F: {
      yearApprox: "9 Aug 378 CE",
      location: "Adrianople battlefield",
      factions: ["Gothic", "Roman"],
      characters: id.includes("ADV-02") || id.includes("ADV-06")
        ? id.includes("ADV-06")
          ? ["FRI-001 Fritigern"]
          : ["VAL-001 Valens"]
        : undefined,
      narrativeRole: "Terror → Ruin; cavalry charge included by request",
      weather: "brutal noon heat / dust",
      light: "harsh sun; gold as heat dust wedges only",
    },
  };

  const sec = bySection[section] || {};

  // Per-id overrides
  const perId = {};
  if (id.includes("HUMILIATION-04")) {
    perId.emotionalDirection = "family separation — principals only have faces";
    perId.scale = "intimate within wide cruelty";
  }
  if (id.includes("TENDERNESS")) {
    perId.setting = "wagon shelter interior";
    perId.light = "soft wedge";
    perId.emotionalDirection = "care under pressure";
  }
  if (id.includes("LEVITY")) {
    perId.setting = "banquet table — genuine warmth before turn";
    perId.emotionalDirection = "convivial trust";
  }
  if (id.includes("BETRAYAL-02")) {
    perId.emotionalDirection = "Lupicinus — betrayal dawning, cup lowered";
    perId.characters = ["LUP-001 Lupicinus"];
  }
  if (id.includes("BETRAYAL-04")) {
    perId.emotionalDirection = "Alavivus last appearance — half indigo shadow";
    perId.characters = ["ALA-001 Alavivus"];
  }
  if (id.includes("ADV-04")) {
    perId.emotionalDirection = "Gothic heavy cavalry rescue charge";
    perId.scale = "enormous charge";
    perId.framing = "bursting from dust, spears level";
  }
  if (id.includes("PAIR-HUBRIS")) {
    perId.setting = "split composition — petition vs dismissal";
    perId.characters = ["FRI-001 Fritigern", "VAL-001 Valens"];
    perId.emotionalDirection = "moral contrast, same paper dignity";
  }

  return {
    ...base,
    ...sec,
    ...perId,
    location: perId.location || sec.location,
    setting: perId.setting || shot.description,
  };
}

function physicalFor(absPath, register) {
  const meta = pngMeta(absPath) || {};
  return {
    format: "png",
    width: meta.width,
    height: meta.height,
    aspectRatio: meta.aspectRatio,
    fileSizeBytes: meta.fileSizeBytes,
    contentHash: meta.contentHash,
    mtime: meta.mtime,
    medium: register === "R3" ? MEDIUM_R3 : MEDIUM_R1,
    palette: register === "R3" ? "charcoal / graphite greys" : PALETTE_R1,
    orientation: "landscape",
  };
}

function versionsFor(filename, diskPath, review, absCurrent) {
  const rejected = path.join(ROOT, "assets/rejected/v1", filename);
  const hasArchive = fs.existsSync(rejected);
  const flagged = Boolean(review?.flagged);
  const wasReject = review?.status === "reject" || hasArchive;

  const currentLabel = wasReject ? "v2" : "v1";
  const versions = [
    {
      label: currentLabel,
      status: flagged ? "flagged" : "current",
      path: diskPath,
      notes: flagged
        ? review?.notes || "Flagged for human eye / possible v3"
        : review?.notes || "Current production version",
      createdAt: pngMeta(absCurrent)?.mtime,
    },
  ];

  if (hasArchive) {
    versions.push({
      label: "v1",
      status: "rejected",
      path: `assets/rejected/v1/${filename}`,
      rejectReason: review?.rejectReason,
      notes: review?.v2Fix ? `v2 fix: ${review.v2Fix}` : "Archived after artistic review",
      createdAt: pngMeta(rejected)?.mtime,
    });
  }

  return { version: currentLabel, versions };
}

function buildTurnaroundExtras(prompts) {
  const extras = [
    {
      shotNumber: 0,
      id: "FRI-001-turnaround",
      filename: "FRI-001-turnaround.png",
      section: "T",
      sectionTitle: "Turnarounds — identity locks",
      sectionNarrative: "Character sheets — face visible all views",
      mood: { number: 0, name: "neutral" },
      register: "R1",
      description:
        "Fritigern four-view turnaround — tallest Gothic principal, cleaner jaw, fur-trim cloak",
      category: "turnaround",
      storyPart: "T. Turnarounds — identity locks",
      storyBeat:
        "Fritigern identity lock: four views, face visible, travelling cloak, sword at hip",
      tags: ["turnaround", "FRI-001", "Gothic"],
      prompt:
        prompts["FRI-001-turnaround.png"] ||
        "Fritigern Gothic nobleman four-view turnaround cut-paper faces all views. " +
          STYLE_SUFFIX,
    },
    {
      shotNumber: 0,
      id: "ALA-001-turnaround",
      filename: "ALA-001-turnaround.png",
      section: "T",
      sectionTitle: "Turnarounds — identity locks",
      sectionNarrative: "Character sheets — face visible all views",
      mood: { number: 0, name: "neutral" },
      register: "R1",
      description:
        "Alavivus four-view turnaround — leaner, fuller beard, one-shoulder cloak (not Alaric)",
      category: "turnaround",
      storyPart: "T. Turnarounds — identity locks",
      storyBeat:
        "Alavivus identity lock: mid-30s, medium beard, asymmetric cloak pin — not Alaric",
      tags: ["turnaround", "ALA-001", "Gothic"],
      prompt:
        "Alavivus Gothic co-leader four-view turnaround cut-paper faces. " + STYLE_SUFFIX,
    },
    {
      shotNumber: 0,
      id: "LUP-001-turnaround",
      filename: "LUP-001-turnaround.png",
      section: "T",
      sectionTitle: "Turnarounds — identity locks",
      sectionNarrative: "Character sheets — face visible all views",
      mood: { number: 0, name: "neutral" },
      register: "R1",
      description:
        "Lupicinus four-view turnaround — Roman host, convivial, calcei, no gold trim",
      category: "turnaround",
      storyPart: "T. Turnarounds — identity locks",
      storyBeat:
        "Lupicinus identity lock: Roman commander, Principle 5 dignity, columnar tunic",
      tags: ["turnaround", "LUP-001", "Roman"],
      prompt:
        "Lupicinus Roman commander four-view turnaround cut-paper faces. " + STYLE_SUFFIX,
    },
    {
      shotNumber: 0,
      id: "BANQUET-PAIR-001",
      filename: "BANQUET-PAIR-001.png",
      section: "T",
      sectionTitle: "Turnarounds — identity locks",
      sectionNarrative: "Relative scale lock for banquet principals",
      mood: { number: 8, name: "Levity" },
      register: "R1",
      description: "Fritigern + Alavivus paired reference for relative scale and costume",
      category: "character",
      storyPart: "T. Turnarounds — identity locks",
      storyBeat: "Gothic banquet pair — height and cloak contrast lock",
      tags: ["pair", "FRI-001", "ALA-001", "Gothic"],
      prompt:
        "Fritigern and Alavivus paired cut-paper reference same dignity. " + STYLE_SUFFIX,
    },
  ];
  return extras;
}

function enrich(shot, reviewMap, prompts) {
  const filename = shot.filename;
  const isChar =
    shot.category === "character" ||
    shot.category === "turnaround" ||
    filename.startsWith("VAL-") ||
    filename.startsWith("FRI-") ||
    filename.startsWith("ALA-") ||
    filename.startsWith("LUP-") ||
    filename.startsWith("BANQUET-");

  const diskPath = isChar
    ? `assets/characters/${filename}`
    : `assets/scenes/${filename}`;
  const abs = path.join(ROOT, diskPath);
  const review = reviewMap[filename] || { status: "unreviewed" };
  const { version, versions } = versionsFor(filename, diskPath, review, abs);
  const imagePath = `/${diskPath}`;

  const rejectedExists = fs.existsSync(
    path.join(ROOT, "assets/rejected/v1", filename)
  );

  return {
    ...shot,
    storyPart: shot.storyPart || `${shot.section}. ${shot.sectionTitle}`,
    storyBeat: shot.storyBeat || shot.description,
    prompt: shot.prompt || prompts[filename] || `${shot.description}. ${STYLE_SUFFIX}`,
    url: imagePath,
    imagePath,
    version,
    versions,
    physical: physicalFor(abs, shot.register),
    context: contextFor(shot),
    review,
    archivedPath: rejectedExists
      ? `/assets/rejected/v1/${filename}`
      : undefined,
    tags: shot.tags || [
      shot.section,
      typeof shot.mood === "object" ? shot.mood.name : shot.mood,
      shot.register,
      shot.category,
    ].filter(Boolean),
    exists: fs.existsSync(abs),
  };
}

function main() {
  const shotList = read("assets/production/SHOT-LIST-50.md");
  const reviewMd = read("assets/production/REVIEW-v1.md");
  const batchSh = read("scripts/batch_generate.sh");

  const review = parseReview(reviewMd);
  const prompts = parsePrompts(batchSh);
  const shots = parseShotList(shotList);
  const extras = buildTurnaroundExtras(prompts);

  // Turnarounds / refs first, then production shots 1–50
  const ordered = [...extras, ...shots];
  let refIndex = 1;
  const items = ordered.map((s, i) => {
    const enriched = enrich(s, review, prompts);
    if (enriched.section === "T") {
      enriched.shotNumber = refIndex++;
      enriched.tags = [...new Set([...(enriched.tags || []), "reference"])];
    }
    enriched.catalogOrder = i + 1;
    return enriched;
  });

  const manifest = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    title: "Gothic Invasion — Frame Review",
    styleSuffix: STYLE_SUFFIX,
    totalShots: items.length,
    source: "local",
    items,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
  console.log(
    `Wrote ${items.length} items (${extras.length} refs + ${shots.length} shots) → ${OUT}`
  );
  const versioned = items.filter((i) => (i.versions || []).length > 1).length;
  const flagged = items.filter((i) => i.review?.flagged).length;
  console.log(`Versioned (v1 archive present): ${versioned}; flagged for eye: ${flagged}`);
}

main();
