"""Convert OSCE workbooks into study-sheet entries, word for word, with a completeness check.

Each workbook becomes one topic. Each worksheet becomes one entry, or several when it holds several
numbered examiner questions. Cell text is never reworded: bullets become list items, labelled rows
become headings or boxed notes, short pairs become tables. Researched illustrations (verified on
Wikimedia Commons, see scripts/commons-images.json) are placed after the section they illustrate and
marked as added material.

usage: python3 scripts/import-workbooks.py <config.json> <images.json> <out.json> <report.json>
"""
import json
import re
import sys

import openpyxl

HEADERS = {'Item', 'Details', 'Step', 'Heading', 'Question', 'Category', 'Section', 'Finding / Investigation', 'Plain X-ray / Notes',
           'Answer', '#', 'Source', 'Useful for', 'Layer', 'Origin', 'Main function', 'Site', 'Frequency / Clinical importance',
           'Strategy', 'Stage', 'Description', 'Manoeuvre', 'Group', 'Subgroup', 'Causes', 'Feature', 'Spleen', 'Kidney', 'Notes',
           'Mode', 'Sign / Finding', 'Grade', 'Type', 'Complications', "Examiner's question", 'Essential answer'}

CALLOUTS = [
    (r'^definition\b|– definition', 'definition'),
    (r'^(exam pearl|key point|crucial viva point)', 'pearl'),
    (r'^remember\b|^how to remember', 'remember'),
    (r'^important\b|^one critical point|^important distinction|^important viva distinction|^important surgical precautions', 'important'),
    (r'^(viva distinction|viva answer to memorize|osce tip|exam question|examiner question|examiner follow-up|additional viva question)', 'tip'),
    (r'^(note|update|context)$', 'note'),
    (r'^references?$', 'reference'),
]


def kind_of(label):
    low = label.lower().strip()
    for pat, kind in CALLOUTS:
        if re.search(pat, low):
            return kind
    return None


def text(v):
    return '' if v is None else str(v).strip()


def body(s):
    out = []
    for line in s.split('\n'):
        t = line.rstrip()
        out.append('- ' + t.lstrip()[1:].strip() if t.lstrip().startswith('•') else t)
    return '\n'.join(out).strip()


def callout(kind, title, content):
    return f':::{kind} {title}\n{body(content)}\n:::'


def section(label, content, level='###'):
    if not content:
        return f'{level} {label}'
    m = re.match(r'^Step (\d+)\s*[–:\-]\s*(.+)$', label)
    if m:
        return f':::step {m.group(1)} {m.group(2)}\n{body(content)}\n:::'
    k = kind_of(label)
    if k:
        return callout(k, label, content)
    return f'{level} {label}\n\n{body(content)}'


def cell_table(head, rows):
    esc = lambda c: body(c).replace('\n', '<br>').replace('|', '\\|')
    lines = ['| ' + ' | '.join(esc(h) for h in head) + ' |', '|' + '---|' * len(head)]
    lines += ['| ' + ' | '.join(esc(c) for c in r) + ' |' for r in rows]
    return '\n'.join(lines)


def short(*cells):
    return all(len(c) < 95 and '\n' not in c for c in cells)


def data_rows(ws):
    width = ws.max_column
    header = None
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        vals = [text(v) for v in r][:width]
        vals += [''] * (width - len(vals))
        if not any(vals):
            continue
        if header is None and all(v in HEADERS for v in vals if v):
            header = vals
            continue
        rows.append(vals)
    return header or [''] * width, rows


def figure(img):
    attrs = '; '.join(f'{k}={img[k]}' for k in ('page', 'credit', 'license', 'licenseUrl') if img.get(k))
    src = img['image'].split('?')[0]
    return f'![{img["caption"]}]({src}){{{attrs}; added=yes}}'


report_flags = []


