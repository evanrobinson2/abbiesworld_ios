# Plink MVP (pink vs blue)

Tiny Peglin-inspired marble drop. Five boards, pink vs blue meta fight.

**In-game (iPad):** rebuild this branch, sign in, walk **Abbie's World → Lego Citadel → Plink Pavilion → Play Plink**.

Launch flags: `-launchPlink` / `-autoPlayPlink` / `-launchWorld2Plink` (opens the minigame). `-launchWorld2PeggleLand` lands on Lego Citadel only.

**Live world:** `poi.plinkPavilion` on `scene.legoCitadel` (`behavior: plink`). Exterior is currently `https://peggle-theta.vercel.app/pavilion.png` until an admin key publishes `pois/plink-pavilion/exterior`.

**Web toy:**

```sh
cd prototypes/peggle
npm run dev
```

Open http://127.0.0.1:5174 — port **5174** only. Public: https://peggle-theta.vercel.app

**Soundtrack (parent drops):** safari/lobby loops `Abbie's World`; boards rotate `Cheerful Round Dance` ↔ `Electronic Folk Dance` (`public/music/plink_*.mp3` → `/music/…` on Vercel; mirrored under iOS `Resources/Music/World2/`).
