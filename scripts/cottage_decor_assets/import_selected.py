#!/usr/bin/env python3
"""Import approved furniture sheet 4 and stuffie sheet 2, preserving existing decor."""
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
import pipeline as p

ROOT = p.REPO_ROOT
KIT = p.KIT_ROOT
# Explicit cells prevent neighboring objects/shadows from merging.
PACKS = [
 ('furniture4','pack.abbieCottage.furniture.sheet4','cottage-furniture-2026-09-27','furniture-sheet-4-approved.jpeg',[
 ('cat-armchair','Cat armchair','seating',[40,15,328,345]),
 ('mushroom-desk','Mushroom desk','crafting',[325,10,626,344]),
 ('rainbow-trampoline','Rainbow trampoline','play-stages',[625,30,1010,410]),
 ('flower-gymnastics-bar','Flower gymnastics bar','play-stages',[40,342,500,578]),
 ('animal-exercise-mat','Animal exercise mat','rugs',[45,575,475,682]),
 ('crescent-moon-bed','Crescent moon bed','beds',[510,395,1000,710]),
 ('cottage-bedside-cabinet','Cottage bedside cabinet','storage',[20,680,340,985]),
 ('crown-wardrobe','Crown wardrobe','storage',[360,635,635,985]),
 ('turtle-toy-chest','Turtle toy chest','storage',[650,725,995,985]),
 ]),
 ('stuffies2','pack.abbieCottage.stuffies.sheet2','cottage-stuffies-2026-09-27','stuffies-sheet-2-approved.jpeg',[
 ('lavender-dragon','Lavender dragon stuffie','toys',[35,40,378,364]),
 ('strawberry-frog','Strawberry frog stuffie','toys',[378,40,662,358]),
 ('golden-bear','Golden bear stuffie','toys',[668,35,980,357]),
 ('shaggy-winged-friend','Shaggy winged stuffie','toys',[45,365,370,653]),
 ('sleepy-moth','Sleepy moth stuffie','toys',[370,356,680,650]),
 ('star-pajama-bear','Star pajama bear stuffie','toys',[680,356,988,653]),
 ('rainbow-puppy','Rainbow puppy stuffie','toys',[35,675,318,974]),
 ('rainbow-dachshund','Rainbow dachshund stuffie','toys',[320,670,630,978]),
 ('unicorn-puppy','Unicorn puppy stuffie','toys',[630,650,995,980]),
 ]),
 # Sheet 4 — six distinct variants (Evan approved candidate 4 / index 3).
 ('stuffies4','pack.abbieCottage.stuffies.sheet4','cottage-stuffies-2026-09-27','stuffies-sheet-4-approved.jpeg',[
 ('lavender-dragon','Lavender dragon stuffie','toys',[20,20,350,500]),
 ('strawberry-frog','Strawberry frog stuffie','toys',[350,20,680,500]),
 ('sleepy-moth','Sleepy moth stuffie','toys',[680,20,1010,500]),
 ('star-pajama-bear','Star pajama bear stuffie','toys',[20,500,350,1005]),
 ('rainbow-puppy','Rainbow puppy stuffie','toys',[350,500,680,1005]),
 ('unicorn-puppy','Unicorn puppy stuffie','toys',[680,500,1010,1005]),
 ]),
]

