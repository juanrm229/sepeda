"""Bangun aset avatar app dari Avatar Modular Kit.

Pakai:  python3 scripts/build-avatar-kit.py /path/ke/Avatar-Modular-Kit
Hasil:  public/avatar/<id>.webp  +  src/lib/avatar-kit.json

Kalibrasi (hasil QA visual, v3):
  1. Rasio aspek asli dipertahankan. Manifest kit memaksa banyak bagian ke rect
     dengan rasio berbeda (baju melar ~1,5x ke samping, topi 1,26x, kumis 1,25x).
  2. Leher di aset kepala dilebarkan 1,65x (bertahap dari dagu) dan bayangan dagu
     hitam pekat diganti bayangan kulit -> baju bisa berbahu lebar (x1,22) tanpa
     kerah tampak raksasa dibanding leher.
  3. Rambut 90% dari garis telinga. Rambut yang aslinya menutupi telinga ditandai
     `ears`; app memakai varian kepala tanpa telinga (`heads-XX-ne`) agar telinga
     tidak mencuat setelah rambut diperkecil. Topi 94%.
  3. Wajah: mata -12% & turun 4, alis -12% & naik 5, mulut +25% & naik 8, kumis naik 6.
  4. Sport hijab (21-25) naik 10 px & 104% agar menutup ubun-ubun.
  5. Aset rusak dikeluarkan (hasil ekstraksi kit 3-4 px lebar / potongan sebagian).
"""
import json, os, sys
from PIL import Image

# ---- pengolahan aset kepala ----
def widen_neck(im, factor=1.45, ramp=10):
    """Lebarkan leher di aset kepala: baris di bawah dagu direntang horizontal dari tengah."""
    im=im.convert('RGBA'); W,H=im.size; a=im.split()[3].load()
    widths=[]
    for y in range(H):
        xs=[x for x in range(W) if a[x,y]>40]
        widths.append((xs[0],xs[-1]) if xs else None)
    maxw=max((r[1]-r[0]) for r in widths if r)
    # dagu = baris pertama (dari bawah ke atas) setelah lebar leher di mana lebar melonjak > 1.6x lebar leher
    bottom=max(i for i,r in enumerate(widths) if r)
    neckw=widths[bottom-6][1]-widths[bottom-6][0]
    chin=bottom
    for y in range(bottom-6, 0, -1):
        r=widths[y]
        if r and (r[1]-r[0])>neckw*1.6: chin=y; break
    out=im.copy(); cx=W/2
    for y in range(chin+1, H):
        t=min(1,(y-chin)/ramp); f=1+(factor-1)*(t*t*(3-2*t))
        row=im.crop((0,y,W,y+1))
        nw=round(W*f); row=row.resize((nw,1),Image.LANCZOS)
        out.paste((0,0,0,0),(0,y,W,y+1))
        out.alpha_composite(row.crop((round((nw-W)/2),0,round((nw-W)/2)+W,1)),(0,y))
    return out, chin, neckw

def soften_chin_shadow(im, keep_line=2, k=0.8):
    """Ganti bayangan dagu hitam pekat dengan bayangan kulit (outline luar tetap)."""
    im=im.convert('RGBA'); W,H=im.size; px=im.load(); a=im.split()[3].load()
    rows={}
    for y in range(H):
        xs=[x for x in range(W) if a[x,y]>40]
        if xs: rows[y]=(xs[0],xs[-1])
    bottom=max(rows); neckw=rows[bottom-6][1]-rows[bottom-6][0]
    chin=bottom
    for y in range(bottom-6,0,-1):
        if y in rows and rows[y][1]-rows[y][0]>neckw*1.6: chin=y; break
    # warna kulit leher (baris terang pertama di bawah bayangan)
    cx=W//2; skin=None; ys=None; seen_dark=False; y_dark=None
    for y in range(chin, bottom):
        r,g,b,al=px[cx,y]
        if r+g+b<200 and not seen_dark: seen_dark=True; y_dark=y
        elif seen_dark and r+g+b>450: skin=(r,g,b); ys=y; break
    if not skin: return im
    sh=(int(skin[0]*0.88), int(skin[1]*0.74), int(skin[2]*0.68))
    for y in range(y_dark+keep_line, ys-1):
        if y not in rows: continue
        x0,x1=rows[y]
        for x in range(x0+4, x1-3):
            r,g,b,al=px[x,y]
            if al>40 and r+g+b<240: px[x,y]=(*sh,al)
    return im

