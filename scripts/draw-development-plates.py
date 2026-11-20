"""Draws the developmental milestone plates (original vintage ink line art) used by the Paediatrics
"Developmental assessment" approach. Each plate is a 2 x 2 grid of panels; the red-flag card is a list.
Run: python3 scripts/draw-development-plates.py public/illustrations/development"""
import math, os, sys

OUT = sys.argv[1]
INK = '#2b3a52'
SEPIA = '#8a6a3a'
RED = '#8e3b3b'
PAPER = '#fbf6ea'
FONT = "Georgia, 'Times New Roman', serif"
W, PW, PH = 800, 400, 330  # plate width, panel width, panel height

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

class Panel:
    def __init__(self):
        self.parts = []
    def add(self, s):
        self.parts.append(s)
    # primitives
    def line(self, *pts, w=7, c=INK):
        d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
        self.add(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    def curve(self, d, w=7, c=INK, fill='none'):
        self.add(f'<path d="{d}" fill="{fill}" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    def head(self, x, y, r=24, look=1, face=True):
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>')
        if face:
            ex = x + look * r * 0.35
            self.add(f'<circle cx="{ex:.1f}" cy="{y - r*0.12:.1f}" r="2.8" fill="{INK}"/>')
            self.add(f'<path d="M{ex - look*6:.1f},{y + r*0.32:.1f} q{look*5:.1f},5 {look*10:.1f},0" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>')
        # a wisp of hair
        self.add(f'<path d="M{x - r*0.2:.1f},{y - r:.1f} q{r*0.25:.1f},{-r*0.35:.1f} {r*0.5:.1f},{-r*0.1:.1f}" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>')
    def torso(self, x1, y1, x2, y2, w=38):
        # an outlined capsule from (x1,y1) to (x2,y2)
        self.add(f'<path d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke="{INK}" stroke-width="{w + 10}" stroke-linecap="round"/>')
        self.add(f'<path d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke="{PAPER}" stroke-width="{w}" stroke-linecap="round"/>')
    def ground(self, y=232, x1=40, x2=360):
        self.add(f'<path d="M{x1},{y} L{x2},{y}" stroke="{SEPIA}" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>')
    def text(self, x, y, s, size=30, weight='normal', c=INK, anchor='middle', style='normal'):
        self.add(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" font-style="{style}" fill="{c}" text-anchor="{anchor}">{esc(s)}</text>')
    def labels(self, age, what, what2=None):
        self.text(200, 274, age, size=34, weight='bold', c=RED)
        self.text(200, 306, what, size=24)
        if what2:
            self.text(200, 330, what2, size=24)

def plate(name, title, panels):
    rows = math.ceil(len(panels) / 2)
    H = 70 + rows * (PH + 24)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{esc(title)}">',
           f'<title>{esc(title)}</title>',
           f'<text x="{W/2}" y="44" font-family="{FONT}" font-size="34" font-style="italic" fill="{SEPIA}" text-anchor="middle">{esc(title)}</text>']
    for i, p in enumerate(panels):
        cx, cy = (i % 2) * PW, 70 + (i // 2) * (PH + 24)
        out.append(f'<g transform="translate({cx},{cy})">')
        out.append(f'<rect x="10" y="4" width="{PW-20}" height="{PH+10}" rx="6" fill="none" stroke="{SEPIA}" stroke-width="1.5" opacity="0.55"/>')
        out.extend(p.parts)
        out.append('</g>')
    out.append('</svg>')
    with open(os.path.join(OUT, name), 'w') as f:
        f.write('\n'.join(out))

# ───────────── gross motor, birth to 9 months ─────────────

def prone_6w():
    p = Panel(); p.ground()
    p.torso(132, 206, 236, 206)                  # lying on tummy
    p.line((112, 210), (86, 222), (62, 228))       # legs out behind the body
    p.line((114, 214), (94, 226))
    p.line((232, 216), (262, 228))                 # arm tucked forward
    p.head(272, 182, r=29, look=1)                 # head lifted a little
    p.curve('M292,140 a44,44 0 0 1 26,34', w=2.5, c=SEPIA)  # arc: a brief lift
    p.labels('6 weeks', 'On tummy: lifts head briefly')
    return p

def prone_3m():
    p = Panel(); p.ground()
    p.torso(132, 214, 230, 170)                  # chest raised
    p.line((112, 220), (84, 228), (60, 230))
    p.line((116, 224), (92, 230))
    p.line((226, 180), (244, 222), (292, 226))   # weight on the forearms
    p.head(250, 136, r=29, look=1)
    p.labels('3-4 months', 'Weight on forearms, head up;', 'steady head control')
    return p

def sit_supported_6m():
    p = Panel(); p.ground()
    p.line((182, 220), (232, 200), (280, 228), w=8)   # leg: thigh up to the knee, shin down to the foot
    p.torso(176, 210, 210, 146)                       # leaning forward
    p.line((208, 158), (236, 190), (250, 228))        # tripod: hand on the floor in front
    p.head(226, 108, r=29, look=1)
    p.labels('6 months', 'Sits with support (tripod);', 'rolls front to back')
    return p

def crawl_9m():
    p = Panel(); p.ground()
    p.torso(140, 168, 244, 160)                  # body level
    p.line((146, 174), (146, 226), (110, 228))   # thighs down, shins back along the floor
    p.line((160, 176), (164, 226), (130, 228))
    p.line((240, 168), (248, 226))               # arms straight
    p.line((228, 170), (230, 226))
    p.head(280, 134, r=29, look=1)
    p.labels('9 months', 'Sits without support;', 'crawls on hands and knees')
    return p

def standing(p, x, top=78, legs=None, arms=None, look=1, r=26):
    p.head(x, top, r=r, look=look)
    p.torso(x, top + r + 18, x, top + r + 66)
    (legs or (lambda: (p.line((x - 8, top + r + 82), (x - 16, 228)), p.line((x + 8, top + r + 82), (x + 16, 228)))))()
    if arms: arms()

def cruise_10m():
    p = Panel(); p.ground()
    p.add(f'<rect x="210" y="132" width="140" height="16" rx="3" fill="{PAPER}" stroke="{SEPIA}" stroke-width="4"/>')
    p.line((222, 148), (222, 230), w=4, c=SEPIA); p.line((338, 148), (338, 230), w=4, c=SEPIA)
    standing(p, 160, top=70, arms=lambda: (p.line((184, 124), (214, 138)), p.line((184, 134), (220, 146))))
    p.labels('10 months', 'Pulls to stand;', 'cruises holding furniture')
    return p

def walk_12m():
    p = Panel(); p.ground()
    x = 200
    standing(p, x, top=72,
             legs=lambda: (p.line((x - 10, 180), (x - 34, 228)), p.line((x + 10, 180), (x + 34, 228))),
             arms=lambda: (p.line((x - 24, 126), (x - 52, 110), (x - 62, 86)), p.line((x + 24, 126), (x + 52, 110), (x + 62, 86))))
    p.labels('12-15 months', 'Walks alone: wide steps,', 'arms held up for balance')
    return p

def run_kick_2y():
    p = Panel(); p.ground()
    x = 170
    standing(p, x, top=70,
             legs=lambda: (p.line((x - 6, 178), (x - 12, 228)), p.line((x + 8, 178), (x + 40, 200), (x + 70, 214))),
             arms=lambda: (p.line((x - 24, 124), (x - 48, 150)), p.line((x + 24, 124), (x + 46, 108))))
    p.add(f'<circle cx="276" cy="210" r="20" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>')
    p.curve('M262,198 q14,10 28,0 M262,222 q14,-10 28,0', w=2.5)
    p.curve('M300,196 l22,-8 M302,210 l26,0 M300,224 l22,8', w=2.5, c=SEPIA)
    p.labels('2 years', 'Runs; kicks a ball;', 'walks up stairs two feet a step')
    return p

def hop_4y():
    p = Panel(); p.ground()
    x = 200
    standing(p, x, top=62,
             legs=lambda: (p.line((x - 6, 170), (x - 8, 210)), p.line((x + 8, 170), (x + 30, 196), (x + 52, 176))),
             arms=lambda: (p.line((x - 24, 116), (x - 66, 126)), p.line((x + 24, 116), (x + 66, 106))))
    p.curve(f'M{x - 30},224 q30,-10 60,0', w=2.5, c=SEPIA)   # little bounce mark
    p.labels('3-4 years', '3: stairs one foot per step;', '4: hops on one foot')
    return p

# ───────────── fine motor ─────────────

def cube(p, x, y, s=34):
    p.add(f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>')
    p.add(f'<path d="M{x},{y} l{s*0.25},{-s*0.25} h{s} v{s} l{-s*0.25},{s*0.25}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    p.add(f'<path d="M{x+s},{y} l{s*0.25},{-s*0.25}" stroke="{INK}" stroke-width="3"/>')

def palmar():
    p = Panel()
    cube(p, 168, 150, 66)
    p.torso(150, 120, 236, 120, w=40)                 # back of the hand, over the block
    p.line((136, 112), (88, 84), w=6); p.line((140, 132), (92, 108), w=6)   # wrist and forearm
    for fx in (176, 194, 212, 230):                   # four fingers curled down over the front
        p.torso(fx, 136, fx, 178, w=12)
    p.torso(154, 140, 160, 186, w=13)                 # thumb alongside, not opposed
    p.labels('6 months', 'Palmar grasp: whole hand;', 'passes a toy hand to hand')
    return p

def pincer():
    p = Panel()
    p.line((98, 128), (52, 112), w=6); p.line((104, 172), (56, 168), w=6)   # wrist and forearm
    p.add(f'<ellipse cx="146" cy="152" rx="56" ry="44" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>')   # the fist
    for k, fy in enumerate((150, 166, 182)):          # the other fingers, curled in
        p.curve(f'M{170 + k*4},{fy - 10} q18,4 16,16', w=3.5)
    p.torso(186, 124, 246, 164, w=14)                 # index finger
    p.torso(184, 184, 244, 176, w=15)                 # thumb
    p.add(f'<circle cx="258" cy="171" r="7" fill="{RED}"/>')   # a raisin between the tips
    p.labels('9-12 months', '9: immature pincer;', '12: neat pincer grip')
    return p

def towers():
    p = Panel()
    for col, (n, age) in enumerate(((3, '18 months'), (6, '2 years'), (9, '3 years'))):
        x = 70 + col * 110
        for k in range(n):
            p.add(f'<rect x="{x}" y="{200 - (k + 1) * 15}" width="40" height="15" fill="{PAPER}" stroke="{INK}" stroke-width="3.5"/>')
        p.text(x + 20, 226, age, size=20, c=SEPIA)
    p.labels('Tower of bricks', '3 bricks at 18 months,', '6 at 2 years, 9 at 3 years')
    return p

def shapes():
    p = Panel()
    items = [('line', '2 y'), ('circle', '3 y'), ('cross', '4 y'), ('square', '4½ y'), ('triangle', '5 y')]
    for k, (shape, age) in enumerate(items):
        x = 56 + k * 72
        if shape == 'line': p.line((x, 130), (x, 200), w=5)
        if shape == 'circle': p.add(f'<circle cx="{x}" cy="165" r="30" fill="none" stroke="{INK}" stroke-width="5"/>')
        if shape == 'cross': p.line((x, 135), (x, 195), w=5); p.line((x - 30, 165), (x + 30, 165), w=5)
        if shape == 'square': p.add(f'<rect x="{x-28}" y="137" width="56" height="56" fill="none" stroke="{INK}" stroke-width="5"/>')
        if shape == 'triangle': p.curve(f'M{x},134 L{x+32},196 L{x-32},196 Z', w=5)
        p.text(x, 232, age, size=22, c=SEPIA)
    p.labels('Copying shapes', 'Scribbles at 15-18 months, then', 'line, circle, cross, square, triangle')
    return p

# ───────────── primitive reflexes ─────────────

def supine(p, x1=110, x2=250, y=196):
    p.torso(x1, y, x2, y)

def moro():
    p = Panel(); p.ground(y=226)
    p.torso(126, 200, 246, 200)
    p.head(282, 188, r=28, look=1)
    p.line((238, 176), (220, 130), (204, 96))        # arms flung up and out
    p.line((222, 176), (188, 134), (160, 104))
    for (hx, hy) in ((204, 96), (160, 104)):
        for a in (-40, -10, 20):
            r = math.radians(a - 90)
            p.line((hx, hy), (hx + 14 * math.cos(r), hy + 14 * math.sin(r)), w=3)
    p.line((104, 194), (84, 160), (62, 180))          # legs flexed, from the hips
    p.line((106, 204), (92, 172), (70, 198))
    p.labels('Moro', 'Arms fling out, then together.', 'Gone by 6 months')
    return p

def grasp():
    p = Panel()
    # the adult's finger coming in from the right, with its nail
    p.torso(110, 132, 340, 132, w=30)
    p.add(f'<rect x="312" y="121" width="22" height="22" rx="9" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>')
    p.curve('M150,120 q6,12 0,24 M180,120 q6,12 0,24', w=2.5, c=SEPIA)   # knuckle creases
    # the baby's forearm and sleeve, rising from below
    p.torso(150, 238, 186, 186, w=30)
    p.add(f'<path d="M122,228 l46,30 M138,206 l46,30" stroke="{SEPIA}" stroke-width="3" stroke-linecap="round"/>')
    # the palm under the finger
    p.add(f'<ellipse cx="214" cy="168" rx="40" ry="26" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>')
    # four little fingers wrapped over the top of the adult's finger
    for fx in (196, 214, 232, 250):
        p.torso(fx, 166, fx - 4, 112, w=12)
    # the thumb, curled round the other side
    p.torso(184, 160, 196, 134, w=13)
    p.labels('Palmar grasp', 'Finger in the palm: baby grips.', 'Gone by 4-6 months')
    return p

def rooting():
    p = Panel()
    # shoulders and the baby's head in profile, facing left
    p.curve('M200,232 C214,200 262,190 318,210 L330,232', w=6, fill=PAPER)
    p.add(f'<circle cx="250" cy="140" r="56" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>')
    p.curve('M196,138 q-8,6 -2,14', w=4)                         # nose
    p.add(f'<circle cx="222" cy="124" r="3.4" fill="{INK}"/>')    # eye
    p.add(f'<ellipse cx="208" cy="166" rx="9" ry="7" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>')   # open mouth
    p.curve('M276,128 c14,-2 18,24 2,26', w=4)                   # ear
    p.curve('M232,86 q12,-12 26,-4', w=2.6)                       # wisp of hair
    # the adult's finger stroking the cheek near the mouth
    p.torso(60, 196, 182, 178, w=18)
    p.add(f'<rect x="166" y="170" width="16" height="15" rx="6" fill="{PAPER}" stroke="{INK}" stroke-width="3" transform="rotate(-8 174 177)"/>')
    p.curve('M196,192 q8,6 16,4 M190,204 q10,6 20,2', w=2.5, c=SEPIA)   # stroking marks
    # the head turns towards the touch
    p.curve('M296,70 C276,48 232,46 206,66', w=3.5, c=RED)
    p.add(f'<path d="M206,66 l3,-15 M206,66 l15,3" stroke="{RED}" stroke-width="3.5" stroke-linecap="round" fill="none"/>')
    p.labels('Rooting', 'Stroke cheek: turns, opens mouth.', 'Gone by 4 months')
    return p

def atnr():
    p = Panel(); p.ground(y=226)
    p.torso(126, 200, 246, 200)
    p.head(284, 186, r=28, look=1)
    p.line((240, 214), (298, 222), (346, 220))       # arm stretched out on the side the face turns to
    p.line((226, 176), (206, 140), (232, 116))       # other arm bent up by the head
    p.line((104, 206), (60, 216))                    # face-side leg straighter
    p.line((104, 194), (86, 160), (66, 186))         # other leg bent
    p.labels('ATNR', 'Head turned: "fencing" posture.', 'Gone by 6 months')
    return p

def red_flags(name):
    rows = [
        ('8 weeks', 'Not smiling'),
        ('3 months', 'Not fixing and following with the eyes'),
        ('4 months', 'No head control'),
        ('6 months', 'Not reaching for toys'),
        ('9 months', 'Not sitting without support'),
        ('12 months', 'No pincer grip, or a hand preference'),
        ('18 months', 'Not walking (CK in boys); no words'),
        ('2 years', 'Not joining two words'),
        ('Any age', 'Losing skills already gained'),
        ('Over 6 months', 'Primitive reflexes still present'),
    ]
    H = 120 + len(rows) * 58 + 30
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Developmental red flags: limit ages">',
           '<title>Developmental red flags: limit ages</title>',
           f'<rect x="14" y="14" width="{W-28}" height="{H-28}" rx="10" fill="none" stroke="{RED}" stroke-width="2.5"/>',
           f'<rect x="24" y="24" width="{W-48}" height="{H-48}" rx="6" fill="none" stroke="{RED}" stroke-width="1" opacity="0.6"/>',
           f'<text x="{W/2}" y="78" font-family="{FONT}" font-size="38" font-weight="bold" fill="{RED}" text-anchor="middle">Refer if…</text>',
           f'<text x="{W/2}" y="110" font-family="{FONT}" font-size="22" font-style="italic" fill="{SEPIA}" text-anchor="middle">limit ages: most children can do these well before</text>']
    for i, (age, what) in enumerate(rows):
        y = 160 + i * 58
        out.append(f'<path d="M60,{y + 18} L{W-60},{y + 18}" stroke="{SEPIA}" stroke-width="1" stroke-dasharray="2 6" opacity="0.7"/>')
        out.append(f'<text x="70" y="{y + 6}" font-family="{FONT}" font-size="26" font-weight="bold" fill="{RED}">{esc(age)}</text>')
        out.append(f'<text x="290" y="{y + 6}" font-family="{FONT}" font-size="25" fill="{INK}">{esc(what)}</text>')
    out.append('</svg>')
    with open(os.path.join(OUT, name), 'w') as f:
        f.write('\n'.join(out))

plate('gross-motor-0-9-months.svg', 'Gross motor: birth to 9 months', [prone_6w(), prone_3m(), sit_supported_6m(), crawl_9m()])
plate('gross-motor-10-months-4-years.svg', 'Gross motor: 10 months to 4 years', [cruise_10m(), walk_12m(), run_kick_2y(), hop_4y()])
plate('fine-motor.svg', 'Fine motor skills', [palmar(), pincer(), towers(), shapes()])
plate('primitive-reflexes.svg', 'Primitive reflexes', [moro(), grasp(), rooting(), atnr()])
red_flags('red-flags.svg')
print('drawn')
