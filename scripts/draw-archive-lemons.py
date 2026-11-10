"""Original vintage hand-drawn lemon art for the doctor archive.

Style: navy ink linework drawn over slightly mis-registered flat colour (like an old two-plate print),
stippled peel, veined olive leaves and white star blossoms. Writes:
  argv[1]  archive-sprig.svg   (table-of-contents illustration)
  argv[2]  archive-border.svg  (300 tile, slice 60, for CSS border-image)
"""
import math, random, sys

INK = '#2e3c6b'
LEMON = '#f5c64f'
LEMON_SHADE = '#e3a63a'
LEMON_PULP = '#fbe49c'
LEAF = '#7f8c55'
LEAF_DARK = '#5f6b3d'
PETAL = '#fffbf1'
BAND = '#fbeec9'


def f(v):
    return f'{v:.1f}'


def smooth(pts, closed):
    """Catmull-Rom through pts as a cubic path."""
    n = len(pts)
    if n < 2:
        return ''
    P = (lambda i: pts[i % n]) if closed else (lambda i: pts[max(0, min(n - 1, i))])
    d = f'M{f(pts[0][0])} {f(pts[0][1])}'
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}'
    return d + (' Z' if closed else '')


def adist(a, b):
    d = (a - b) % (2 * math.pi)
    return min(d, 2 * math.pi - d)


def lemon_points(a, b, rng, n=30, scale=1.0):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = a * math.cos(t)
        y = b * math.sin(t) * (1 + 0.05 * math.cos(t))
        tip = math.exp(-(adist(t, 0) / 0.2) ** 2)
        x += a * 0.17 * tip
        y *= 1 - 0.28 * math.exp(-(adist(t, 0) / 0.42) ** 2)
        stem = math.exp(-(adist(t, math.pi) / 0.24) ** 2)
        x -= a * 0.08 * stem
        y *= 1 - 0.12 * math.exp(-(adist(t, math.pi) / 0.4) ** 2)
        j = 1 + rng.uniform(-0.012, 0.012)
        pts.append((x * j * scale, y * j * scale))
    return pts


def lemon(cx, cy, angle, length, seed, detail=True):
    rng = random.Random(seed)
    a = length / 2
    b = a * 0.68
    pts = lemon_points(a, b, rng)
    sw = max(0.9, length / 58)
    out = [f'<g transform="translate({f(cx)} {f(cy)}) rotate({f(angle)})">']
    # the colour plate, printed a touch off the line
    off = length * 0.035
    out.append(f'<path d="{smooth([(x + off, y + off * 0.8) for x, y in lemon_points(a, b, rng, scale=0.97)], True)}" fill="{LEMON}"/>')
    # shade plate on the lower side
    shade = [(x * 0.9 + off, y * 0.9 + off) for x, y in pts[2:14]]
    shade += [(x * 0.55 + off, y * 0.35 + off * 2) for x, y in reversed(pts[2:14])]
    out.append(f'<path d="{smooth(shade, True)}" fill="{LEMON_SHADE}" opacity="0.45"/>')
    # ink outline with one break where the light falls
    gap = 19  # upper-left
    ring = pts[gap + 1:] + pts[:gap]
    out.append(f'<path d="{smooth(ring, False)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 1.25)}" stroke-linecap="round" stroke-linejoin="round"/>')
    # stem end calyx
    sx = -a * 1.06
    for k in (-1, 0, 1):
        ang = math.radians(180 + k * 38)
        out.append(f'<path d="M{f(sx + 1)} 0 L{f(sx + 1 + math.cos(ang) * a * 0.12)} {f(math.sin(ang) * a * 0.12)}" stroke="{INK}" stroke-width="{f(sw)}" stroke-linecap="round"/>')
    if detail:
        # contour hatching along the shadow side
        for s in (0.84, 0.7):
            arc = [(x * s, y * s) for x, y in pts[3:12]]
            out.append(f'<path d="{smooth(arc, False)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 0.6)}" stroke-linecap="round" opacity="0.55"/>')
        # stippled peel
        dots = []
        for _ in range(int(length * 0.32)):
            t = rng.uniform(-0.4, math.pi * 0.95)
            r = rng.uniform(0.25, 0.86)
            x = a * r * math.cos(t)
            y = b * r * math.sin(t)
            dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(sw * rng.uniform(0.35, 0.6))}"/>')
        out.append(f'<g fill="{INK}" opacity="0.6">{"".join(dots)}</g>')
        # a short highlight stroke
        hl = [(x * 0.7, y * 0.62) for x, y in pts[19:24]]
        out.append(f'<path d="{smooth(hl, False)}" fill="none" stroke="#fff6d6" stroke-width="{f(sw * 1.4)}" stroke-linecap="round" opacity="0.9"/>')
    else:
        dots = ''.join(f'<circle cx="{f(a * r * math.cos(t))}" cy="{f(b * r * math.sin(t))}" r="{f(sw * 0.45)}"/>' for t, r in [(0.6, 0.55), (1.2, 0.6), (0.2, 0.7), (1.8, 0.45), (0.9, 0.3)])
        out.append(f'<g fill="{INK}" opacity="0.6">{dots}</g>')
    out.append('</g>')
    return ''.join(out)


