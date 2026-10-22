"""Rebuild paper-warrior.html with Round 1 / Round 2 / Offshoots containers, reusing round 1's sections and charts from the backup."""
src = open('paper-warrior.r1.bak.html').read().split('\n')
head = '\n'.join(src[:71])          # through the reduced-motion rule
r1 = '\n'.join(src[89:159])         # "The loss" .. end of critique (lines 90-159)
prov = '\n'.join(src[160:171])      # provenance heading + table
script = '\n'.join(src[172:])
head = head.replace('<title>Paper Warrior Fit</title>', '<title>Paper Warrior Studies</title>')
css = open('rounds.css').read()

r1 = r1.replace('<h3>', '<h4>').replace('</h3>', '</h4>').replace('<h2>', '<h3>').replace('</h2>', '</h3>')
r1 = r1.replace("<h4>What I'd change in the machine next</h4>", "<h4>What I said I'd change next, and what round 2 did about it</h4>")
tags = {
    '<li><b>Start from several hypotheses.</b>': '<span class="tag">done in round 2</span>',
    '<li><b>Spend the expensive model where judgement matters.</b>': '<span class="tag todo">open</span>',
    '<li><b>Let the high setting change structure, not just numbers.</b>': '<span class="tag todo">open</span>',
    '<li><b>Fix the loss.</b>': '<span class="tag">part crops and style term in round 2</span>',
    '<li><b>More than one view.</b>': '<span class="tag todo">needs the Mac</span>',
    '<li><b>Repeat runs before ranking models.</b>': '<span class="tag todo">open</span>',
}
for a, t in tags.items():
    assert a in r1, a
    r1 = r1.replace(a, a + t)
r1 = r1.replace('<h3>Silhouette loss over 4,000 evaluations</h3>', '<h3>The silhouette fit</h3>')
r1 = r1.replace('<h3>Milestones, all judged on the same settings</h3>', '<h3>Milestones, judged on the same settings</h3>')

prov = prov.replace('<h2>Provenance</h2>', '')
prov = prov.replace('paper-warrior-target.png, uploaded by Evan. Used only as the loss target and not copied into any asset.',
                    "Evan's uploads: the warrior image, the helmet image and five prop images. Used only as loss targets and not copied into any asset.")
prov = prov.replace('procedural metaball body and bmesh armour, driven by <code>best_params.json</code>.',
                    'procedural metaball body and bmesh armour, the <code>paper.py</code> papercraft grammar and the <code>props.py</code> prop builders, all driven by JSON parameter files.')
assert "Evan's uploads" in prov and 'props.py' in prov

body = open('body.html').read().replace('{R1}', r1)
open('paper-warrior.html', 'w').write(head + css + '</style>' + body + prov + '\n</div>\n' + script)
