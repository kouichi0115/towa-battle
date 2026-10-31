"""Make the rival 'Dark TOWA' color variant from the cut-out image."""
import colorsys
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        # rotate every hue the same way so shading stays smooth
        h = (h + 0.5) % 1.0
        s = min(1.0, s * 1.15 + 0.12)
        v = v * 0.78
        nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
        px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
im.save(dst)