def main():
 added=[]
 for key,semantic,folder,filename,items in PACKS:
  source=ROOT/'AssetSources/World2'/folder/filename
  provenance=json.loads((source.parent/'provenance.json').read_text())
  record=next(a for a in provenance['assets'] if a['semanticId']==semantic)
  assert p.sha256_file(source)==record['sha256']
  original=cv2.imread(str(source))
  for slug,label,category,bounds in items:
   x,y,r,b=bounds; crop=original[y:b,x:r].copy()
   # Higher separation threshold excludes faint floor shadows from plush sheets.
   old=p.EDGE_THRESHOLD
   p.EDGE_THRESHOLD=125 if key.startswith('stuffies') else 30
   seg=p.segment_sheet(crop);p.EDGE_THRESHOLD=old
   component=max(seg.components,key=lambda c:c.area)
   rgba,_=p.extract_component(crop,seg,component)
   ident=f'acd-{key}-{slug}';name=ident.replace('-','_')
   dest=KIT/'extracted'/f'{ident}.png';dest.parent.mkdir(parents=True,exist_ok=True)
   Image.fromarray(rgba).save(dest)
   imageset=p.CATALOG_ROOT/f'{name}.imageset';imageset.mkdir(exist_ok=True)
   (imageset/f'{name}.png').write_bytes(dest.read_bytes())
   p.write_json(imageset/'Contents.json',{'images':[{'filename':f'{name}.png','idiom':'universal','scale':'1x'},{'idiom':'universal','scale':'2x'},{'idiom':'universal','scale':'3x'}],'info':{'author':'xcode','version':1}})
   metadata=KIT/'metadata'/f'{ident}.json'
   p.write_json(metadata,{'semanticId':f'decor.abbieCottage.{ident}','packSemanticId':semantic,'source':record,'sourcePath':str(source.relative_to(ROOT)),'cropBounds':bounds,'derivativeSha256':p.sha256_file(dest),'processing':'existing cottage pipeline component extraction; explicit object cells','reviewStatus':'pending_visual_review'})
   scale=0.65 if key.startswith('stuffies') else 0.85
   added.append({'id':ident,'semanticId':f'decor.abbieCottage.{ident}','assetCatalogName':name,'label':label,'category':category,'description':f'Hand-painted {label.lower()} from the approved cottage sheet.','tags':['abbie-cottage',category,key],'pixelSize':{'width':rgba.shape[1],'height':rgba.shape[0]},'defaultScale':scale,'placementLayer':'floor','role':'placeable-room-prop','eligibleCottageScenes':p.COTTAGE_SCENES,'pngSha256':p.sha256_file(dest),'sourceSha256':record['sha256'],'metadataPath':str(metadata.relative_to(ROOT))})
 manifest=json.loads(p.MANIFEST_PATH.read_text())
 ids={a['id'] for a in added}
 manifest['assets']=[a for a in manifest['assets'] if a['id'] not in ids]+added
 manifest['assetCount']=len(manifest['assets'])
 p.write_json(p.MANIFEST_PATH,manifest);p.write_json(p.RUNTIME_MANIFEST_PATH,manifest)
 # Contact sheets: all newly imported this run, plus stuffies4-focused board.
 board=Image.new('RGB',(1200,800),'#9da9b8');draw=ImageDraw.Draw(board)
 for i,a in enumerate(added):
  im=Image.open(KIT/'extracted'/f"{a['id']}.png").convert('RGBA');im.thumbnail((180,165))
  x=(i%6)*200;y=(i//6)*200
  board.paste(im,(x+(200-im.width)//2,y),im);draw.text((x+5,y+177),a['label'][:22],fill='black')
 board.save(KIT/'review'/'selected-furniture-stuffies.png')
 sheet4=[a for a in added if a['id'].startswith('acd-stuffies4-')]
 if sheet4:
  b4=Image.new('RGB',(1200,400),'#9da9b8');d4=ImageDraw.Draw(b4)
  for i,a in enumerate(sheet4):
   im=Image.open(KIT/'extracted'/f"{a['id']}.png").convert('RGBA');im.thumbnail((180,165))
   x=(i%6)*200;y=(i//6)*200
   b4.paste(im,(x+(200-im.width)//2,y),im);d4.text((x+5,y+177),a['label'][:22],fill='black')
  b4.save(KIT/'review'/'selected-stuffies4.png')
 print(f'Imported {len(added)} props; catalog now {manifest["assetCount"]}')
if __name__=='__main__':main()
