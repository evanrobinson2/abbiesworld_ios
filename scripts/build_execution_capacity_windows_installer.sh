# Windows installer packager — Mac and Windows both produce the same zip.
# Mac:  ./scripts/build_execution_capacity_windows_installer.sh
# Win:  .\scripts\build_execution_capacity_windows_installer.ps1
# Output: artifacts/execution-capacity-windows/<stamp>/AbbiesWorldExecutionCapacity.zip
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/prototypes/execution-capacity"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$ROOT/artifacts/execution-capacity-windows/$STAMP"
STAGE="$OUT/AbbiesWorldExecutionCapacity"
PAYLOAD="$STAGE"

mkdir -p "$PAYLOAD/app"
rsync -a --delete \
  --exclude '.venv' \
  --exclude 'data' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'windows' \
  --exclude 'launchd' \
  --exclude '.gitignore' \
  "$APP/" "$PAYLOAD/app/"
cp "$ROOT/scripts/execution_capacity.ps1" "$PAYLOAD/app/execution_capacity.ps1"
cp "$APP/windows/Install.ps1" "$PAYLOAD/Install.ps1"
cp "$APP/windows/Uninstall.ps1" "$PAYLOAD/Uninstall.ps1"
cp "$APP/windows/AbbiesWorldExecutionCapacity.iss" "$PAYLOAD/AbbiesWorldExecutionCapacity.iss"

python3 - <<'PY' "$PAYLOAD/app/assets"
from pathlib import Path
import sys
try:
    from PIL import Image
except ImportError:
    sys.exit(0)
assets = Path(sys.argv[1])
src = assets / "tray-green.png"
if not src.is_file():
    sys.exit(0)
im = Image.open(src).convert("RGBA")
ico = assets / "abbies.ico"
im.save(ico, sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
print("ok: wrote", ico)
PY

cat > "$PAYLOAD/README.txt" <<'EOF'
Abbie's World — Midjourney worker (Windows)

1. Extract this folder anywhere.
2. Right-click Install.ps1 → Run with PowerShell
   (or: powershell -ExecutionPolicy Bypass -File .\Install.ps1)
3. Paste the household token if prompted (Studio → Copy MCP token).
4. Sign into Midjourney once in the dedicated Chrome window
   (%LOCALAPPDATA%\AbbiesWorld\execution-capacity-chrome).
5. Leave the sailboat in the notification area. It pulls jobs from the household queue.

Uninstall: Uninstall.ps1 (keeps Chrome login + token file).

Port 8780 must be free. This installer will not pick another port.
EOF

(cd "$OUT" && zip -qr "AbbiesWorldExecutionCapacity.zip" "AbbiesWorldExecutionCapacity")
ln -sfn "$STAMP" "$ROOT/artifacts/execution-capacity-windows/latest"
echo "ok: $OUT/AbbiesWorldExecutionCapacity.zip"
echo "extract on Windows and run Install.ps1"
