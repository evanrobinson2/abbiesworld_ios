#!/usr/bin/env bash
# R2 S3 keys for the Actions. R2_ACCESS_KEY_ID may hold a Cloudflare API token
# (cfat_...) instead of an Access Key ID: R2's Access Key ID is then the token's id
# and its Secret Access Key the token's SHA-256. Writes the usable pair to $GITHUB_ENV
# (masked) as R2_KEY_ID / R2_KEY_SECRET. Never prints a value.
set -euo pipefail
k="${R2_ACCESS_KEY_ID:-}"; s="${R2_SECRET_ACCESS_KEY:-}"
[ -n "$k" ] || { echo "No R2_ACCESS_KEY_ID"; exit 0; }
if [ "${#k}" -ne 32 ]; then
  id=""
  for u in "accounts/${R2_ACCOUNT_ID}/tokens/verify" "user/tokens/verify"; do
    id=$(curl -fsS -H "Authorization: Bearer $k" "https://api.cloudflare.com/client/v4/$u" | jq -r '.result.id // empty' || true)
    [ -n "$id" ] && break
  done
  [ -n "$id" ] || { echo "::error::R2_ACCESS_KEY_ID is neither a 32-character Access Key ID nor a working Cloudflare token"; exit 1; }
  s=$(printf '%s' "$k" | sha256sum | cut -d' ' -f1); k="$id"
  echo "R2_ACCESS_KEY_ID holds a Cloudflare token: using its id and SHA-256"
fi
echo "::add-mask::$k"; echo "::add-mask::$s"
{ echo "R2_KEY_ID=$k"; echo "R2_KEY_SECRET=$s"; } >> "$GITHUB_ENV"