def convert_sheet(ws, cfg, images):
    """Returns a list of (title, parts) for the entries this sheet holds."""
    title = text(ws['A1'].value)
    header, rows = data_rows(ws)
    mode = cfg.get('mode', 'sections')
    split = re.compile(cfg['split']) if cfg.get('split') else None
    place = {p['after']: images[p['image']] for p in cfg.get('images', [])}
    entries = [[title, []]]
    if split:
        entries[0][1].append(f':::group\n{title}\n:::')

    def emit(part, label=''):
        entries[-1][1].append(part)
        for key, img in place.items():
            if label and label.startswith(key):
                entries[-1][1].append(figure(img))

    if mode == 'table':
        table_rows, after = [], []
        for r in rows:
            cells = [c for c in r]
            lab = cells[0]
            if kind_of(lab) and (lab.lower().startswith(('note', 'update', 'reference', 'exam pearl', 'important'))):
                (after if table_rows else entries[-1][1]).append(section(lab, next((c for c in cells[1:] if c), '')))
            else:
                table_rows.append(cells)
        used = max((max((i for i, c in enumerate(r) if c), default=0) for r in table_rows), default=0) + 1
        head = header[:used] if any(header[:used]) else [''] * used
        entries[-1][1].append(cell_table(head, [r[:used] for r in table_rows]))
        entries[-1][1].extend(after)
        for key, img in place.items():
            if key == '*end*':
                entries[-1][1].append(figure(img))
        return entries

    group = None
    pairs = []  # pending short (label, value) rows under a group, rendered as a table when the group closes

    def close_group():
        nonlocal pairs
        if not pairs:
            return
        if all(short(a, b) for a, b in pairs) and len(pairs) > 2:
            emit(cell_table(cfg.get('pairHeader') or ([h for h in header[1:3]] if any(header[1:3]) else ['', '']), pairs))
        else:
            for a, b in pairs:
                emit(section(a, b), a)
        pairs = []

    width = len(header)
    for r in rows:
        a = r[0]
        rest = r[1:]
        # a numbered examiner question starts a new entry
        if split and a and split.match(a):
            close_group()
            group = None
            qtitle, extra = cfg.get('rename', {}).get(a, a), None
            m = re.match(r'^(.*?)\s+–\s+(Definition.*)$', a)
            if m:
                qtitle, extra = m.group(1), m.group(2)
            entries.append([qtitle, [f':::group\n{title}\n:::']])
            content = '\n\n'.join(c for c in rest if c)
            if cfg.get('pairHeader') and len([c for c in rest if c]) > 1:
                content = [c for c in rest if c][-1]  # the other cell is the column title of the table that follows
            if a in cfg.get('rename', {}):
                report_flags.append(f'Title of "{a}" ({ws.title}) shown as "{qtitle}", from the sheet title; the original label is kept below it.')
                entries[-1][1].append(f'### {a}')
            if content:
                emit(callout('definition', extra, content) if extra else body(content), a)
            continue

        if width >= 4:
            b, c, d = (rest + ['', '', ''])[:3]
            if b and c and d:
                emit(f'### {a}\n\n**{header[1]}:** {b} · **{header[2]}:** {c}\n\n{body(d)}', a)
            else:
                emit(section(a, d or c or b), a)
            continue

        if width == 3 and cfg.get('columns') == 'field':
            b, c = rest[0], rest[1]
            if a and b and c and short(b):
                close_group()
                emit(f'### {a}\n\n**{header[1]}:** {b}\n\n{body(c)}', a)
                continue
            if a and b and not c:
                pairs.append((a, b))
                continue
            close_group()
            emit(section(a, c or b), a)
            continue

        if width == 3:
            b, c = rest[0], rest[1]
            if a and re.match(r'^(Comparison|Feature)$', a):
                close_group()
                group = ('table', [a, b, c], [])
                continue
            if group and group[0] == 'table':
                if a and b and c and short(a, b, c):
                    group[2].append([a, b, c])
                    continue
                emit(cell_table(group[1], group[2]))
                group = None
            if a and b and c:
                if re.match(r'^[A-H]\. ', a) or header[1] in ('Item', 'Sign / Finding', 'Subgroup', 'Finding / Investigation') or True:
                    close_group()
                    if header[2] == 'Notes':
                        emit(section(a, b), a)
                        emit(callout('note', 'Note', c))
                        group = None
                        continue
                    emit(f'## {a}')
                    group = a
                    pairs.append((b, c))
                continue
            if not a and b and c:
                pairs.append((b, c))
                continue
            close_group()
            group = None
            if a and c and not b:
                emit(section(a, c, '##' if re.match(r'^[A-H]\. ', a) else '###'), a)
            elif a and b and not c:
                pairs.append((a, b))
            elif a:
                emit(section(a, b or c), a)
            continue

        # two columns
        b = rest[0] if rest else ''
        if a == 'Sheet guide':
            emit('### Sheet guide\n\n' + '\n'.join(f'- {x.strip()}' for x in b.split('|')))
        elif a:
            emit(section(a, b), a)
        elif b:
            emit(body(b))
    close_group()
    if group and group[0] == 'table':
        emit(cell_table(group[1], group[2]))
    for key, img in place.items():
        if key == '*end*':
            entries[-1][1].append(figure(img))
    return [e for e in entries if e[1] and not (len(e[1]) == 1 and e[1][0].startswith(':::group'))]


