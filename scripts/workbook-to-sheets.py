"""Turn Dr. Salah's Murphy's sign workbook into study-sheet entries, word for word.

Each examiner question (Q1-Q13, plus the Overview) becomes one entry whose answer is written in the
small study-sheet markup the site renders (see src/pages/archive/StudySheet.tsx). No wording is
changed: bullets become list items, headings become section titles or callouts, tables stay tables.

usage: python3 scripts/workbook-to-sheets.py <workbook.xlsx> <out.json>
"""
import json
import re
import sys

import openpyxl

DOCTOR = 'salah'
TOPIC = 'gallbladder-biliary-tract'
SOURCE = "Dr. Salah — Gallbladder & Murphy's Sign OSCE workbook"

# callout kinds for row headings the workbook uses
CALLOUT = {
    'definition': 'definition',
    'important': 'important',
    'important distinction': 'important',
    'remember': 'remember',
    'osce tip': 'tip',
    'what to tell the examiner': 'say',
    'reference': 'reference',
    '⭐ 30-second answer to impress the examiner': 'pearl',
    'three numbers/facts to remember': 'remember',
}

# the supplied clinical photographs, placed where the answers describe them
PHOTOS = {
    'murphy-technique': {
        'after_step': 3,
        'md': '![Palpating beneath the right costal margin over the gallbladder: the examining fingers hook under the rib edge while the patient breathes in.](/clinical/murphy-palpation.jpg)',
    },
    'murphy-covered': {
        'md': '![Examining the right upper quadrant with the abdomen kept covered by a sheet.](/clinical/murphy-through-sheet.png)',
    },
    'boas-sign': {
        'md': "![Boas' sign. A: the right infrascapular region. B: pointing to the area below the right scapula where hyperaesthesia or tenderness is sought.](/clinical/boas-sign.jpg)",
    },
}


def text(v):
    return '' if v is None else str(v).strip()


def body(s):
    """Cell text to markup: '• ' bullets become '- ' list items; everything else is kept."""
    out = []
    for line in s.split('\n'):
        t = line.rstrip()
        if t.lstrip().startswith('•'):
            out.append('- ' + t.lstrip()[1:].strip())
        else:
            out.append(t)
    return '\n'.join(out).strip()


def callout(kind, title, content):
    return f':::{kind} {title}\n{body(content)}\n:::'


def section(heading, content):
    kind = CALLOUT.get(heading.lower())
    if kind:
        return callout(kind, heading, content)
    return f'### {heading}\n\n{body(content)}'


def table(head, rows):
    esc = lambda c: body(c).replace('\n', '<br>').replace('|', '\\|')
    lines = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    lines += ['| ' + ' | '.join(esc(c) for c in r) + ' |' for r in rows]
    return '\n'.join(lines)


HEADERS = {'Item', 'Details', 'Step', 'Heading', 'Question', 'Category', 'Section', 'Finding / Investigation', 'Plain X-ray / Notes', 'Answer', '#', 'Source', 'Useful for'}


def rows(ws, start=2):
    """Data rows: everything after the title, skipping the column-header row."""
    for r in ws.iter_rows(min_row=start, values_only=True):
        vals = [text(v) for v in r]
        if not any(vals):
            continue
        if all(v in HEADERS for v in vals if v):
            continue
        yield vals


def entry(sort, eid, title, parts, qtype='viva'):
    return {
        'id': eid,
        'title': title,
        'type': qtype,
        'model_answer': '\n\n'.join(p for p in parts if p),
        'source': SOURCE,
        'sort': sort,
        'doctor': DOCTOR,
        'topic': TOPIC,
    }


