"""Build model-cards.html: one card per model with the reference image, a live 3D view, the match, the method and the details.
Models are embedded as base64 GLB and parsed in the page (no network fetch), so the 3D view works inside the artifact frame."""
import json, base64, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(HERE, '..')
man = json.load(open(os.path.join(S, 'site', 'glb', 'props.json')))

def summ(n, f): return json.load(open(os.path.join(S, 'props', n, f)))

# what each builder makes, and the read by eye after the second fit (from the side-by-side review)
PROPS = [
    dict(id='cuirass', name='Cuirass', orbit=(-8, 65), photo='Segmented chest armour (lorica) with shoulder guards',
         builder='Six overlapping hoops for the torso bands, front and back chest plates with a neck scoop, and three stepped guard plates over each shoulder.',
         good=['Outline and height match closely: 91% of the outline overlaps.', 'The stacked hoops read as lorica bands.'],
         off=['The chest plates split down the middle; your cuirass is closed at the front.', 'The shoulder guards are too flat and too square.', 'Your hoops are deeper and more stepped than mine.']),
    dict(id='pauldrons', name='Pauldrons', orbit=(-55, 78), photo='A pair of layered shoulder guards',
         builder='Three nested arch plates per shoulder, each with a rolled rim, stacked down the arm.',
         good=['Three nested plates per side, as in your photo.', 'Rolled rims on each plate.'],
         off=['One cap drifts away from its pair, so the outline only overlaps 72%.', 'The domes are too flat at the crown.', 'Mine are thinner sheets; yours look thicker and softer.']),
    dict(id='belt', name='Belt', orbit=(-24, 63), photo='A plain belt with a rectangular buckle',
         builder='One faceted band in a loop, a buckle frame on the front and a short strap tail.',
         good=['The ring shape and colour are right.', 'Lowest colour error of the five.'],
         off=['The band is too thin and tilted, so the outline overlaps 77%.', 'The buckle is an H shape, not a rectangle with a tongue.', 'The strap tail does not show.']),
    dict(id='sandals', name='Sandals', orbit=(-34, 55), photo='A pair of strappy sandals',
         builder='A sole outline (heel, ball and toe) with a raised lip, a heel loop and crossing straps over the forefoot.',
         good=['The layout is right: two sandals, heel loops and forefoot straps.', '86% of the outline overlaps.'],
         off=['The soles are too thick.', 'The straps are chunky and crumpled; yours are clean, smooth loops.']),
    dict(id='greaves', name='Greaves', orbit=(-18, 72), photo='A pair of faceted shin guards',
         builder='A faceted front shell and a smaller back plate for each shin, tapering to the ankle with a calf swell.',
         good=['Closest of the five: right shape and facet size.', '85% of the outline overlaps.'],
         off=['The back plate edge does not show from your angle.', 'The colour is a little too white.']),
]

