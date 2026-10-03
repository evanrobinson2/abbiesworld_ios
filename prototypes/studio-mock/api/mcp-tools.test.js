/**
 * ChatGPT MCP catalog: delete/feedback tools must be advertised early
 * with OpenAI-strict JSON schemas (arrays have items).
 * Run: node prototypes/studio-mock/api/mcp-tools.test.js
 */
import { publicTools } from "./mcp.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function walk(schema, path) {
  if (!schema || typeof schema !== "object") return;
  if (schema.type === "array") {
    assert(schema.items, `array missing items at ${path}`);
    walk(schema.items, `${path}[]`);
  }
  if (schema.type === "object" && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      walk(value, `${path}.${key}`);
    }
  }
}

const tools = publicTools();
const names = tools.map((tool) => tool.name);
assert(new Set(names).size === names.length, "duplicate tool names");

for (const required of [
  "place_remove",
  "place_delete",
  "scene_delete",
  "feedback_report",
  "bug_report",
  "trouble_ticket_create",
  "trouble_ticket_list",
]) {
  assert(names.includes(required), `missing ${required}`);
}

const idx = (name) => names.indexOf(name);
assert(idx("place_remove") < idx("author_beat"), "place_remove before author_beat");
assert(idx("feedback_report") < idx("author_beat"), "feedback_report before author_beat");
assert(idx("trouble_ticket_create") < idx("asset_job_create"), "tickets before asset jobs");

for (const tool of tools) {
  walk(tool.inputSchema, tool.name);
  assert(/delete|remove|feedback|bug|ticket|issue/i.test(`${tool.name} ${tool.description}`) || !/place_remove|place_delete|scene_delete|feedback_report|bug_report|trouble_ticket/.test(tool.name), `discoverable wording: ${tool.name}`);
}

console.log("mcp-tools.test.js OK", names.length, "tools");