def lemon_half(cx, cy, r, angle, seed):
    rng = random.Random(seed)
    sw = max(0.9, r / 26)
    out = [f'<g transform="translate({f(cx)} {f(cy)}) rotate({f(angle)})">']
    rim = [(r * math.cos(t) * (1 + rng.uniform(-0.015, 0.015)), r * 0.92 * math.sin(t)) for t in [2 * math.pi * i / 26 for i in range(26)]]
    out.append(f'<path d="{smooth([(x + r * 0.06, y + r * 0.06) for x, y in rim], True)}" fill="{LEMON}"/>')
    pulp = [(x * 0.84, y * 0.84) for x, y in rim]
    out.append(f'<path d="{smooth(pulp, True)}" fill="{LEMON_PULP}"/>')
    out.append(f'<path d="{smooth(rim, True)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 1.25)}"/>')
    out.append(f'<path d="{smooth(pulp, True)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 0.7)}" opacity="0.8"/>')
    for i in range(9):
        t = 2 * math.pi * i / 9 + rng.uniform(-0.05, 0.05)
        out.append(f'<path d="M{f(math.cos(t) * r * 0.1)} {f(math.sin(t) * r * 0.09)} L{f(math.cos(t) * r * 0.78)} {f(math.sin(t) * r * 0.72)}" stroke="{INK}" stroke-width="{f(sw * 0.7)}" stroke-linecap="round" opacity="0.75"/>')
        tm = t + math.pi / 9
        # pulp vesicles: two tiny strokes inside each segment
        for k in (0.4, 0.6):
            out.append(f'<path d="M{f(math.cos(tm) * r * k)} {f(math.sin(tm) * r * k * 0.92)} l{f(math.cos(tm) * r * 0.08)} {f(math.sin(tm) * r * 0.08)}" stroke="{LEMON_SHADE}" stroke-width="{f(sw * 0.8)}" stroke-linecap="round"/>')
    out.append(f'<ellipse cx="{f(r * 0.32)}" cy="{f(r * 0.08)}" rx="{f(r * 0.06)}" ry="{f(r * 0.035)}" fill="{PETAL}" stroke="{INK}" stroke-width="{f(sw * 0.5)}"/>')
    out.append('</g>')
    return ''.join(out)


def leaf(x0, y0, angle, length, seed, bend=0.07, veins=True):
    rng = random.Random(seed)
    w = length * 0.2
    sw = max(0.8, length / 70)
    us = [i / 9 for i in range(10)]
    mid = lambda u: (u * length, length * bend * math.sin(math.pi * u))
    half = lambda u: w * math.sin(math.pi * u ** 0.82) * (1 - 0.15 * u)
    top = [(mid(u)[0], mid(u)[1] - half(u) * (1 + rng.uniform(-0.04, 0.04))) for u in us]
    bot = [(mid(u)[0], mid(u)[1] + half(u) * (1 + rng.uniform(-0.04, 0.04))) for u in reversed(us)]
    outline = top + bot[1:-1]
    off = length * 0.03
    out = [f'<g transform="translate({f(x0)} {f(y0)}) rotate({f(angle)})">']
    out.append(f'<path d="{smooth([(x + off, y + off) for x, y in outline], True)}" fill="{LEAF}"/>')
    # darker half for the turned side
    dark = [(x + off, y + off) for x, y in bot[:-1]] + [(mid(u)[0] + off, mid(u)[1] + off) for u in us[1:]]
    out.append(f'<path d="{smooth(dark, True)}" fill="{LEAF_DARK}" opacity="0.35"/>')
    out.append(f'<path d="{smooth(outline, True)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 1.15)}" stroke-linejoin="round"/>')
    out.append(f'<path d="{smooth([mid(u) for u in us[:-1]], False)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 0.9)}" stroke-linecap="round"/>')
    if veins:
        for k, u in enumerate([0.18, 0.3, 0.42, 0.54, 0.66, 0.78]):
            for side in (-1, 1):
                mx, my = mid(u)
                ex, ey = mid(min(u + 0.12, 0.95))
                ey += side * half(u + 0.1) * 0.78
                out.append(f'<path d="M{f(mx)} {f(my)} Q{f(mx + (ex - mx) * 0.4)} {f(my + (ey - my) * 0.75)} {f(ex)} {f(ey)}" fill="none" stroke="{INK}" stroke-width="{f(sw * 0.6)}" stroke-linecap="round" opacity="0.8"/>')
    out.append('</g>')
    return ''.join(out)


