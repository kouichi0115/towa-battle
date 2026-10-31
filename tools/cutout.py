"""Cut TOWA out of the white background: flood fill from the image border."""
import sys
from collections import deque
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()

def is_bg(c):
    r, g, b = c
    return max(c) - min(c) <= 14 and min(c) >= 185

mask = Image.new("L", (w, h), 255)
m = mask.load()
seen = bytearray(w * h)
q = deque()
for x in range(w):
    q.append((x, 0)); q.append((x, h - 1))
for y in range(h):
    q.append((0, y)); q.append((w - 1, y))
while q:
    x, y = q.popleft()
    i = y * w + x
    if seen[i]:
        continue
    seen[i] = 1
    if not is_bg(px[x, y]):
        continue
    m[x, y] = 0
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
            q.append((nx, ny))

mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
out = im.convert("RGBA")
out.putalpha(mask)
out = out.crop(mask.getbbox())
scale = 420 / out.height
out = out.resize((round(out.width * scale), 420), Image.LANCZOS)
out.save(dst)
print(out.size)
