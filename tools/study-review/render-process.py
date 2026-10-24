"""Render the preserved process proposal without dependencies or source rewriting."""
from pathlib import Path
import html
import posixpath
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/oracle/mini-game-designer/MINI_GAME_DESIGNER_STUDY.md'
DEST = ROOT / 'prototypes/ranch-atelier/dist/studies/toy-world-review/process.html'
TOKEN = re.compile(r'\[([^\]]+)\]\(([^)]+)\)|https://[^\s<>]+|`([^`]+)`|\*\*([^*]+)\*\*')

def inline(text):
    result, start = [], 0
    for match in TOKEN.finditer(text):
        result.append(html.escape(text[start:match.start()]))
        label, href, code, bold = match.groups()
        if label or match[0].startswith('https://'):
            href = href or match[0]
            label = label or href
            if not href.startswith('https://'):
                href = 'https://github.com/evanrobinson2/abbiesworld_ios/blob/main/' + posixpath.normpath(posixpath.join('docs/oracle/mini-game-designer', href))
            result.append(f'<a target="_blank" rel="noopener" href="{html.escape(href, quote=True)}">{html.escape(label)}</a>')
        elif code:
            result.append('<code>' + html.escape(code) + '</code>')
        else:
            result.append('<strong>' + html.escape(bold) + '</strong>')
        start = match.end()
    result.append(html.escape(text[start:]))
    return ''.join(result)

lines = SOURCE.read_text(encoding='utf8').splitlines()
out, i = [], 0
while i < len(lines):
    line = lines[i]
    if not line:
        i += 1
        continue
    if '\t' in line:
        out.append('<div class="table-scroll"><table>')
        first = True
        while i < len(lines) and '\t' in lines[i]:
            tag = 'th' if first else 'td'
            out.append('<tr>' + ''.join(f'<{tag}>{inline(cell)}</{tag}>' for cell in lines[i].split('\t')) + '</tr>')
            first, i = False, i + 1
        out.append('</table></div>')
        continue
    heading = re.match(r'^(#+) (.*)', line)
    numbered = re.match(r'^\d+\. (.*)', line)
    ordered_list = numbered and i + 1 < len(lines) and re.match(r'^\d+\. ', lines[i + 1])
    if line.startswith('- ') or ordered_list:
        tag, pattern = ('ol', r'^\d+\. (.*)') if ordered_list else ('ul', r'^- (.*)')
        out.append('<' + tag + '>')
        while i < len(lines) and (item := re.match(pattern, lines[i])):
            out.append('<li>' + inline(item[1]) + '</li>')
            i += 1
        out.append('</' + tag + '>')
        continue
    if heading:
        level = len(heading[1])
        out.append(f'<h{level}>{inline(heading[2])}</h{level}>')
    elif numbered:
        out.append('<h3>' + inline(line) + '</h3>')
    else:
        out.append('<p>' + inline(line) + '</p>')
    i += 1

result = '\n'.join(out)
a, b = result.index('<p>Maturity:'), result.index('<p>This study')
metadata = result[a:b]
result = result[:a] + result[b:]
a, b = result.index('<p>Working artifact:'), result.index('<h2>Original process proposal')
metadata += result[a:b]
metadata = re.sub(r'<p>Canonical online study:.*?</p>', '<p>Canonical study: <a href="?study=process">this study room</a>. Publication verification is recorded in the repository study record.</p>', metadata)
result = result[:a] + '<details class="study-context"><summary>Sources and study context</summary>' + metadata + '</details>\n' + result[b:]
assert 'href="https://chatgpt.com/space/page_d1cd857933e081919b3188485df97f3e"' in result
assert 'href="https://abbies-game-oracle.vercel.app"' in result
assert '<ol>' in result and result.count('<table>') == 10
assert not re.search(r'\[[^\]]+\]\([^)]+\)|`|\t', result)
DEST.write_text(result + '\n', encoding='utf8')
print('Process study: complete links, 10 tables, ordered list and inline markup verified.')