def slug(s, n=48):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:n].rstrip('-')


def main(cfg_path, img_path, out_path, report_path):
    cfg = json.load(open(cfg_path))
    images = {i['id']: i for i in json.load(open(img_path))}
    out, report = [], {'files': [], 'missing': {}, 'flags': cfg.get('flags', [])}
    for wbc in cfg['workbooks']:
        wb = openpyxl.load_workbook(wbc['file'])
        sort = 0
        seen = set()
        for ws in wb.worksheets:
            scfg = wbc.get('sheets', {}).get(ws.title, {})
            if ws.title == 'Overview':
                header, rows = data_rows(ws)
                a1 = text(ws['A1'].value)
                parts = [f'## {a1}'] + [section(r[0], r[1]) if r[0] != 'Sheet guide' else '### Sheet guide\n\n' + '\n'.join(f'- {x.strip()}' for x in r[1].split('|')) for r in rows]
                entries = [[wbc['overview_title'], parts]]
                qtype = 'other'
            else:
                entries = convert_sheet(ws, scfg, images)
                qtype = scfg.get('type', 'viva')
            for t, parts in entries:
                eid = f"{wbc['prefix']}-{slug(t)}"
                while eid in seen:
                    eid += '-2'
                seen.add(eid)
                out.append({'id': eid, 'title': t, 'type': qtype, 'model_answer': '\n\n'.join(parts), 'source': wbc['source'],
                            'sort': sort, 'doctor': wbc['doctor'], 'topic': wbc['topic'], 'topicName': wbc['topicName'], 'workbook': wbc['file'].split('/')[-1], 'sheet': ws.title})
                sort += 1

        # completeness: every piece of every cell must appear in this workbook's entries
        mine = [e for e in out if e['workbook'] == wbc['file'].split('/')[-1]]
        corpus = re.sub(r'\s+', ' ', ' '.join(e['title'] + ' ' + e['model_answer'] for e in mine).replace('<br>', ' ').replace('\\|', '|'))
        missing = []
        for ws in wb.worksheets:
            for r in ws.iter_rows(values_only=True):
                for v in r:
                    for piece in re.split(r'[\n|]', text(v)):
                        p = re.sub(r'\s+', ' ', piece.replace('•', '')).strip()
                        if not p or p in HEADERS or p in corpus:
                            continue
                        # labels the sheet turns into structure: "Step 3 – X" becomes step block 3 titled X,
                        # "Topic – Definition…" becomes the title Topic plus a definition box titled Definition…
                        st = re.match(r'^Step (\d+)\s*[–:\-]\s*(.+)$', p)
                        if st and f':::step {st.group(1)} {st.group(2)}' in corpus:
                            continue
                        df = re.match(r'^(.*?)\s+–\s+(Definition.*)$', p)
                        if df and df.group(1) in corpus and f':::definition {df.group(2)}' in corpus:
                            continue
                        missing.append(f'{ws.title}: {p}')
        report['missing'][wbc['file'].split('/')[-1]] = missing
        report['files'].append({'file': wbc['file'].split('/')[-1], 'sheets': len(wb.worksheets), 'entries': len(mine), 'topic': wbc['topicName'], 'specialty': wbc['specialty'], 'doctor': wbc['doctor'],
                                'images': sum(e['model_answer'].count('added=yes') for e in mine), 'references': sum(e['model_answer'].count(':::reference') for e in mine) + sum(1 for e in mine if e['sheet'] == 'References')})
    json.dump(out, open(out_path, 'w'), ensure_ascii=False, indent=1)
    report['flags'] = report['flags'] + report_flags
    json.dump(report, open(report_path, 'w'), ensure_ascii=False, indent=1)
    for f in report['files']:
        print(f, 'missing:', len(report['missing'][f['file']]))
        for m in report['missing'][f['file']][:12]:
            print('   MISSING', m)


if __name__ == '__main__':
    main(*sys.argv[1:5])
