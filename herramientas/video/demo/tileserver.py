"""Servidor de teselas propio para la grabación (sin internet): dibuja el Maule con datos de Natural Earth."""
import io, json, math, os, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageDraw, ImageFont

NE = '/tmp/claude-0/demo/ne'
CACHE = '/tmp/claude-0/demo/tiles'
BBOX = (-78.0, -41.0, -64.0, -30.0)  # lon0, lat0, lon1, lat1
SS = 2  # supermuestreo
FONT = '/usr/share/fonts/truetype/inter/Inter-Medium.ttf'
FONT_B = '/usr/share/fonts/truetype/inter/Inter-SemiBold.ttf'
FONT_I = '/usr/share/fonts/truetype/inter/Inter-Italic.ttf'
import glob
def pick(name, fallback):
    hits = glob.glob(f'/usr/share/fonts/**/{name}', recursive=True)
    return hits[0] if hits else fallback
DEJA = pick('DejaVuSans.ttf', None)
FONT, FONT_B, FONT_I = pick('Inter-Medium.*', DEJA), pick('Inter-SemiBold.*', DEJA), pick('Inter-Italic.*', DEJA)

def inside(b):
    return not (b[2] < BBOX[0] or b[0] > BBOX[2] or b[3] < BBOX[1] or b[1] > BBOX[3])
def bbox(coords):
    xs = [p[0] for p in coords]; ys = [p[1] for p in coords]
    return (min(xs), min(ys), max(xs), max(ys))

def load(name):
    return json.load(open(f'{NE}/{name}.geojson'))['features']

def polys(name, keep=lambda p: True):
    out = []
    for f in load(name):
        if not keep(f['properties']): continue
        g = f['geometry']
        if not g: continue
        parts = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in parts:
            b = bbox(poly[0])
            if inside(b): out.append((b, poly, f['properties']))
    return out

def lines(name, keep=lambda p: True):
    out = []
    for f in load(name):
        if not keep(f['properties']): continue
        g = f['geometry']
        if not g: continue
        parts = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
        for line in parts:
            if len(line) < 2: continue
            b = bbox(line)
            if inside(b): out.append((b, line, f['properties']))
    return out

print('cargando datos...', flush=True)
LAND = polys('ne_10m_land') + polys('ne_10m_minor_islands')
LAKES = polys('ne_10m_lakes')
URBAN = polys('ne_10m_urban_areas')
PARKS = polys('ne_10m_parks_and_protected_lands_area')
RIVERS = lines('ne_10m_rivers_lake_centerlines')
ROADS = lines('ne_10m_roads')
ADMIN1 = lines('ne_10m_admin_1_states_provinces_lines')
ADMIN0 = lines('ne_10m_admin_0_boundary_lines_land')
COMUNAS = []
for f in json.load(open(f'{NE}/comunas.geojson'))['features']:
    g = f['geometry']
    if not g: continue
    parts = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in parts:
        ring = poly[0]
        if len(ring) > 3:
            b = bbox(ring)
            if inside(b) and -37.2 < (b[1] + b[3]) / 2 < -33.8: COMUNAS.append((b, ring))
PLACES = []
for f in load('ne_10m_populated_places_simple'):
    lon, lat = f['geometry']['coordinates']
    if BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]:
        p = f['properties']
        PLACES.append((lon, lat, p.get('name'), p.get('scalerank', 8), p.get('pop_max', 0)))
NE_NAMES = {p[2] for p in PLACES}
# Localidades del Maule que Natural Earth no trae (coordenadas aproximadas), para que el mapa regional se lea bien.
EXTRA = [
    ('Molina', -35.114, -71.283), ('San Javier', -35.595, -71.729), ('Parral', -36.143, -71.826), ('San Clemente', -35.533, -71.483),
    ('Pelluhue', -35.814, -72.573), ('Vichuquén', -34.883, -72.000), ('Empedrado', -35.592, -72.276), ('Chanco', -35.733, -72.533),
    ('Curepto', -35.091, -72.022), ('Licantén', -34.983, -72.000), ('Iloca', -34.933, -72.183), ('Teno', -34.867, -71.167),
    ('Sagrada Familia', -35.000, -71.383), ('Hualañé', -34.976, -71.805), ('Pencahue', -35.400, -71.817), ('Villa Alegre', -35.683, -71.733),
    ('Yerbas Buenas', -35.750, -71.583), ('Colbún', -35.700, -71.417), ('Longaví', -35.967, -71.683), ('Retiro', -36.050, -71.767),
    ('Río Claro', -35.283, -71.267), ('Pelarco', -35.383, -71.450), ('San Rafael', -35.317, -71.517), ('Rauco', -34.933, -71.317),
    ('Constitución', -35.333, -72.415), ('Cauquenes', -35.967, -72.317), ('Linares', -35.846, -71.593), ('Curicó', -34.983, -71.233), ('Talca', -35.4264, -71.6554),
]
for name, lat, lon in EXTRA:
    if name not in NE_NAMES:
        PLACES.append((lon, lat, name, 9 if name not in ('Constitución', 'Cauquenes', 'Linares', 'Curicó', 'Talca') else 6, 0))
