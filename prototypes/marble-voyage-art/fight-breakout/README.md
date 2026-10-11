# Fight breakout storyboard

Local HTML prototype of the expected Marble Voyage fight-entry animation:

1. Abbie marches along the path to the glowing foe tile  
2. Hard **solid black** curtain slam (must be obvious on the blueprint navy)  
3. Comic **COMING TO RESCUE!** splash (bad guys vs hostage)  
4. Iris cutaway reveals the peg board  

## Run

From repo root (port **8765** — same as other local art previews in this project):

```bash
cd prototypes/marble-voyage-art/fight-breakout
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) and press **Play breakout**.

If 8765 is already taken, stop that server or tell the agent — do not silently pick another port.