def blossom(cx, cy, r, angle, seed, center=True):
    rng = random.Random(seed)
    sw = max(0.8, r / 18)
    out = [f'<g transform="translate({f(cx)} {f(cy)}) rotate({f(angle)})">']
    for i in range(5):
        a = i * 72 + rng.uniform(-6, 6)
        rr = r * rng.uniform(0.92, 1.05)
        p = (f'M0 0 C{f(-rr * 0.5)} {f(-rr * 0.22)} {f(-rr * 0.42)} {f(-rr * 0.86)} {f(rr * 0.04)} {f(-rr)} '
             f'C{f(rr * 0.4)} {f(-rr * 0.84)} {f(rr * 0.48)} {f(-rr * 0.22)} 0 0 Z')
        out.append(f'<path transform="rotate({f(a)})" d="{p}" fill="{PETAL}" stroke="{INK}" stroke-width="{f(sw)}" stroke-linejoin="round"/>')
        out.append(f'<path transform="rotate({f(a)})" d="M0 {f(-r * 0.25)} L0 {f(-r * 0.6)}" stroke="{INK}" stroke-width="{f(sw * 0.5)}" opacity="0.5" stroke-linecap="round"/>')
    if center:
        out.append(f'<circle r="{f(r * 0.2)}" fill="{LEMON_PULP}" stroke="{INK}" stroke-width="{f(sw * 0.8)}"/>')
        for i in range(7):
            t = 2 * math.pi * i / 7
            out.append(f'<circle cx="{f(math.cos(t) * r * 0.3)}" cy="{f(math.sin(t) * r * 0.3)}" r="{f(sw * 0.55)}" fill="{INK}"/>')
    out.append('</g>')
    return ''.join(out)


def bud(cx, cy, r, angle):
    sw = max(0.8, r / 9)
    return (f'<g transform="translate({f(cx)} {f(cy)}) rotate({f(angle)})">'
            f'<path d="M0 0 C{f(-r * 0.7)} {f(-r * 0.5)} {f(-r * 0.5)} {f(-r * 1.6)} 0 {f(-r * 1.9)} C{f(r * 0.5)} {f(-r * 1.6)} {f(r * 0.7)} {f(-r * 0.5)} 0 0 Z" fill="{PETAL}" stroke="{INK}" stroke-width="{f(sw)}"/>'
            f'<path d="M0 {f(-r * 0.2)} L0 {f(-r * 1.5)}" stroke="{INK}" stroke-width="{f(sw * 0.5)}" opacity="0.5"/></g>')


def stem(pts, width):
    return f'<path d="{smooth(pts, False)}" fill="none" stroke="{INK}" stroke-width="{f(width)}" stroke-linecap="round" stroke-linejoin="round"/>'