def main(path, out_path):
    wb = openpyxl.load_workbook(path)
    out = []

    # Overview
    ws = wb['Overview']
    parts = [f'## {text(ws["A1"].value)}']
    for item, details, *_ in rows(ws):
        if item.lower() == 'sheet guide':
            parts.append('### Sheet guide\n\n' + '\n'.join(f'- {x.strip()}' for x in details.split('|')))
        else:
            parts.append(section(item, details))
    out.append(entry(0, 'gb-overview', 'Overview — Gallbladder & Murphy\'s sign', parts, 'other'))

    # Q1 technique
    ws = wb["Murphy's Technique"]
    parts = []
    for step, heading, details in rows(ws):
        if step.isdigit():
            parts.append(f':::step {step} {heading}\n{body(details)}\n:::')
            if int(step) == PHOTOS['murphy-technique']['after_step']:
                parts.append(PHOTOS['murphy-technique']['md'])
        elif step:
            # a row like "Definition | <text>" has its text in column B
            parts.append(section(step, heading if not details else details))
        elif heading:
            parts.append(section(heading, details))
    out.append(entry(1, 'murphy-technique', text(ws['A1'].value), parts, 'station'))

    # Q2-Q6: one entry per question
    ws = wb['Murphy Variations']
    groups, cur = [], None
    for q, heading, details in rows(ws):
        if q:
            cur = {'title': q, 'parts': []}
            groups.append(cur)
        cur['parts'].append(section(heading, details))
    group_title = text(ws['A1'].value)
    for g in groups:
        g['parts'].insert(0, f':::group\n{group_title}\n:::')
    ids = ['murphy-covered', 'murphy-finger-placement', 'murphy-which-hand', 'murphy-instruction', 'murphy-positive']
    for i, (g, eid) in enumerate(zip(groups, ids)):
        if eid in PHOTOS:
            g['parts'].insert(2, PHOTOS[eid]['md'])
        out.append(entry(2 + i, eid, g['title'], g['parts']))

    # Q7-Q8
    ws = wb['Other Signs']
    groups, cur = [], None
    for q, heading, details in rows(ws):
        if q:
            cur = {'title': q, 'parts': []}
            groups.append(cur)
        cur['parts'].append(section(heading, details))
    group_title = text(ws['A1'].value)
    for g in groups:
        g['parts'].insert(0, f':::group\n{group_title}\n:::')
    for i, (g, eid) in enumerate(zip(groups, ['other-signs', 'boas-sign'])):
        if eid in PHOTOS:
            g['parts'].insert(2, PHOTOS[eid]['md'])
        out.append(entry(7 + i, eid, g['title'], g['parts']))

    # Q9 clinical findings: history and investigations as sections, examination as a table
    ws = wb['Clinical Findings']
    parts, exam, cur_section = [], [], None
    for sec, finding, details in rows(ws):
        if sec:
            cur_section = sec
            parts.append(f'## {sec}')
        if cur_section.startswith('B.'):
            exam.append([finding, details])
            continue
        parts.append(section(finding, details))
    i = parts.index('## B. Physical examination')
    parts.insert(i + 1, table(['Finding', 'Details'], exam))
    out.append(entry(9, 'acute-cholecystitis-findings', text(ws['A1'].value), parts, 'case'))

    # Q10-Q11 X-ray
    ws = wb['X-ray Findings']
    data = list(rows(ws))
    q10, q11 = [], []
    target = q10
    k = 0
    while k < len(data):
        item, details, notes = data[k]
        if item.startswith('Q11'):
            target = q11
            title11 = item
            target.append(callout('pearl', 'Answer', details))
            if notes:
                target.append(callout('say', 'Exam answer', notes.replace('Exam answer: ', '', 1)))
        elif item.startswith('Q10'):
            title10 = item
            target.append(body(details))
        elif item.startswith('Types of gallstones'):
            head = [item, details, notes]
            trs = [r for r in data[k + 1 :]]
            target.append(table(head, trs))
            break
        else:
            if item.lower() == 'important':
                target.append(callout('important', item, details))
            else:
                target.append(section(item, details))
            if notes:
                kind = 'reference' if notes.lower().startswith(('reference', 'source')) else 'note'
                target.append(callout(kind, 'Reference' if kind == 'reference' else 'Note', notes))
        k += 1
    xg = f':::group\n{text(ws["A1"].value)}\n:::'
    q10.insert(0, xg)
    q11.insert(0, xg)
    out.append(entry(10, 'xray-cholecystitis', title10, q10))
    out.append(entry(11, 'gallstones-on-xray', title11, q11))

    # Q12 examiner Q&A
    ws = wb['Examiner Q&A']
    out.append(entry(12, 'gb-examiner-qa', text(ws['A1'].value), [table(['Question', 'Answer'], list(rows(ws)))]))

    # Q13 references
    ws = wb['References']
    out.append(entry(13, 'gb-references', text(ws['A1'].value), [table(['#', 'Source', 'Useful for'], list(rows(ws)))], 'other'))

    # nothing may be lost: every word of every cell must appear in the entries
    corpus = ' '.join(e['title'] + ' ' + e['model_answer'] for e in out)
    norm = lambda s: re.sub(r'\s+', ' ', s.replace('•', '').replace('<br>', ' ').replace('\\|', '|')).strip()
    corpus_n = norm(corpus)
    missing = []
    for ws in wb.worksheets:
        for r in ws.iter_rows(values_only=True):
            for v in r:
                for piece in re.split(r'[\n|]', text(v)):
                    p = norm(piece)
                    if p and p not in corpus_n and p.replace('Exam answer: ', '') not in corpus_n:
                        missing.append((ws.title, p))
    missing = [m for m in missing if m[1] not in HEADERS]
    json.dump(out, open(out_path, 'w'), ensure_ascii=False, indent=1)
    print(len(out), 'entries;', 'missing:', missing or 'none')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
