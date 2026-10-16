# -*- coding: utf-8 -*-
"""生成统一占位图：assets/placeholder/food_placeholder.png"""
import os
from PIL import Image, ImageDraw, ImageFont

# 项目根目录（脚本位于 tools/ 下），不依赖任何绝对路径
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "assets", "placeholder", "food_placeholder.png")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

W, H = 800, 500
BG = (247, 240, 232)
PLATE = (255, 255, 255)
PLATE_EDGE = (226, 210, 194)
ACCENT = (232, 89, 12)
TEXT = (150, 133, 118)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# 背景斜纹
for x in range(-H, W, 40):
    d.line([(x, H), (x + H, 0)], fill=(242, 233, 223), width=14)

# 盘子
cx, cy, r = W // 2, H // 2 - 10, 130
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PLATE, outline=PLATE_EDGE, width=6)
d.ellipse([cx - r + 34, cy - r + 34, cx + r - 34, cy + r - 34], outline=(238, 228, 216), width=4)

# 盘子里的餐具（筷子 + 叉子简化图形）
d.line([(cx - 44, cy - 46), (cx + 44, cy + 46)], fill=ACCENT, width=9)
d.line([(cx - 20, cy - 58), (cx + 62, cy + 18)], fill=ACCENT, width=9)


def load_font(size):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "simsun.ttc"):
        p = os.path.join(r"C:\Windows\Fonts", name)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


font_big = load_font(46)
font_small = load_font(26)


def center_text(text, font, y, fill):
    box = d.textbbox((0, 0), text, font=font)
    d.text(((W - (box[2] - box[0])) / 2 - box[0], y), text, font=font, fill=fill)


center_text("图片待生成", font_big, cy + r + 34, TEXT)
center_text("把 AI 生成好的图片放进「图片文件夹」即可自动替换", font_small, cy + r + 96, (176, 160, 145))

img.save(OUT, "PNG")
print("OK", OUT, os.path.getsize(OUT), "bytes", img.size)