NATURE = [('Parque Nacional\nRadal Siete Tazas', -35.47, -70.99), ('Reserva Nacional\nLos Ruiles', -35.83, -72.50), ('Laguna del Maule', -36.06, -70.50),
          ('Lago Colbún', -35.70, -71.30), ('Reserva Nacional\nAltos de Lircay', -35.60, -70.98), ('Lago Vichuquén', -34.82, -72.07)]
SEA = [('Océano Pacífico', -35.4, -73.25)]
print(f'land {len(LAND)} roads {len(ROADS)} rivers {len(RIVERS)} places {len(PLACES)}', flush=True)

def font(path, size):
    return ImageFont.truetype(path, int(size * SS))

def render(z, x, y):
    n = 2 ** z
    size = 256 * SS
    pad = 96 * SS
    W = size + 2 * pad
    def px(lon, lat):
        fx = (lon + 180.0) / 360.0 * n
        s = math.sin(math.radians(max(min(lat, 85), -85)))
        fy = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
        return ((fx - x) * size + pad, (fy - y) * size + pad)
    # límites geográficos de la tesela con margen
    def lonlat(tx, ty):
        lon = tx / n * 360 - 180
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ty / n))))
        return lon, lat
    m = pad / size
    lon0, lat1 = lonlat(x - m, y - m); lon1, lat0 = lonlat(x + 1 + m, y + 1 + m)
    def hit(b): return not (b[2] < lon0 or b[0] > lon1 or b[3] < lat0 or b[1] > lat1)

    img = Image.new('RGB', (W, W), '#c9dfee')
    d = ImageDraw.Draw(img)
    for b, poly, _ in LAND:
        if hit(b):
            d.polygon([px(*p[:2]) for p in poly[0]], fill='#f3f0e9')
            for hole in poly[1:]: d.polygon([px(*p[:2]) for p in hole], fill='#c9dfee')
    for b, poly, _ in PARKS:
        if hit(b): d.polygon([px(*p[:2]) for p in poly[0]], fill='#d9ead0')
    if z >= 7:
        for b, poly, _ in URBAN:
            if hit(b): d.polygon([px(*p[:2]) for p in poly[0]], fill='#e4dfd6')
    for b, poly, _ in LAKES:
        if hit(b): d.polygon([px(*p[:2]) for p in poly[0]], fill='#a8cfe6')
    for b, line, p in RIVERS:
        if hit(b) and (z >= 8 or (p.get('scalerank') or 9) <= 7):
            w = max(1, round((1.0 + max(0, z - 7) * 0.5) * SS))
            d.line([px(*q[:2]) for q in line], fill='#a8cfe6', width=w, joint='curve')
    if False:
        for b, ring in COMUNAS:
            if hit(b): d.line([px(*q[:2]) for q in ring], fill='#d9d2c4', width=max(1, round(0.9 * SS)), joint='curve')
    for b, line, _ in ADMIN1:
        if hit(b) and z >= 6:
            pts = [px(*q[:2]) for q in line]
            for i in range(0, len(pts) - 1, 2):
                d.line(pts[i:i + 2], fill='#c3b3d6', width=max(1, SS))
    for b, line, _ in ADMIN0:
        if hit(b): d.line([px(*q[:2]) for q in line], fill='#a493c2', width=2 * SS, joint='curve')
    # caminos: primero el borde, luego el relleno
    def road_style(p):
        t = (p.get('type') or '').lower(); rank = p.get('scalerank') or 10
        major = 'major' in t or rank <= 5
        base = (2.2 if major else 1.3) + max(0, z - 7) * (0.9 if major else 0.55)
        return major, base
    visible = [(b, l, p) for b, l, p in ROADS if hit(b) and (z >= 8 or (p.get('scalerank') or 10) <= 7)]
    for b, line, p in visible:
        major, w = road_style(p)
        d.line([px(*q[:2]) for q in line], fill='#d9a441' if major else '#c9c5bd', width=round((w + 1.4) * SS), joint='curve')
    for b, line, p in visible:
        major, w = road_style(p)
        d.line([px(*q[:2]) for q in line], fill='#f9d98b' if major else '#ffffff', width=max(1, round(w * SS)), joint='curve')

    def label(text, lon, lat, f, fill, anchor='mm', dy=0, halo='#ffffff'):
        cx, cy = px(lon, lat)
        if -pad < cx - pad < size + pad and -pad < cy - pad < size + pad:
            d.multiline_text((cx, cy + dy * SS), text, font=f, fill=fill, anchor=anchor, stroke_width=round(2.2 * SS), stroke_fill=halo, align='center', spacing=2 * SS)
    if z >= 6:
        for name, lat, lon in SEA:
            label(name, lon, lat, font(FONT_I, 13 if z < 9 else 16), '#6f93b0', halo='#c9dfee')
    if z >= 9:
        for name, lat, lon in NATURE:
            label(name, lon, lat, font(FONT_I, 11), '#4f7f52', halo='#eef5ea')
    for lon, lat, name, rank, pop in PLACES:
        show = (rank <= 3) or (z >= 7 and rank <= 6) or (z >= 8 and rank <= 8) or (z >= 9)
        if not show or not name: continue
        big = rank <= 6
        cx, cy = px(lon, lat)
        r = (3.2 if big else 2.2) * SS
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#ffffff', outline='#5b5b5b', width=round(1.2 * SS))
        size_pt = (13 if big else 10.5) + (1.5 if z >= 10 else 0)
        label(name, lon, lat, font(FONT_B if big else FONT, size_pt), '#2b2b2b' if big else '#555555', anchor='ma', dy=5)

    img = img.crop((pad, pad, pad + size, pad + size)).resize((256, 256), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'PNG', optimize=False)
    return buf.getvalue()

