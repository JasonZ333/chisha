import sys, zipfile
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

src = sys.argv[1]
out = sys.argv[2]
doc = Document(src)

body = doc.element.body
lines = []

def para_text(p):
    return p.text

for child in body.iterchildren():
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p = Paragraph(child, doc)
        style = p.style.name if p.style is not None else ''
        t = p.text
        if t.strip():
            prefix = f'[{style}] ' if style and style != 'Normal' else ''
            lines.append(prefix + t)
        elif p._p.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip') or p._p.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}drawing'):
            lines.append('[IMAGE]')
    elif tag == 'tbl':
        tbl = Table(child, doc)
        lines.append('--- TABLE ---')
        for row in tbl.rows:
            cells = []
            for c in row.cells:
                cells.append(' / '.join(x.text.strip() for x in c.paragraphs if x.text.strip()))
            lines.append(' | '.join(cells))
        lines.append('--- END TABLE ---')

text = '\n'.join(lines)

with zipfile.ZipFile(src) as z:
    media = [n for n in z.namelist() if n.startswith('word/media/')]

header = f'== SOURCE: {src}\n== paragraphs+blocks: {len(lines)}  images: {len(media)} {media}\n== SECTIONS: {len(doc.sections)}\n\n'
with open(out, 'w', encoding='utf-8') as f:
    f.write(header + text)
print('wrote', out, len(text), 'chars')
