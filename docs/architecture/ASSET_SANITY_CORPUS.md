# Asset + framing sanity corpus

**Audience:** creative services (ChatGPT MCP, art director, Cursor) generating or approving plates.  
**Goal:** stop household accidents — **feet instead of eyes**, **subject cut in half**, wrong subject, empty/abstract frames — without a heavy QA org.  
**Canon local gate:** `scripts/world2_assets/qualify.py` + `scripts/review_voyage_portraits.py` (repo).  
**Live MCP gate:** Studio `asset_job_*` → vision sanity → `registered` or `needs_review` (`asset-vision-sanity.js`).

---

## 1. Pipeline (cheap)

```text
brief + framing rules
  → image generate / URL paste
  → ingest bytes to registry
  → ONE vision sanity call (gpt-4.1-mini by default)
       pass  → status registered → Mission proof / Board / bind OK
       fail  → status needs_review → do NOT Board as final; regenerate
```

Env:

| Var | Default | Meaning |
| --- | --- | --- |
| `ASSET_SANITY` | `1` | Set `0` only for emergency bypass after human look |
| `ASSET_SANITY_MODEL` | `gpt-4.1-mini` | Cheap multimodal; override if needed |

Job field `sanity`: `{ pass, summary, flags[], subjectDescription, matchesBrief, framingOk }`.

---

## 2. Hard-fail flags

| Flag | Means |
| --- | --- |
| `wrong_subject` | Picture does not match brief / semantic intent |
| `cropped_subject` | Primary subject cut in half or clipped at edge |
| `feet_not_face` | Crop dominated by feet/shoes/legs when a face/character was expected |
| `face_missing` | Character expected; no readable face/eyes |
| `empty_or_abstract` | No clear subject |
| `unsafe` | Not child-safe |
| `text_or_ui` | Text, logos, or UI chrome in frame |

Soft warns (`soft_warn_*`) may still pass.

---

## 3. Framing contracts by kind

- **map** — full-bleed; landmarks inside with margin; readable horizon.  
- **poi.exterior** — whole silhouette + padding; never crop base/roof.  
- **poi.interior** — room fully framed; lower third open floor OK.  
- **portrait / character** — **eyes/face dominate**; fail feet-only / quills-only / head-sliver crops.

Prompt writer and `proofBrief` must restate these (already injected in Studio jobs).

---

## 4. Visual locationing (POIs on plates)

Separate from pixel crop, but same product pain:

- Place/instance **x,y in 0.12–0.88** (MCP clamps).  
- Do not park interactive POIs on plate edges or under chrome.  
- Overland: fit plates; never `scaledToFill` crop of hero art (Voyage rules).  
- Portrait **tiles** use face bbox review (`review_voyage_portraits.py`) — ship bbox with the asset when the game crops heads.

Future (not required tonight): vision that scores POI pin vs plate content (“rocket sits on pad pixels”). Until then: semantic placement + human Board.

---

## 5. Creative-service habit

1. Write briefs that name **shot size** (close face / medium / full landmark).  
2. After `asset_job_create`, read `status` + `sanity.subjectDescription`.  
3. If `needs_review` — regenerate with explicit “face centered, full subject in frame, padding” — do not bind.  
4. Board on phone is taste, not a substitute for hard-fail flags.  
5. Repo integrate still runs `qualify.py` for bundled World2 packs.

---

## 6. One-liner for agents

> Generate with framing rules; run sanity; only `registered` + pass may Board/bind. Feet-as-face and half-crops are hard fails — regenerate, don’t argue.