def remove_ears(im, y0f=0.36, y1f=0.70):
    """Hapus telinga: piksel di luar oval wajah pada baris telinga (ditutup rambut)."""
    im=im.convert('RGBA'); W,H=im.size; px=im.load(); a=im.split()[3].load()
    def edge(y):
        xs=[x for x in range(W) if a[x,y]>40]; return (xs[0],xs[-1]) if xs else None
    ya,yb=int(H*y0f),int(H*y1f)
    ea,eb=edge(ya-4),edge(yb+4)
    if not ea or not eb: return im
    for y in range(ya,yb+1):
        t=(y-(ya-4))/((yb+4)-(ya-4))
        # oval: interpolasi dengan tonjolan ringan di tengah
        bulge=4*t*(1-t)*6
        xl=ea[0]+(eb[0]-ea[0])*t-bulge; xr=ea[1]+(eb[1]-ea[1])*t+bulge
        for x in range(W):
            if x<xl-1 or x>xr+1: px[x,y]=(0,0,0,0)
            elif x<xl+2.5 or x>xr-2.5:
                if px[x,y][3]>0: px[x,y]=(28,20,16,255)
    return im


KIT = sys.argv[1]
OUT = 'public/avatar'
EXCLUDE = {'mouths-18', 'mouths-20', 'mouths-23', 'mouths-33', 'neckwear-22', 'neckwear-23', 'neckwear-24'}
FACE = {'eyes': (0, 4, 0.88), 'brows': (0, -5, 0.88), 'mouths': (0, -8, 1.25), 'beards': (0, -6, 1.0)}
HEADGROUP = {'heads', 'hair', 'hijabs', 'eyes', 'brows', 'mouths', 'beards', 'hats', 'eyewear', 'earrings', 'details', 'accessories'}
P = dict(hair=0.90, hairAy=244, hat=0.94, hatAy=200, head=1.0, neckY=380, shirtDy=-8, shirtS=1.22, neckwear=1.22, hatW=1.0, beardS=0.82)
SPORT = {f'hijabs-{i}' for i in range(21, 26)}

def aspect_fix(cat, r, size):
    x, y, w, h = r; iw, ih = size; sx, sy = w / iw, h / ih
    if cat == 'shirts': s = sy * P['shirtS']; return [x + w / 2 - iw * s / 2, y, iw * s, ih * s]
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
    if cat == 'neckwear': r = about(r, 256, 350, P['neckwear'])
    if cat in ('shirts', 'neckwear'): r[1] += P['shirtDy']
    return [round(v, 1) for v in r]

m = json.load(open(os.path.join(KIT, 'manifest.json')))

# rambut yang menutupi telinga (diukur dari piksel pada skala asli)
_head = Image.open(os.path.join(KIT, 'layers-512/heads/heads-05.png')).split()[3].load()
EAR = [(x, y) for y in range(205, 290, 2) for x in list(range(110, 152, 2)) + list(range(360, 402, 2)) if _head[x, y] > 128]
def ear_cover(it):
    a = Image.open(os.path.join(KIT, it['path'])).split()[3]
    x, y, w, h = it['rect']; mm = a.resize((max(1, round(w)), max(1, round(h)))); pm = mm.load(); n = 0
    for ex, ey in EAR:
        u, v = round(ex - x), round(ey - y)
        if 0 <= u < mm.width and 0 <= v < mm.height and pm[u, v] > 100: n += 1
    return n / len(EAR)
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
        if cat == 'heads':
            im = widen_neck(soften_chin_shadow(im), 1.65)[0]
            ne = remove_ears(im.copy())
            r0 = layout(cat, it['id'], it['rect'], (im.width, im.height))
            ne.resize((min(ne.width, round(r0[2] * 1.25)), min(ne.height, round(r0[3] * 1.25))), Image.LANCZOS).save(os.path.join(OUT, it['id'] + '-ne.webp'), 'WEBP', quality=82, method=4)
        if cat == 'hair' and ear_cover(it) >= 0.75: e['ears'] = 1
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
