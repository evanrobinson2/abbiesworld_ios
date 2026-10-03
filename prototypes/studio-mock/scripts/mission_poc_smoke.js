/**
 * Local MCP smoke for Mission POC — no Vercel deploy required.
 * Uses Auth0 bearer from env (ABBIES_WORLD_TOKEN) against household world.
 *
 * Run from repo root:
 *   node prototypes/studio-mock/scripts/mission_poc_smoke.js
 *
 * Optional: MISSION_POC_LOCAL=1 spins an ephemeral import of mcp handlers
 * and POSTs tools/call through them (same code path as /api/mcp).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadToken() {
  const env = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (env) return env;
  const local = join(root, ".env.local");
  if (existsSync(local)) {
    for (const line of readFileSync(local, "utf8").split("\n")) {
      const m = line.match(/^ABBIES_WORLD_TOKEN=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  // Cursor mcp.json sometimes holds the token
  const mcpPath = join(process.env.HOME || "", ".cursor", "mcp.json");
  if (existsSync(mcpPath)) {
    try {
      const cfg = JSON.parse(readFileSync(mcpPath, "utf8"));
      const headers = cfg?.mcpServers?.["abbies-world"]?.headers || {};
      const auth = headers.Authorization || headers.authorization || "";
      if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
    } catch {
      /* ignore */
    }
  }
  return "";
}

async function callToolLocal(name, args, token) {
  const { POST } = await import("../api/mcp.js");
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name, arguments: { ...args, accessToken: token } },
  };
  const request = new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Abbies-Auth": "bearer",
    },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  const json = await response.json();
  const text = json?.result?.content?.[0]?.text;
  if (!text) return { raw: json, status: response.status };
  try {
    return JSON.parse(text);
  } catch {
    return { text, status: response.status };
  }
}

async function main() {
  const token = loadToken();
  if (!token || token.includes("${")) {
    console.error("ABBIES_WORLD_TOKEN missing — set env or Studio Copy MCP token");
    process.exit(1);
  }

  const missionId = `mission.poc.wakeLoop.${Date.now().toString(36)}.v1`;
  console.log("1) mission_create", missionId);
  const created = await callToolLocal(
    "mission_create",
    {
      missionId,
      title: "Wake Loop POC",
      surface: "cursor",
      narrative:
        "Prove Mission intent survives the interface: create here, describe after a fresh read, attach a fake rocket proof, approve candidate 2, see notifications.",
    },
    token
  );
  if (created.error) {
    console.error("create failed", created);
    process.exit(1);
  }
  console.log("   created", created.mission?.id, "rev", created.revision);

  console.log("2) mission_describe (fresh read — simulates kill chat)");
  const described = await callToolLocal("mission_describe", { missionId }, token);
  if (described.error || !described.text?.includes("Wake Loop POC")) {
    console.error("describe failed", described);
    process.exit(1);
  }
  console.log("   nextAct:", described.nextAct);
  console.log("   unreadNotifications:", described.unreadNotifications);

  const reqArt =
    created.mission?.requirements?.find((r) => r.kind === "art")?.id ||
    "req.art.rocket.exterior";

  // Generic narrative may not have art req — attach only if moon-like, else skip approve path with note
  const hasArt = (created.mission?.requirements || []).some((r) => r.id === reqArt);
  if (!hasArt) {
    // Re-create moon flavored for proof path
    console.log("3) recreate moon-flavored for proof POC");
    const moonId = `mission.poc.moonProof.${Date.now().toString(36)}.v1`;
    const moon = await callToolLocal(
      "mission_create",
      {
        missionId: moonId,
        title: "POC Moon Proof",
        surface: "cursor",
        narrative: "Abby rocket moon Daddy lander garden — proof approve path only.",
      },
      token
    );
    if (moon.error) {
      console.error(moon);
      process.exit(1);
    }
    const artReq = "req.art.rocket.exterior";
    console.log("4) mission_attach_proof", artReq);
    const attached = await callToolLocal(
      "mission_attach_proof",
      { missionId: moonId, requirementId: artReq },
      token
    );
    if (attached.error) {
      console.error(attached);
      process.exit(1);
    }
    const proofId = attached.proof?.id;
    console.log("5) mission_approve_proof candidate 2", proofId);
    const approved = await callToolLocal(
      "mission_approve_proof",
      { missionId: moonId, proofId, candidateIndex: 2, note: "Rocket 2", surface: "cursor" },
      token
    );
    if (approved.error) {
      console.error(approved);
      process.exit(1);
    }
    console.log("   approval", approved.approval?.candidateIndex, approved.notification?.text);

    console.log("6) mission_describe after approve");
    const after = await callToolLocal("mission_describe", { missionId: moonId }, token);
    console.log(after.text?.slice(0, 1200));
    console.log("\nPOC OK", { wakeMissionId: missionId, moonMissionId: moonId });
    return;
  }

  console.log("POC OK (describe path)", missionId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