PHOTOS = '/tmp/claude-0/demo/photos'
PHOTO_MAP = [  # palabra clave de la semilla -> foto
    ('hero', 215), ('login', 141), ('constitucion-costa', 290), ('talca-ciudad', 249), ('molina', 170), ('sanjavier', 243), ('vichuquen-laguna', 154), ('pelluhue-playa', 20),
    ('guia-maule', 267), ('dunas', 312), ('cabana', 120), ('caba', 120), ('casona', 103), ('bienestar', 312), ('escapada', 312), ('vino', 243), ('piedra', 267), ('guia-local', 267), ('aves', 119), ('ruiles', 119),
    ('siete', 166), ('caminata', 166), ('kayak', 211), ('ceramica', 234), ('taller', 234),
]
POOL = [6, 36, 39, 44, 104, 118, 127, 159, 185, 204, 219, 241, 308, 85, 131, 134]
def photo(seed, w, h):
    import hashlib
    key = seed.lower()
    n = next((num for word, num in PHOTO_MAP if word in key), None)
    if n is None:
        n = POOL[int(hashlib.md5(key.encode()).hexdigest(), 16) % len(POOL)]
    im = Image.open(f'{PHOTOS}/img-{n}.jpg').convert('RGB')
    w, h = min(w, 2400), min(h, 2400)
    scale = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * scale)), max(h, round(im.height * scale))), Image.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    buf = io.BytesIO(); im.crop((left, top, left + w, top + h)).save(buf, 'JPEG', quality=90)
    return buf.getvalue()

lock = threading.Lock()
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/photo/'):
            try:
                _, _, seed, w, h = self.path.split('?')[0].split('/')[:5]
                data = photo(seed, int(w), int(h))
            except Exception as exc:
                self.send_response(404); self.end_headers(); print('photo error', exc, flush=True); return
            self.send_response(200); self.send_header('Content-Type', 'image/jpeg'); self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'max-age=86400'); self.end_headers(); self.wfile.write(data); return
        try:
            z, x, y = [int(v) for v in self.path.split('?')[0].strip('/').replace('.png', '').split('/')[-3:]]
        except Exception:
            self.send_response(404); self.end_headers(); return
        path = f'{CACHE}/{z}_{x}_{y}.png'
        if os.path.exists(path):
            data = open(path, 'rb').read()
        else:
            data = render(z, x, y)
            with lock:
                open(path, 'wb').write(data)
        self.send_response(200); self.send_header('Content-Type', 'image/png'); self.send_header('Content-Length', str(len(data)))
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Cache-Control', 'max-age=86400'); self.end_headers(); self.wfile.write(data)
    def log_message(self, *a): pass

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        # mosaico de prueba
        z, cx, cy, w, h = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), 5, 4
        sheet = Image.new('RGB', (w * 256, h * 256))
        for i in range(w):
            for j in range(h):
                sheet.paste(Image.open(io.BytesIO(render(z, cx + i, cy + j))), (i * 256, j * 256))
        sheet.save(f'/tmp/claude-0/demo/map-test-z{z}.png'); print('ok')
    else:
        ThreadingHTTPServer(('127.0.0.1', 8811), H).serve_forever()
