"""Pose the cut-out rig by target bone directions and composite the sprites. usage: python3 pose.py <outdir> <posename|all> [png]
Directions are degrees in image space (0 = right, 90 = down). Proves the rig turns: forward kinematics about each bone's pivot."""
import sys, json, math, numpy as np, cv2
out = sys.argv[1]; rig = json.load(open(out+"/rig.json")); W, H = rig["image_size"]; B = {b["name"]: b for b in rig["bones"]}
def rest_dir(b): 
    (px, py), (tx, ty) = B[b]["pivot"], B[b]["tip"]; return math.degrees(math.atan2(ty-py, tx-px))
# spine/hips rest directions run from the pivot up the body
REST = {b: rest_dir(b) for b in B}; REST["hips"] = math.degrees(math.atan2(-1, 0)); REST["spine"] = -90.0
def order(): 
    done, res = set(), []
    while len(res) < len(B):
        for n, b in B.items():
            if n not in done and (b["parent"] is None or b["parent"] in done): done.add(n); res.append(n)
    return res
def rot(a, p):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a)); px, py = p
    return np.array([[c, -s, px-c*px+s*py], [s, c, py-s*px-c*py], [0, 0, 1]])
def pose_transforms(target):  # target: bone -> absolute direction (deg); missing = rest
    T, A = {}, {}
    for n in order():
        par = B[n]["parent"]; Ap = A[par] if par else 0.0; a_abs = (target.get(n, REST[n]) - REST[n]) if n in target else Ap
        local = a_abs - Ap; A[n] = a_abs; Tp = T[par] if par else np.eye(3); T[n] = Tp @ rot(local, B[n]["pivot"])
    return T
def render(target, bg=(120, 128, 138), shift=(0, 0)):
    T = pose_transforms(target); canvas = np.zeros((H, W, 3), np.float32) + np.array(bg[::-1], np.float32); 
    for q in rig["parts"]:
        spr = cv2.imread(f"{out}/{q['file']}", cv2.IMREAD_UNCHANGED).astype(np.float32); M = T[q["bone"]] @ np.array([[1, 0, q["x"]], [0, 1, q["y"]], [0, 0, 1]], float)
        M[0, 2] += shift[0]; M[1, 2] += shift[1]
        warped = cv2.warpAffine(spr, M[:2], (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0)); a = warped[..., 3:4]/255.0
        canvas = canvas*(1-a) + warped[..., :3]*a
    return canvas.clip(0, 255).astype(np.uint8)
L, R = 5, -5
POSES = {
 "rest": {},
 "a_pose": {"hips": -90, "spine": -90, "neck": -90, "head": -90, "upperarm_R": 125, "forearm_R": 120, "hand_R": 115, "upperarm_L": 55, "forearm_L": 60, "hand_L": 65,
            "thigh_R": 98, "shin_R": 95, "foot_R": 105, "thigh_L": 82, "shin_L": 85, "foot_L": 75},
 "walk_contact": {"hips": -90, "spine": -92, "neck": -90, "head": -90, "upperarm_R": 70, "forearm_R": 60, "hand_R": 55, "upperarm_L": 110, "forearm_L": 118, "hand_L": 122,
            "thigh_R": 70, "shin_R": 78, "foot_R": 95, "thigh_L": 105, "shin_L": 98, "foot_L": 80},
 "run_flight": {"hips": -86, "spine": -80, "neck": -84, "head": -88, "upperarm_R": 150, "forearm_R": 95, "hand_R": 80, "upperarm_L": 45, "forearm_L": 105, "hand_L": 110,
            "thigh_R": 40, "shin_R": 105, "foot_R": 60, "thigh_L": 125, "shin_L": 170, "foot_L": 110},
}
if __name__ == "__main__":
    names = list(POSES) if sys.argv[2] == "all" else [sys.argv[2]]
    local = {}
    for n in names:
        img = render(POSES[n]); cv2.imwrite(f"{out}/pose_{n}.png", img)
        A = {}; loc = {}
        for b in order():
            par = B[b]["parent"]; Ap = A[par] if par else 0.0; a_abs = (POSES[n][b] - REST[b]) if b in POSES[n] else Ap; A[b] = a_abs; loc[b] = round(-(a_abs - Ap), 1)  # Unity z rotation: counter-clockwise positive
        local[n] = loc
    json.dump(dict(note="Local z rotation in degrees per bone, Unity convention (y up, counter-clockwise positive), relative to the rest pose. Key these on the bone transforms.", poses=local), open(f"{out}/poses.json", "w"), indent=1)
    print(names)
