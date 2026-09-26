#!/usr/bin/env bash
# Smoke Abbie's World Asset Gen MCP (Streamable HTTP JSON-RPC).
#
# Usage:
#   ./scripts/smoke_asset_mcp.sh
#   MCP_URL=http://127.0.0.1:3000/api/mcp ./scripts/smoke_asset_mcp.sh
#   ACCESS_TOKEN="$(pbpaste)" ./scripts/smoke_asset_mcp.sh
#
# Defaults to production Studio MCP. Asset tools need deployed build ≥ 0.3.0.
# ACCESS_TOKEN: real Auth0 token, or any ≥16-char stub for local in-memory jobs.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCP_URL="${MCP_URL:-https://studio-mock-iota.vercel.app/api/mcp}"
TOKEN="${ACCESS_TOKEN:-${ABBIES_WORLD_TOKEN:-smoke-local-token-xx}}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== unit store =="
node "$ROOT/prototypes/studio-mock/api/lib/asset-jobs-store.test.js"
node "$ROOT/prototypes/studio-mock/api/lib/steel-rail.test.js"

echo ""
echo "== GET $MCP_URL =="
curl -sS "$MCP_URL" | tee "$TMP/meta.json" | head -c 1200
echo ""

VERSION="$(node -e 'const j=require(process.argv[1]); console.log(j.version||"")' "$TMP/meta.json" 2>/dev/null || true)"

echo ""
echo "== tools/list =="
curl -sS -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | tee "$TMP/list.json" \
  | node -e '
const fs=require("fs");
const j=JSON.parse(fs.readFileSync(0,"utf8"));
const names=(j.result?.tools||[]).map(t=>t.name);
console.log("count:", names.length);
console.log(names.join("\n"));
const need=["asset_project_create","asset_library_describe","asset_job_create","asset_job_list","asset_job_status","asset_job_complete","asset_bind"];
const missing=need.filter(n=>!names.includes(n));
if(missing.length){
  console.error("MISSING asset tools:", missing.join(", "));
  console.error("Deploy prototypes/studio-mock (expect server version >= 0.3.0).");
  console.error("Local path: cd prototypes/studio-mock && vercel dev --listen 3000");
  console.error("Then: MCP_URL=http://127.0.0.1:3000/api/mcp ./scripts/smoke_asset_mcp.sh");
  process.exit(2);
}
console.log("asset tools: OK");
'

rpc_call() {
  local id="$1"
  local name="$2"
  local args_json="$3"
  node -e '
const id=Number(process.argv[1]);
const name=process.argv[2];
const args=JSON.parse(process.argv[3]);
process.stdout.write(JSON.stringify({
  jsonrpc:"2.0", id, method:"tools/call",
  params:{ name, arguments: args }
}));
' "$id" "$name" "$args_json"
}

echo ""
echo "== tools/call asset_project_create =="
CREATE_ARGS="$(TOKEN="$TOKEN" node -e 'process.stdout.write(JSON.stringify({accessToken:process.env.TOKEN,name:"Smoke peg monastery",libraryIntent:"Peglin floating peg monastery exterior and interior for Abbie World"}))')"
curl -sS -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "$(rpc_call 2 asset_project_create "$CREATE_ARGS")" \
  | tee "$TMP/create.json" | head -c 2000
echo ""

PROJECT_ID="$(node -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
const body=JSON.parse(j.result?.content?.[0]?.text||"{}");
if(body.error){ console.error(JSON.stringify(body)); process.exit(3); }
process.stdout.write(body.id||"");
' "$TMP/create.json")"
echo "projectId=$PROJECT_ID"

echo ""
echo "== tools/call asset_job_create =="
JOB_ARGS="$(TOKEN="$TOKEN" PROJECT_ID="$PROJECT_ID" node -e 'process.stdout.write(JSON.stringify({accessToken:process.env.TOKEN,projectId:process.env.PROJECT_ID,semanticId:"poi.peglin.pegMonastery.exterior",brief:"floating white monastery with blue roofs and waterfalls"}))')"
curl -sS -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "$(rpc_call 3 asset_job_create "$JOB_ARGS")" \
  | tee "$TMP/job.json" | head -c 2500
echo ""

JOB_ID="$(node -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
const body=JSON.parse(j.result?.content?.[0]?.text||"{}");
if(body.error){ console.error(JSON.stringify(body)); process.exit(4); }
if(!body.midjourneyPrompt){ console.error("no midjourneyPrompt"); process.exit(4); }
process.stdout.write(body.id||"");
' "$TMP/job.json")"
echo "jobId=$JOB_ID"

echo ""
echo "== tools/call asset_job_complete =="
DONE_ARGS="$(TOKEN="$TOKEN" JOB_ID="$JOB_ID" node -e 'process.stdout.write(JSON.stringify({accessToken:process.env.TOKEN,jobId:process.env.JOB_ID,stagingUrl:"https://cdn.midjourney.example/smoke-peg-monastery.png"}))')"
curl -sS -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "$(rpc_call 4 asset_job_complete "$DONE_ARGS")" \
  | tee "$TMP/done.json" | head -c 1500
echo ""

node -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
const body=JSON.parse(j.result?.content?.[0]?.text||"{}");
if(body.status!=="staging"){ console.error("expected staging", body); process.exit(5); }
console.log("complete: OK status=", body.status);
' "$TMP/done.json"

echo ""
echo "== tools/call asset_job_list =="
LIST_ARGS="$(TOKEN="$TOKEN" PROJECT_ID="$PROJECT_ID" node -e 'process.stdout.write(JSON.stringify({accessToken:process.env.TOKEN,projectId:process.env.PROJECT_ID}))')"
curl -sS -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "$(rpc_call 5 asset_job_list "$LIST_ARGS")" | head -c 1500
echo ""

echo ""
echo "SMOKE OK against $MCP_URL (server version: ${VERSION:-unknown})"
