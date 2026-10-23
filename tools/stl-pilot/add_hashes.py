"""Record each source STL's sha256 and size in its provenance.json (the STLs themselves are git-ignored).

python add_hashes.py
"""
import glob, hashlib, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
for pf in sorted(glob.glob(os.path.join(HERE, "*", "provenance.json"))):
    d = os.path.dirname(pf)
    p = json.load(open(pf, encoding="utf-8"))
    files = []
    for f in sorted(glob.glob(os.path.join(d, "source*.stl"))):
        h = hashlib.sha256()
        with open(f, "rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""): h.update(chunk)
        files.append({"file": os.path.basename(f), "sha256": h.hexdigest(), "bytes": os.path.getsize(f)})
    p["source_files"] = files
    p["stl_location"] = "Not in git. Kept on the PC next to this file (git-ignored); re-download from model_url and check the sha256."
    json.dump(p, open(pf, "w", encoding="utf-8"), indent=2, ensure_ascii=False); open(pf, "a").write("\n")
    print(os.path.basename(d), [f["sha256"][:12] for f in files])
