import math, wave, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'OriginalAudio'
root.mkdir(parents=True,exist_ok=True)
specs={'Step':[(330,.06)],'Pop':[(660,.07),(880,.09)],'Drink':[(440,.09),(660,.1),(880,.14)],'Brew':[(330,.08),(550,.08),(740,.1),(990,.16)],'Hit':[(220,.06),(165,.09)],'Level':[(523,.12),(659,.12),(784,.12),(1046,.22)],'Win':[(523,.14),(659,.14),(784,.14),(1046,.28),(784,.12),(1046,.35)],'Rest':[(392,.14),(330,.16),(262,.22)]}
rate=24000
for name,notes in specs.items():
    pcm=[]
    for freq,duration in notes:
        length=int(rate*duration)
        for n in range(length):
            t=n/rate;envelope=min(1,t/.008)*math.exp(-t/(duration*.38))*min(1,(duration-t)/.015)
            # Rounded marimba-like tone with a soft upward liquid pitch curl.
            phase=2*math.pi*(freq*t+freq*.018*(1-math.exp(-t*24)))
            value=(math.sin(phase)+.18*math.sin(phase*2)+.04*math.sin(phase*3))*envelope*.24
            pcm.append(struct.pack('<h',int(max(-1,min(1,value))*32767)))
    with wave.open(str(root/('S_PM_'+name+'.wav')),'wb') as f:
        f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(b''.join(pcm))
print('Created 8 original soft synthesized effects')