def sprig_svg():
    p = []
    # branches first, everything else sits on them
    p.append(stem([(300, 14), (262, 40), (214, 84), (168, 128), (122, 168)], 3.4))
    p.append(stem([(214, 84), (232, 118), (238, 150)], 2.4))
    p.append(stem([(168, 128), (160, 160), (150, 184)], 2.2))
    p.append(stem([(262, 40), (250, 22), (236, 12)], 2))
    # leaves
    p.append(leaf(262, 40, 205, 70, 1, bend=-0.06))
    p.append(leaf(244, 58, -20, 64, 2))
    p.append(leaf(196, 100, 200, 78, 3, bend=-0.08))
    p.append(leaf(214, 84, 30, 58, 4))
    p.append(leaf(140, 152, 160, 72, 5))
    p.append(leaf(122, 168, 215, 60, 6, bend=-0.05))
    p.append(leaf(168, 128, 70, 46, 7))
    # fruit
    p.append(lemon(240, 196, 96, 98, 11))
    p.append(lemon(146, 236, 78, 104, 12))
    p.append(lemon_half(64, 290, 38, -12, 13))
    # blossoms and buds
    p.append(blossom(186, 64, 24, 10, 21))
    p.append(blossom(96, 128, 21, -14, 22))
    p.append(blossom(286, 104, 18, 30, 23))
    p.append(bud(236, 12, 7, -60))
    p.append(bud(122, 168, 7, -120))
    p.append(blossom(214, 300, 13, 20, 24))
    p.append(leaf(196, 304, 175, 34, 8, veins=False))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 0 300 340" width="300" height="340">{"".join(p)}</svg>'


def border_svg():
    S, B = 300, 60
    p = [f'<path d="M0 0 H{S} V{S} H0 Z M{B} {B} V{S - B} H{S - B} V{B} Z" fill="{BAND}" fill-rule="evenodd"/>']

    # stamp-like scalloped outer edge (period 20 keeps corners and repeats in step)
    def scallop(side):
        pts = []
        for i in range(0, S + 1, 2):
            o = 6 + 2.6 * math.cos(2 * math.pi * i / 20)
            pts.append({'t': (i, o), 'b': (i, S - o), 'l': (o, i), 'r': (S - o, i)}[side])
        return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts)

    for s in 'tblr':
        p.append(f'<path d="{scallop(s)}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>')
    # inner double rule
    p.append(f'<path d="M{B - 3} {B - 3} H{S - B + 3} V{S - B + 3} H{B - 3} Z" fill="none" stroke="{INK}" stroke-width="2"/>')
    p.append(f'<path d="M{B - 8} {B - 8} H{S - B + 8} V{S - B + 8} H{B - 8} Z" fill="none" stroke="{INK}" stroke-width="0.8" opacity="0.7"/>')

    def motif(cx, cy, rot, flip, seed):
        g = []
        sgn = -1 if flip else 1
        g.append(stem([(-34, 2 * sgn), (-10, -1 * sgn), (16, 0)], 1.4))
        g.append(leaf(-26, 1 * sgn, -150 * sgn, 22, seed + 1, veins=False))
        g.append(leaf(-12, -1 * sgn, 205 * sgn if flip else -25, 20, seed + 2, veins=False))
        g.append(lemon(10, 4 * sgn, 6 * sgn, 30, seed + 3, detail=False))
        g.append(blossom(-44, 0, 7, 10, seed + 4, center=True))
        g.append(blossom(46, -2 * sgn, 6, -10, seed + 5, center=True))
        return f'<g transform="translate({cx} {cy}) rotate({rot}) scale(1.3)">' + ''.join(g) + '</g>'

    mid = S / 2
    p.append(motif(mid, B / 2 + 2, 0, False, 30))
    p.append(motif(mid, S - B / 2 - 2, 180, False, 40))
    p.append(motif(B / 2 + 2, mid, -90, False, 50))
    p.append(motif(S - B / 2 - 2, mid, 90, False, 60))
    # corners: a single blossom with two leaves
    for i, (x, y, r) in enumerate([(B / 2 + 3, B / 2 + 3, 0), (S - B / 2 - 3, B / 2 + 3, 90), (S - B / 2 - 3, S - B / 2 - 3, 180), (B / 2 + 3, S - B / 2 - 3, 270)]):
        g = leaf(0, 0, -100, 17, 70 + i, veins=False) + leaf(0, 0, 10, 17, 80 + i, veins=False) + blossom(0, 0, 9, 12 + i * 20, 90 + i)
        p.append(f'<g transform="translate({f(x)} {f(y)}) rotate({r}) scale(1.25)">{g}</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">{"".join(p)}</svg>'


if __name__ == '__main__':
    for path, svg in ((sys.argv[1], sprig_svg()), (sys.argv[2], border_svg())):
        open(path, 'w').write(svg)
        print(path, len(svg) // 1024, 'KB')
