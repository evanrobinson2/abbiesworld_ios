#!/usr/bin/env bash
# Sync Studio MCP Bearer into Cursor's user mcp.json.
# Cursor.app does not inherit shell env, so ${env:ABBIES_WORLD_TOKEN} in
# workspace mcp.json is often empty → 401 → hanging OAuth dialog.
set -euo pipefail
TOKEN_FILE="${ABBIES_WORLD_TOKEN_FILE:-$HOME/.abbies_world_token}"
MCP_JSON="${CURSOR_MCP_JSON:-$HOME/.cursor/mcp.json}"
URL="${ABBIES_WORLD_MCP_URL:-https://studio-mock-iota.vercel.app/api/mcp}"

if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "Missing $TOKEN_FILE — paste Studio → Copy MCP token there first." >&2
  exit 1
fi
TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
if [[ ${#TOKEN} -lt 40 ]]; then
  echo "Token in $TOKEN_FILE looks too short." >&2
  exit 1
fi

mkdir -p "$(dirname "$MCP_JSON")"
python3 - "$MCP_JSON" "$URL" "$TOKEN" <<'PY'
import json, sys
path, url, token = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    cfg = json.loads(open(path).read()) if __import__("os").path.exists(path) else {}
except Exception:
    cfg = {}
servers = cfg.setdefault("mcpServers", {})
servers["abbies-world"] = {
    "url": url,
    "headers": {
        "Authorization": f"Bearer {token}",
        "X-Abbies-Auth": "bearer",
    },
}
open(path, "w").write(json.dumps(cfg, indent=2) + "\n")
print(f"Wrote abbies-world Bearer into {path}")
PY

# So GUI apps / future ${env:} interpolation can see it after Cursor relaunch.
launchctl setenv ABBIES_WORLD_TOKEN "$TOKEN" 2>/dev/null || true
echo "Also set launchctl ABBIES_WORLD_TOKEN (relaunch Cursor if MCP still hung)."
echo "In the Authenticating dialog: click Skip, then reload MCP / restart Cursor."
