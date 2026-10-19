# -*- coding: utf-8 -*-
"""生成「新增菜品」的图片核对拼图（只挑 id >= 指定值的菜）。

用法：
    python make_new_dish_sheet.py [起始id，默认51]
"""

import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DART = os.path.join(BASE, "lib", "data", "builtin_dishes.dart")
IMG = os.path.join(BASE, "assets", "dishes")
FONT_CANDIDATES = [r"C:\Windows\Fonts\msyhbd.ttc", r"C:\Windows\Fonts\msyh.ttc"]

COLS, TW, TH, BAR, PAD = 4, 400, 300, 92, 12


def load_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 51
    text = open(DART, encoding="utf-8").read()
    pat = re.compile(
        r"Dish\(\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*"
        r"category:\s*'([^']+)',\s*imageFile:\s*'([^']+)'\)"
    )
    dishes = []
    for m in pat.finditer(text):
        did = int(m.group(1))
        if did >= start:
            dishes.append(
                (did, m.group(2), m.group(3), m.group(4), os.path.splitext(m.group(5))[0])
            )

    if not dishes:
        raise SystemExit(f"没有 id >= {start} 的菜品")

    rows = (len(dishes) + COLS - 1) // COLS
    W = COLS * TW + (COLS + 1) * PAD
    H = rows * (TH + BAR + PAD) + PAD
    sheet = Image.new("RGB", (W, H), (247, 240, 232))
    d = ImageDraw.Draw(sheet)
    fname = load_font(30)
    fsmall = load_font(19)

    for i, (did, name, price, cat, stem) in enumerate(dishes):
        c, r = i % COLS, i // COLS
        x = PAD + c * (TW + PAD)
        y = PAD + r * (TH + BAR + PAD)
        p = os.path.join(IMG, stem + ".jpg")
        if os.path.exists(p):
            im = Image.open(p).convert("RGB")
            s = max(TW / im.width, TH / im.height)
            im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
            l, t = (im.width - TW) // 2, (im.height - TH) // 2
            sheet.paste(im.crop((l, t, l + TW, t + TH)), (x, y))
        else:
            d.rectangle([x, y, x + TW, y + TH], fill=(230, 213, 200))
            d.text((x + 12, y + 12), "缺图", font=fname, fill=(140, 100, 80))
        d.rectangle([x, y + TH, x + TW, y + TH + BAR], fill=(255, 255, 255))
        d.text((x + 12, y + TH + 8), f"{did}. {name}", font=fname, fill=(43, 35, 32))
        d.text(
            (x + 12, y + TH + 50),
            f"{price} 元 · {cat} · {stem}.jpg",
            font=fsmall,
            fill=(139, 74, 43),
        )

    out = os.path.join(BASE, "docs", f"核对表_新增{len(dishes)}道.png")
    sheet.save(out, "PNG", optimize=True)
    print(f"新增 {len(dishes)} 道 → {out}")
    print(f"{W}x{H}, {os.path.getsize(out)/1024:.0f} KB")


if __name__ == "__main__":
    main()
