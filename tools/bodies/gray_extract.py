"""Pull the passages the Bodies study cites out of the Gray's Anatomy (1918) OCR pages that gray_fetch.py caches.

Writes docs/oracle/bodies/sources/gray1918/excerpts.json: each muscle's description paragraph and each joint's
"Movements" paragraph, with the Wikisource scan page it starts on. The text is public domain; the OCR is kept as read
(old Latin names such as Glutæus, a few scanning slips) so a passage can always be checked against its page.
Usage: python3 gray_extract.py [pages_dir]
"""
import re, json, glob, os, sys

PAGES = sys.argv[1] if len(sys.argv) > 1 else '/tmp/gray/pages'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'oracle', 'bodies', 'sources', 'gray1918', 'excerpts.json')
PAGE_URL = 'https://en.wikisource.org/wiki/Page:Anatomy_of_the_Human_Body_(1918).djvu/{}'

MUSCLES = ["Platysma", "Masseter", "Temporalis", "Sternocleidomastoideus", "Scalenus anterior", "Splenius capitis",
           "Sacrospinalis", "Obliquus externus", "Rectus abdominis",
           "Trapezius", "Latissimus dorsi", "Rhomboideus major", "Rhomboideus minor", "Levator scapulae",
           "Pectoralis major", "Pectoralis minor", "Serratus anterior", "Deltoideus", "Subscapularis", "Supraspinatus",
           "Infraspinatus", "Teres minor", "Teres major", "Coracobrachialis", "Biceps brachii", "Brachialis",
           "Triceps brachii", "Pronator teres", "Flexor carpi radialis", "Palmaris longus", "Flexor carpi ulnaris",
           "Flexor digitorum sublimis", "Brachioradialis", "Extensor carpi radialis longus",
           "Extensor carpi radialis brevis", "Extensor digitorum communis", "Extensor carpi ulnaris", "Anconaeus",
           "Abductor pollicis longus",
           "Psoas major", "Iliacus", "Sartorius", "Rectus femoris", "Vastus lateralis", "Vastus medialis", "Gracilis",
           "Pectineus", "Adductor longus", "Adductor magnus", "Glutaeus maximus", "Glutaeus medius", "Glutaeus minimus",
           "Tensor fasciae latae", "Biceps femoris", "Semitendinosus", "Semimembranosus", "Tibialis anterior",
           "Extensor digitorum longus", "Extensor hallucis longus", "Gastrocnemius", "Soleus", "Tibialis posterior",
           "Flexor digitorum longus", "Peronaeus longus", "Peronaeus brevis"]
# muscles whose opening sentence is cut from its "arises" by a figure or a footnote: take the heading on this page
FORCE = {'Glutaeus medius': 474, 'Serratus anterior': 438, 'Tibialis posterior': 485}
# the scan page holding the opening of the Obliquus externus has no OCR text; take its continuation
MANUAL = {'Obliquus externus': 410}
# joint: (scan page of its "Movements" paragraph, first words of that paragraph)
JOINTS = {'temporomandibular': (298, 'The movements permitted in this articulation'), 'atlantooccipital': (296, 'The movements permitted in this joint'),
          'atlantoaxial': (295, 'The opposed articular surfaces'), 'vertebral_column': (291, 'The movements permitted in the vertebral'),
          'sternoclavicular': (314, 'This articulation admits'), 'acromioclavicular': (316, 'The movements of this articulation'),
          'shoulder': (319, 'The shoulder-joint is capable'), 'elbow': (322, 'The elbow-joint comprises'),
          'proximal_radioulnar': (325, 'The movements allowed in this articulation'), 'wrist': (328, 'The movements permitted in this joint'),
          'hand_and_wrist': (330, 'The articulation of the hand and wrist'), 'metacarpophalangeal': (333, 'The movements which occur in these joints'),
          'interphalangeal_hand': (333, 'The only movements permitted'), 'hip': (338, 'The movements of the hip'),
          'knee': (346, 'The movements which take place at the knee'), 'ankle': (351, None),
          'subtalar': (353, 'The movements permitted between the talus'), 'metatarsophalangeal': (359, 'The movements permitted in the metatarsophalangeal')}


def norm(s):
    s = re.sub(r'^\s*(\d+\s+)?[A-Z][A-Z ,.ZÆ\-]{4,}(\s+\d+)?\s*\n', '', s)   # the running head
    s = re.split(r'\n\s*[1-3‘’] [A-Z][a-z]', s)[0]                           # footnotes sit at the foot of the page
    return s.replace('æ', 'ae').replace('Æ', 'Ae').replace('ﬁ', 'fi').replace('ﬂ', 'fl')


def flat(s):
    s = re.sub(r'-\s*\n\s*', '', s)
    s = re.sub(r'\n\s*\d?\s*(Fic|Fig)\.[^\n]*\n', '\n', s)
    s = re.sub(r'(?m)^\s*[A-Z][A-Z ]{6,}\d*\s*$', '', s)                  # running heads mid-text
    return re.sub(r'\s+', ' ', s).strip()


def main():
    P = {int(os.path.basename(f)[:4]): open(f).read() for f in glob.glob(os.path.join(PAGES, '*.txt'))}
    text = lambda pg, k=2: flat('\n'.join(norm(P.get(p, '')) for p in range(pg, pg + k)))
    muscles = {}
    for n in MUSCLES:
        words = [re.escape(w).replace('ae', '(?:ae|æ|ze|zz|z|e)') for w in n.split()]
        pat = re.compile(r'The\s+' + r'\s+'.join(words) + r'\b')
        found = None
        for pg in sorted(p for p in P if 380 <= p <= 560):
            t = norm(P[pg])
            m = next((m for m in pat.finditer(t) if re.search(r'aris|origin|consists of|is inserted', t[m.start():m.start() + 700])), None)
            if not m and FORCE.get(n) == pg:
                m = pat.search(t)
            if m:
                found = (pg, flat(t[m.start():] + '\n' + norm(P.get(pg + 1, ''))))
                break
        if not found and n in MANUAL:
            found = (MANUAL[n], '[...] ' + text(MANUAL[n]))
        if not found:
            print('missing', n); continue
        pg, body = found
        end = re.search(r'(?<=\.)\s+(?:The [A-Z][a-z]+(?: [a-z]+)?(?: \([^)]*\))?(?: \(Fig[^)]*\))? (?:is|arises|consists|lies|has|occupies|covers)|[A-Z][a-z]+ Fascia|Variations\.|Nerves\.|Actions\.)', body[60:])
        body = body[:end.start() + 60] if end else body[:1500]
        muscles[n] = dict(page=pg, url=PAGE_URL.format(pg), text=body[:1800])
    joints = {}
    for j, (pg, start) in JOINTS.items():
        t = text(pg, 2)
        k = t.find('Movements.—' + start) if start else t.find('Movements.—')
        if k < 0:
            k = t.find('Movements')
        body = t[k:]
        end = re.search(r'\s(?:[IVX]+\. |The [A-Z][a-z]+ Ligament|[A-Z][a-z]+ Ligaments? \()', body[40:])
        joints[j] = dict(page=pg, url=PAGE_URL.format(pg), text=(body[:end.start() + 40] if end else body)[:2200])
    json.dump(dict(source="Henry Gray, Anatomy of the Human Body, 20th edition, revised by Warren H. Lewis (Lea & Febiger, 1918). Public domain.",
                   transcription="Wikisource OCR layer of the 1918 scan, read page by page; page numbers are scan pages and link to the page image and text.",
                   muscles=muscles, joints=joints), open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(len(muscles), 'muscles', len(joints), 'joints')


if __name__ == '__main__':
    main()
