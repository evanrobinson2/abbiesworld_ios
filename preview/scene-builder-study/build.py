# Builds index.html from index.src.html by inlining the context card (node tools/context-card/snippet.mjs scene-builder > ctx.html).
import re
src = open('index.src.html').read(); ctx = open('ctx.html').read()
ctx = re.sub(r'<p class="ctx-foot"><a href="https://app.abbies.world/studies/#[^"]*">Live study page</a></p>', '', ctx)
open('index.html', 'w').write(src.replace('<!--CTX-->', ctx))
