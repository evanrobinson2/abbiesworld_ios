"""Check a reconstructed Unity 2D rig against screen-recorded reference videos of the same clips.
For each clip: segment the character in each video frame (colour distance from the scene background), render the clip
from the pack at the same camera (scale and offset fitted once on the first frames), fit the clip start phase, then
report silhouette IoU per frame. usage: python3 -I verify_videos.py <pack> <workdir> <clip>=<framesdir> [...]
framesdir holds 30 fps PNGs of the video (ffmpeg -vf fps=30). Private art: outputs stay out of git."""
import sys, os, runpy, json, glob, numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); pack, work = sys.argv[1:3]; jobs = [a.split("=") for a in sys.argv[3:]]  # clip=framesdir or clip=framesdir@x0,y0,x1,y1 to compare one character of a multi-character recording
FPS = 30; CROP = (60, 30, 1020, 608)  # x0, y0, x1, y1 of the Unity scene view inside the recording
def vmask(path):
    im = cv2.imread(path)[CROP[1]:CROP[3], CROP[0]:CROP[2]].astype(np.float32)
    bg = np.median(im.reshape(-1, 3), axis=0); d = np.abs(im - bg).sum(2)
    m = (d > 70).astype(np.uint8); m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); return m
def load(clip):
    sys.argv = ["x", pack, work, f"abbie/{clip}.anim", "abbie"]
    return runpy.run_path(os.path.join(HERE, "unitypack_render.py"), run_name="lib")
BG = np.array([138, 128, 120])
def rmask(g, t, S, size=(1500, 1300), origin=(750, 950)):
    im = g["render"](t, size=size, origin=origin, S=S).astype(np.int32); return (np.abs(im - BG[::-1]).sum(2) > 40).astype(np.uint8)
report = {}; prec = []
for clip, fdir in jobs:
    if "@" in fdir: fdir, box = fdir.split("@"); CROP = tuple(int(v) for v in box.split(","))
    g = load(clip); L = g["length"]; fr = sorted(glob.glob(fdir + "/*.png")); M = [vmask(f) for f in fr]
    H, W = M[0].shape
    # 1. fit camera scale + phase on the first 8 frames by template match of my silhouette inside the video silhouette
    best = (-1, None)
    for S in (55, 60, 65, 70, 75, 80, 90, 100, 110, 120, 140, 150):
        for k in range(0, 20):
            t = L * k / 20; rm = rmask(g, t, S); ys, xs = np.where(rm); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
            tpl = rm[y0:y1 + 1, x0:x1 + 1].astype(np.float32)
            if tpl.shape[0] >= H or tpl.shape[1] >= W: continue
            r = cv2.matchTemplate(M[0].astype(np.float32), tpl, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(r)
            if mx > best[0]: best = (mx, dict(S=S, t0=t, ox=loc[0] - x0 + 750, oy=loc[1] - y0 + 950))
    S = best[1]["S"]; ox, oy = best[1]["ox"], best[1]["oy"]
    # 2. refine the phase and scale using all frames at the fitted offset
    def iou_at(S, off_t, ox, oy, frames=None):
        out = []; prec.clear()
        for i in (frames or range(len(M))):
            rm = rmask(g, (off_t + i / FPS), S, size=(W, H), origin=(ox, oy)); a = rm > 0; b = M[i] > 0
            out.append((a & b).sum() / max((a | b).sum(), 1)); prec.append((a & b).sum() / max(a.sum(), 1))
        return np.array(out)
    # offset in rmask coords was computed for the big canvas; recompute origin for the video-sized canvas
    ox_v, oy_v = ox - 750 + 750, oy - 950 + 950
    probe = list(range(0, len(M), max(1, len(M) // 12)))
    p = dict(dt=0.0, S=S, dx=0, dy=0)
    ev = lambda q: iou_at(q["S"], best[1]["t0"] + q["dt"], ox_v + q["dx"], oy_v + q["dy"], probe).mean()
    cur = ev(p)
    for step in ((0.04, 4, 4, 4), (0.02, 2, 2, 2), (0.01, 1, 1, 1)):  # coordinate descent: phase, scale, offset
        for _ in range(3):
            moved = False
            for key, d in (("dt", step[0]), ("S", step[1]), ("dx", step[2]), ("dy", step[3])):
                for sg in (1, -1):
                    q = dict(p); q[key] += sg * d; v = ev(q)
                    if v > cur + 1e-4: p, cur, moved = q, v, True
            if not moved: break
    dt, S2, ddx, ddy = p["dt"], p["S"], p["dx"], p["dy"]
    final = iou_at(S2, best[1]["t0"] + dt, ox_v + ddx, oy_v + ddy)
    report[clip] = dict(frames=len(M), scale=S2, phase=round(best[1]["t0"] + dt, 3), mean_iou=round(float(final.mean()), 3), mine_covered=round(float(np.mean(prec)), 3), p10=round(float(np.percentile(final, 10)), 3), worst=round(float(final.min()), 3), per_frame=[round(float(v), 3) for v in final])
    print(clip, {k: v for k, v in report[clip].items() if k != "per_frame"}, flush=True)
    # side-by-side contact sheet: video | mine | overlay (green = video only, red = mine only) at 6 frames
    rows = []
    for i in np.linspace(0, len(M) - 1, 6).astype(int):
        v = cv2.imread(fr[i])[CROP[1]:CROP[3], CROP[0]:CROP[2]]; rm = rmask(g, best[1]["t0"] + dt + i / FPS, S2, size=(W, H), origin=(ox_v + ddx, oy_v + ddy))
        ov = np.zeros((H, W, 3), np.uint8); ov[..., 1] = M[i] * 255; ov[..., 2] = rm * 255; rows.append(np.hstack([v, g["render"](best[1]["t0"] + dt + i / FPS, size=(W, H), origin=(ox_v + ddx, oy_v + ddy), S=S2), ov]))
    cv2.imwrite(f"{work}/verify_{clip}.png", cv2.resize(np.vstack(rows[:3]), None, fx=0.5, fy=0.5)); 
json.dump(report, open(f"{work}/verify_report.json", "w"), indent=1)
