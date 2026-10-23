"""Steam study tool for the Game Oracle.

Lists the Steam games on this PC, asks the signed-in Steam client to install
owned games, and writes a derived "identity" profile per game: store metadata
plus an engine fingerprint read from file names in the install folder.

Rules: never copies game files, art, audio or code. Never touches Steam login
data. Profiles hold only derived notes and land in docs/oracle/games/.

  python steam_study.py list [--json]
  python steam_study.py owned STEAMID64      # needs Game details: Public
  python steam_study.py install APPID        # opens Steam's own install dialog
  python steam_study.py profile APPID [APPID ...]
"""
import argparse, json, os, re, sys, urllib.request, webbrowser
from pathlib import Path

STEAM_ROOT = Path(r"C:\Program Files (x86)\Steam")
REPO = Path(__file__).resolve().parents[2]
PROFILES = REPO / "docs" / "oracle" / "games"
SKIP = re.compile(r"Redistributables|Tools$|Demo|Prologue|Free Sample")

ENGINE_MARKERS = [
    ("Unity", ["UnityPlayer.dll", "*_Data/globalgamemanagers"]),
    ("Unreal", ["Engine/Binaries", "*.pak"]),
    ("Godot", ["*.pck"]),
    ("GameMaker", ["data.win"]),
    ("Bevy/Rust", ["*.wgsl", "*.ron", "*/*.ron"]),
    ("MonoGame/XNA", ["MonoGame.Framework.dll", "Microsoft.Xna.Framework.dll"]),
    ("Source", ["*/gameinfo.txt"]),
]


def libraries():
    vdf = (STEAM_ROOT / "steamapps" / "libraryfolders.vdf").read_text(encoding="utf-8")
    return [Path(p.replace("\\\\", "\\")) for p in re.findall(r'"path"\s+"([^"]+)"', vdf)]


def installed():
    games = []
    for lib in libraries():
        for acf in (lib / "steamapps").glob("appmanifest_*.acf"):
            text = acf.read_text(encoding="utf-8", errors="replace")
            field = lambda k: (re.search(rf'"{k}"\s+"([^"]*)"', text) or [None, ""])[1]
            name = field("name")
            if SKIP.search(name):
                continue
            games.append({
                "appid": int(field("appid") or acf.stem.split("_")[1]),
                "name": name,
                "size_gb": round(int(field("SizeOnDisk") or 0) / 2**30, 1),
                "dir": str(lib / "steamapps" / "common" / field("installdir")),
            })
    return sorted(games, key=lambda g: g["name"].lower())


def owned(steamid):
    url = f"https://steamcommunity.com/profiles/{steamid}/games/?xml=1&tab=all"
    body = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "replace")
    if "<gamesList>" not in body:
        sys.exit("Profile game details are private. Steam: Edit Profile > Privacy Settings > Game details: Public.")
    return [{"appid": int(a), "name": n} for a, n in
            re.findall(r"<appID>(\d+)</appID>\s*<name><!\[CDATA\[(.*?)\]\]></name>", body)]


def store(appid):
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}&l=english"
    data = json.load(urllib.request.urlopen(url, timeout=30))[str(appid)]
    return data.get("data", {}) if data.get("success") else {}


def fingerprint(game_dir):
    root = Path(game_dir)
    if not root.exists():
        return {"engine": "not installed", "files": 0}
    engines = [name for name, pats in ENGINE_MARKERS
               if any(next(root.glob(p), None) or next(root.glob("*/" + p), None) for p in pats)]
    exts = {}
    count = 0
    for path in root.rglob("*"):
        if path.is_file():
            count += 1
            exts[path.suffix.lower() or "(none)"] = exts.get(path.suffix.lower() or "(none)", 0) + 1
            if count > 50000:
                break
    top = sorted(exts.items(), key=lambda kv: -kv[1])[:12]
    return {"engine": engines[0] if engines else "unknown", "engine_hints": engines,
            "files": count, "top_extensions": dict(top)}


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def profile(appid):
    local = next((g for g in installed() if g["appid"] == appid), None)
    s = store(appid)
    name = s.get("name") or (local or {}).get("name") or str(appid)
    text = re.sub(r"<[^>]+>", " ", s.get("about_the_game", ""))
    prof = {
        "appid": appid,
        "name": name,
        "store_url": f"https://store.steampowered.com/app/{appid}/",
        "developers": s.get("developers", []),
        "release": s.get("release_date", {}).get("date"),
        "short_description": s.get("short_description"),
        "genres": [g["description"] for g in s.get("genres", [])],
        "categories": [c["description"] for c in s.get("categories", [])],
        "store_text_words": len(text.split()),
        "header_image": s.get("header_image"),
        "install": fingerprint(local["dir"]) if local else {"engine": "not installed"},
        "identity": {k: None for k in (
            "core_loop", "mechanics", "ui_and_game_feel", "information_grammar", "camera",
            "art_direction", "palette", "audio_mood", "pacing", "lessons_for_abbies_world")},
        "sources": ["steam store api", "install file names (no contents)"],
    }
    PROFILES.mkdir(parents=True, exist_ok=True)
    out = PROFILES / f"{slug(name)}.json"
    out.write_text(json.dumps(prof, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("list"); p.add_argument("--json", action="store_true")
    sub.add_parser("owned").add_argument("steamid")
    sub.add_parser("install").add_argument("appid", type=int)
    sub.add_parser("profile").add_argument("appids", type=int, nargs="+")
    a = ap.parse_args()
    if a.cmd == "list":
        games = installed()
        if a.json:
            print(json.dumps(games, indent=2, ensure_ascii=False))
        else:
            for g in games:
                print(f"{g['appid']:>8}  {g['size_gb']:>6} GB  {g['name']}")
            print(f"{len(games)} games installed")
    elif a.cmd == "owned":
        for g in owned(a.steamid):
            print(f"{g['appid']:>8}  {g['name']}")
    elif a.cmd == "install":
        webbrowser.open(f"steam://install/{a.appid}")
        print("Steam's install dialog is open; click Install there. Not owned opens the store page instead.")
    elif a.cmd == "profile":
        for appid in a.appids:
            print(profile(appid))


if __name__ == "__main__":
    main()
