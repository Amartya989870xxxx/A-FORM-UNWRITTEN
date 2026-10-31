import math
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

OUTPUT_DIR = 'src/assets/environments/verge_highlands'
ART_DIR = '/Users/amartyamajumder/.gemini/antigravity/brain/64c12712-833e-4d63-82f3-1feaabffe7b2'

# -------------------------------------------------------------------------
# 1. PROCESS bg_highland_mid.webp (Aqueduct with transparent sky and seamless wrap)
# -------------------------------------------------------------------------
print('Processing bg_highland_mid.webp...')
aqueduct_im = Image.open(f'{ART_DIR}/aqueduct_midground_layer_1793449597997.jpg')
arr = np.array(aqueduct_im)
h, w, _ = arr.shape

# Target size: 1920 x 680
# First isolate sky using flood fill from top edge
sky_mask = np.zeros((h, w), dtype=float)
visited = np.zeros((h, w), dtype=bool)
q = deque()

for x in range(w):
    if arr[0, x, 0] > 185 and arr[0, x, 2] > 195:
        q.append((0, x))
        visited[0, x] = True
        sky_mask[0, x] = 1.0

while q:
    y, x = q.popleft()
    for dy, dx in ((-1,0), (1,0), (0,-1), (0,1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
            visited[ny, nx] = True
            r, g, b = int(arr[ny, nx, 0]), int(arr[ny, nx, 1]), int(arr[ny, nx, 2])
            # Sky threshold: bright pale gray-blue
            if r > 180 and g > 190 and b > 195:
                sky_mask[ny, nx] = 1.0
                q.append((ny, nx))

# Smooth sky mask edges
sky_pil = Image.fromarray((sky_mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=1.5))
sky_smooth = np.array(sky_pil).astype(float) / 255.0

# Alpha is inverted sky mask (0 in sky, 1 in structure)
alpha = (1.0 - sky_smooth) * 255.0
rgba = np.dstack([arr, alpha.astype(np.uint8)])

rgba_im = Image.fromarray(rgba, 'RGBA')
# Resize to 1920x680
mid_resized = rgba_im.resize((1920, 680), Image.Resampling.LANCZOS)
mid_arr = np.array(mid_resized).astype(float)

# Make horizontally seamless by blending left and right 120 pixels
blend_w = 120
for x in range(blend_w):
    factor = x / float(blend_w) # 0 at edge, 1 at interior
    # Left edge blends towards right edge
    left_x = x
    right_x = 1920 - blend_w + x
    blended = (1.0 - factor) * mid_arr[:, right_x] + factor * mid_arr[:, left_x]
    mid_arr[:, left_x] = blended
    mid_arr[:, right_x] = blended

mid_final = Image.fromarray(np.clip(mid_arr, 0, 255).astype(np.uint8), 'RGBA')
mid_final.save(f'{OUTPUT_DIR}/bg_highland_mid.webp', 'WEBP', quality=90)
print('bg_highland_mid.webp saved successfully.')

# -------------------------------------------------------------------------
# 2. CREATE bg_highland_near.webp (Fluted columns, ivy-covered arches, banners)
# -------------------------------------------------------------------------
print('Creating bg_highland_near.webp...')
# 1920 x 700 with transparent upper sky
near_arr = np.zeros((700, 1920, 4), dtype=np.uint8)
near_im = Image.fromarray(near_arr, 'RGBA')

# Let's paint classical ruin architecture into near_im
# Using PIL ImageDraw
from PIL import ImageDraw
draw = ImageDraw.Draw(near_im)

# Colonnade positions across 1920 width
columns = [180, 520, 860, 1200, 1540, 1880]
for cx in columns:
    # Fluted column shaft
    col_w = 42
    col_h = 240
    base_y = 660
    top_y = base_y - col_h

    # Capital
    draw.rectangle([cx - 28, top_y - 14, cx + 28, top_y], fill=(62, 75, 98, 240))
    draw.rectangle([cx - 32, top_y - 20, cx + 32, top_y - 14], fill=(74, 90, 116, 245))

    # Shaft body with vertical fluting
    draw.rectangle([cx - col_w//2, top_y, cx + col_w//2, base_y], fill=(45, 55, 75, 235))
    # Flute lines
    for fx in range(cx - col_w//2 + 6, cx + col_w//2, 8):
        draw.line([fx, top_y + 4, fx, base_y - 4], fill=(30, 38, 54, 220), width=2)
        draw.line([fx + 2, top_y + 4, fx + 2, base_y - 4], fill=(70, 84, 110, 180), width=1)

    # Base plinth
    draw.rectangle([cx - 26, base_y, cx + 26, base_y + 12], fill=(60, 72, 94, 245))
    draw.rectangle([cx - 30, base_y + 12, cx + 30, base_y + 24], fill=(40, 50, 70, 255))

    # Hanging crimson/gold cloth banner on alternate pillars
    if cx in (520, 1200):
        bx = cx + 22
        by = top_y + 20
        bw = 20
        bh = 110
        draw.rectangle([bx, by, bx + bw, by + bh], fill=(138, 42, 54, 230))
        # Gold embroidered border
        draw.rectangle([bx + 2, by + 2, bx + bw - 2, by + bh - 2], outline=(212, 175, 55, 210), width=1)
        # Gold sun emblem
        draw.ellipse([bx + 5, by + 30, bx + 15, by + 40], fill=(230, 190, 70, 240))
        # V-cut bottom
        draw.polygon([(bx, by + bh), (bx + bw//2, by + bh - 10), (bx + bw, by + bh), (bx + bw, by + bh + 14), (bx + bw//2, by + bh + 6), (bx, by + bh + 14)], fill=(138, 42, 54, 230))

    # Climbing ivy foliage
    for vy in range(top_y + 10, base_y, 16):
        vine_x = cx + int(math.sin(vy * 0.08) * 14)
        draw.ellipse([vine_x - 7, vy - 5, vine_x + 7, vy + 5], fill=(42, 95, 68, 220))
        draw.ellipse([vine_x - 4, vy - 3, vine_x + 4, vy + 3], fill=(64, 138, 98, 230))

# Architraves connecting the columns
for i in range(len(columns) - 1):
    c1 = columns[i]
    c2 = columns[i + 1]
    top_y = 660 - 240
    # Heavy stone entablature
    draw.rectangle([c1 - 24, top_y - 34, c2 + 24, top_y - 20], fill=(52, 64, 85, 240))
    draw.rectangle([c1 - 28, top_y - 42, c2 + 28, top_y - 34], fill=(68, 82, 108, 250))
    # Carved frieze band
    draw.line([c1, top_y - 27, c2, top_y - 27], fill=(212, 175, 55, 120), width=2)

# Seamless wrap for near background: wrap columns[0] and columns[-1] across boundary
near_arr = np.array(near_im).astype(float)
blend_w = 64
for x in range(blend_w):
    f = x / float(blend_w)
    lx = x
    rx = 1920 - blend_w + x
    blended = (1.0 - f) * near_arr[:, rx] + f * near_arr[:, lx]
    near_arr[:, lx] = blended
    near_arr[:, rx] = blended

near_final = Image.fromarray(np.clip(near_arr, 0, 255).astype(np.uint8), 'RGBA')
near_final.save(f'{OUTPUT_DIR}/bg_highland_near.webp', 'WEBP', quality=90)
print('bg_highland_near.webp saved successfully.')

# -------------------------------------------------------------------------
# 3. CREATE SEAMLESS PLATFORM TEXTURES
# -------------------------------------------------------------------------
print('Creating platform textures...')

# A. terrain_highland_ground.png (256 x 48)
# Top 8px: Lush emerald grass with soft blades
# Middle 32px: Stratified dark limestone bedrock with golden kintsugi veins
# Bottom 8px: Dark shadowed foundation
g_w, g_h = 256, 48
g_im = Image.new('RGBA', (g_w, g_h), (0, 0, 0, 0))
g_draw = ImageDraw.Draw(g_im)

# Bedrock base
for y in range(8, g_h):
    # Dark limestone gradient with subtle stratification
    shade = 28 + int((y / g_h) * 12) + int(math.sin(y * 0.7) * 4)
    r = int(shade * 0.8)
    g = int(shade * 0.95)
    b = int(shade * 1.3)
    g_draw.line([(0, y), (g_w, y)], fill=(r, g, b, 255))

# Golden kintsugi fractures running horizontally
for x in range(g_w):
    fy1 = 20 + int(math.sin(x * 0.08) * 3 + math.sin(x * 0.22) * 2)
    fy2 = 34 + int(math.sin(x * 0.12 + 1.5) * 4)
    if (x % 3 != 0):
        g_draw.point((x, fy1), fill=(212, 175, 55, 180))
        g_draw.point((x, fy1 + 1), fill=(245, 215, 110, 220))
    if (x % 4 == 0):
        g_draw.point((x, fy2), fill=(185, 145, 45, 160))

# Overhanging rich grass layer (y: 0..8)
for x in range(g_w):
    blade_h = 4 + int(math.sin(x * 0.35) * 2 + math.cos(x * 0.7) * 1.5)
    # Deep emerald root layer
    g_draw.line([(x, blade_h + 3), (x, 9)], fill=(32, 68, 50, 255))
    # Rich green grass blade
    g_draw.line([(x, blade_h), (x, blade_h + 3)], fill=(54, 138, 96, 255))
    # Sunlit grass tip
    if x % 2 == 0:
        g_draw.point((x, blade_h), fill=(95, 195, 140, 255))

# Ensure horizontal seamlessness
g_arr = np.array(g_im)
for x in range(16):
    f = x / 16.0
    g_arr[:, x] = (1.0 - f) * g_arr[:, 256 - 16 + x] + f * g_arr[:, x]
    g_arr[:, 256 - 16 + x] = g_arr[:, x]

Image.fromarray(g_arr, 'RGBA').save(f'{OUTPUT_DIR}/terrain_highland_ground.png')
print('terrain_highland_ground.png created.')

# B. terrain_stone_paving.png (256 x 48)
# Ancient flagstone pavers with moss joints
p_w, p_h = 256, 48
p_im = Image.new('RGBA', (p_w, p_h), (30, 38, 55, 255))
p_draw = ImageDraw.Draw(p_im)

# Paving course (top 14px)
paver_width = 32
for px in range(0, p_w, paver_width):
    # Flagstone paver body
    p_draw.rectangle([px + 1, 1, px + paver_width - 2, 14], fill=(58, 70, 96, 255))
    # Top paver highlight
    p_draw.line([(px + 2, 2), (px + paver_width - 3, 2)], fill=(92, 110, 145, 230))
    # Moss in vertical joints
    p_draw.line([(px, 0), (px, 15)], fill=(36, 82, 60, 255))
    p_draw.point((px, 1), fill=(56, 128, 92, 255))

# Lower ashlar masonry (y: 15..48)
p_draw.line([(0, 15), (p_w, 15)], fill=(20, 26, 38, 255), width=2)
# Second course
paver_w2 = 42
for px in range(-10, p_w + 10, paver_w2):
    p_draw.rectangle([px + 2, 17, px + paver_w2 - 2, 31], fill=(44, 54, 76, 255))
    p_draw.line([(px, 16), (px, 32)], fill=(22, 28, 42, 255))
# Third course
for px in range(12, p_w + 20, 48):
    p_draw.rectangle([px + 2, 33, px + 46, 46], fill=(36, 45, 64, 255))
    p_draw.line([(px, 32), (px, 48)], fill=(18, 22, 34, 255))

# Golden runic speckles
for rx in (24, 76, 142, 204):
    p_draw.point((rx, 6), fill=(212, 175, 55, 220))
    p_draw.point((rx + 1, 6), fill=(245, 215, 110, 255))

# Ensure seamlessness
p_arr = np.array(p_im)
for x in range(16):
    f = x / 16.0
    p_arr[:, x] = (1.0 - f) * p_arr[:, 256 - 16 + x] + f * p_arr[:, x]
    p_arr[:, 256 - 16 + x] = p_arr[:, x]

Image.fromarray(p_arr, 'RGBA').save(f'{OUTPUT_DIR}/terrain_stone_paving.png')
print('terrain_stone_paving.png created.')

# C. terrain_rocky_outcrop.png (256 x 28)
# Craggy chiseled limestone ledge
r_w, r_h = 256, 28
r_im = Image.new('RGBA', (r_w, r_h), (22, 28, 42, 255))
r_draw = ImageDraw.Draw(r_im)

# Faceted angular rock faces
facets = [0, 36, 82, 134, 186, 230, 256]
for i in range(len(facets) - 1):
    f1, f2 = facets[i], facets[i+1]
    shade = 42 + (i % 3) * 10
    r_draw.polygon([(f1, 2), (f2, 5), (f2, r_h), (f1, r_h)], fill=(shade, shade + 8, shade + 22, 255))
    # Sunlit upper chiseled rim
    r_draw.line([(f1, 2), (f2, 5)], fill=(100, 120, 160, 240), width=2)
    # Deep fracture crease between facets
    r_draw.line([(f2, 2), (f2, r_h)], fill=(15, 19, 30, 255), width=1)

r_arr = np.array(r_im)
for x in range(16):
    f = x / 16.0
    r_arr[:, x] = (1.0 - f) * r_arr[:, 256 - 16 + x] + f * r_arr[:, x]
    r_arr[:, 256 - 16 + x] = r_arr[:, x]

Image.fromarray(r_arr, 'RGBA').save(f'{OUTPUT_DIR}/terrain_rocky_outcrop.png')
print('terrain_rocky_outcrop.png created.')

print('All highland assets updated successfully.')
