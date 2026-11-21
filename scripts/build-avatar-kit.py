"""Bangun aset avatar app dari Avatar Modular Kit.

Pakai:  python3 scripts/build-avatar-kit.py /path/ke/Avatar-Modular-Kit
Hasil:  public/avatar/<id>.webp  +  src/lib/avatar-kit.json

Kalibrasi (hasil QA visual):
  1. Rasio aspek asli dipertahankan. Manifest kit memaksa banyak bagian ke rect
     dengan rasio berbeda (baju melar ~1,5x ke samping, topi 1,26x, kumis 1,25x).
  2. Proporsi: rambut 92% (jangkar di garis telinga y=244, telinga tetap tertutup),
     topi 94%, seluruh kepala 105% dari titik leher (y=380), baju naik 4 px.
  3. Wajah: mata -12% & turun 4, alis -12% & naik 5, mulut +25% & naik 8, kumis naik 6.
  4. Sport hijab (21-25) naik 10 px & 104% agar menutup ubun-ubun.
  5. Aset rusak dikeluarkan (hasil ekstraksi kit 3-4 px lebar / potongan sebagian).
"""
import json, os, sys
from PIL import Image

KIT = sys.argv[1]
OUT = 'public/avatar'
EXCLUDE = {'mouths-18', 'mouths-20', 'mouths-23', 'mouths-33', 'neckwear-22', 'neckwear-23', 'neckwear-24'}
FACE = {'eyes': (0, 4, 0.88), 'brows': (0, -5, 0.88), 'mouths': (0, -8, 1.25), 'beards': (0, -6, 1.0)}
HEADGROUP = {'heads', 'hair', 'hijabs', 'eyes', 'brows', 'mouths', 'beards', 'hats', 'eyewear', 'earrings', 'details', 'accessories'}
P = dict(hair=0.92, hairAy=244, hat=0.94, hatAy=200, head=1.05, neckY=380, shirtDy=-4, hatW=1.0, beardS=0.82)
SPORT = {f'hijabs-{i}' for i in range(21, 26)}

def aspect_fix(cat, r, size):
    x, y, w, h = r; iw, ih = size; sx, sy = w / iw, h / ih
    if cat == 'shirts': s = sy; return [x + w / 2 - iw * s / 2, y, iw * s, ih * s]
    if cat == 'hats': s = (sx * sy) ** 0.5 * P['hatW']; return [x + w / 2 - iw * s / 2, y + h - ih * s, iw * s, ih * s]
    if cat == 'beards': s = sx * P['beardS']; return [x + w / 2 - iw * s / 2, y, iw * s, ih * s]
    if cat in ('details', 'neckwear', 'eyes', 'brows', 'mouths', 'accessories', 'eyewear'):
        s = (sx * sy) ** 0.5 if cat == 'neckwear' else min(sx, sy)
        return [x + w / 2 - iw * s / 2, y + (0 if cat == 'neckwear' else h / 2 - ih * s / 2), iw * s, ih * s]
    return [x, y, w, h]

def about(r, ax, ay, s):
    x, y, w, h = r; return [ax + (x - ax) * s, ay + (y - ay) * s, w * s, h * s]

def layout(cat, pid, r, size, seg=False):
    if not seg: r = aspect_fix(cat, r, size)
    if cat in FACE:
        dx, dy, sc = FACE[cat]; x, y, w, h = r; cx, cy = x + w / 2 + dx, y + h / 2 + dy; w *= sc; h *= sc; r = [cx - w / 2, cy - h / 2, w, h]
    if pid in SPORT: r = about(r, 256, 250, 1.04); r[1] -= 10
    if cat == 'hair': r = about(r, 256, P['hairAy'], P['hair'])
    if cat == 'hats': r = about(r, 256, P['hatAy'], P['hat'])
    if cat in HEADGROUP: r = about(r, 256, P['neckY'], P['head'])
    if cat in ('shirts', 'neckwear'): r[1] += P['shirtDy']
    return [round(v, 1) for v in r]

m = json.load(open(os.path.join(KIT, 'manifest.json')))
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.webp'): os.remove(os.path.join(OUT, f))
cats, total = {}, 0
for cat, items in m['categories'].items():
    arr = []
    for it in items:
        if it['id'] in EXCLUDE: continue
        im = Image.open(os.path.join(KIT, it['path'])).convert('RGBA')
        e = {'id': it['id'], 'l': it['label'], 'z': it['zIndex']}
        if it.get('slot'): e['slot'] = it['slot']
        if it.get('segments'):
            e['r'] = layout(cat, it['id'], it['rect'], it['size'], seg=True)
            e['seg'] = [{'s': s['sourceRect'], 'r': layout(cat, it['id'], s['rect'], it['size'], seg=True)} for s in it['segments']]
            e['sz'] = [im.width, im.height]
            out = im
        else:
            e['r'] = layout(cat, it['id'], it['rect'], (im.width, im.height))
            tw, th = min(im.width, round(e['r'][2] * 1.25)), min(im.height, round(e['r'][3] * 1.25))
            out = im.resize((max(1, tw), max(1, th)), Image.LANCZOS)
        p = os.path.join(OUT, it['id'] + '.webp')
        out.save(p, 'WEBP', quality=82, method=4)
        total += os.path.getsize(p)
        arr.append(e)
    cats[cat] = arr
json.dump({'canvas': 512, 'cats': cats}, open('src/lib/avatar-kit.json', 'w'), separators=(',', ':'))
print(f'{sum(len(v) for v in cats.values())} bagian · webp {total / 1024 / 1024:.2f} MB')
