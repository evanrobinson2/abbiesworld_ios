"""Build founding.html: the founding template with the simulation module inlined, so the page runs the same code
as the game. Run from the repo root: python3 docs/oracle/city/build_founding_page.py"""
import pathlib, re

here = pathlib.Path(__file__).parent
module = (here / '../../../prototypes/ranch-atelier/dist/simulations/city/founding.mjs').resolve().read_text()
module = re.sub(r'^export ', '', module, flags=re.M)
page = (here / 'founding.template.html').read_text().replace('/*FOUNDING*/', module)
(here / 'founding.html').write_text(page)
print('wrote', here / 'founding.html', len(page), 'bytes')
