// Game Oracle tools for this MCP: ChatGPT (and dispatch) can ask the Oracle at abbies-game-oracle.vercel.app
// for a game design plan, search its knowledge or read Evan's Steam library. The Oracle's model only runs
// with ORACLE_KEY; without it the Oracle still answers from its studies.
const ORACLE_URL = process.env.ORACLE_URL || "https://abbies-game-oracle.vercel.app";
const STYLES = ["clean", "cinema", "storybook", "hud", "telltale"];

export const ORACLE_TOOL_NAMES = new Set(["oracle_consult", "oracle_search", "oracle_steam"]);

export const ORACLE_TOOLS = [
  {
    name: "oracle_consult",
    description:
      "Ask the Game Oracle to turn a plain-language game, scene or story idea into a design plan: verbs, rules, goal, story beats, choices, a presentation style (clean, cinema, storybook, hud, telltale) and requests for the model, sound, voice and music factories, grounded in its studies of Evan's favourite games. Use it before build() when Evan describes a game or scene, and pass the plan to build. Takes about 10 to 30 seconds.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", maxLength: 1200, description: "The idea in Evan's words" },
        audience: { type: "string", enum: ["kid", "family", "maker"], description: "kid = Abbie playing; maker = a plan for building it" },
        style: { type: "string", enum: STYLES, description: "Optional presentation style" },
      },
      required: ["idea"],
      additionalProperties: false,
    },
  },
  {
    name: "oracle_search",
    description:
      "Search the Game Oracle's knowledge: game identity records (what makes a game that game), Steam study profiles, anatomy studies of game systems, design lessons, the game art catalog and presentation styles.",
    inputSchema: {
      type: "object",
      properties: { q: { type: "string", maxLength: 240 }, limit: { type: "integer", minimum: 1, maximum: 50 } },
      required: ["q"],
      additionalProperties: false,
    },
  },
  {
    name: "oracle_steam",
    description: "Evan's Steam library from the Game Oracle: installed games, the owned snapshot, art styles and which games have identity records.",
    inputSchema: {
      type: "object",
      properties: { q: { type: "string", maxLength: 240 }, installed: { type: "boolean" } },
      additionalProperties: false,
    },
  },
];

export async function callOracleTool(name, args = {}, { fetcher = fetch, env = process.env } = {}) {
  const base = env.ORACLE_URL || ORACLE_URL;
  try {
    if (name === "oracle_consult") {
      const headers = { "content-type": "application/json" };
      if (env.ORACLE_KEY) headers["x-oracle-key"] = env.ORACLE_KEY;
      const r = await fetcher(`${base}/api/consult`, {
        method: "POST",
        headers,
        body: JSON.stringify({ idea: args.idea, audience: args.audience || "family", style: args.style }),
      });
      const body = await r.json();
      return r.ok ? body : { error: body.error || `oracle_${r.status}` };
    }
    if (name === "oracle_search") {
      const p = new URLSearchParams({ q: String(args.q || ""), limit: String(args.limit || 12) });
      const r = await fetcher(`${base}/api/knowledge?${p}`);
      return r.ok ? r.json() : { error: `oracle_${r.status}` };
    }
    if (name === "oracle_steam") {
      const p = new URLSearchParams();
      if (args.q) p.set("q", String(args.q));
      if (typeof args.installed === "boolean") p.set("installed", String(args.installed));
      const r = await fetcher(`${base}/api/steam?${p}`);
      return r.ok ? r.json() : { error: `oracle_${r.status}` };
    }
  } catch (err) {
    return { error: "oracle_unreachable", detail: String(err?.message || err).slice(0, 160) };
  }
  return { error: "unknown_oracle_tool" };
}
