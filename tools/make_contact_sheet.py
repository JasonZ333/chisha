# -*- coding: utf-8 -*-
"""把菜品图片拼成带菜名的核对表（contact sheet），一眼看完，适合人工/批量核对。

用法：
    python tools/make_contact_sheet.py            # 只拼「重点核对」的那些（英文别名检索）
    python tools/make_contact_sheet.py --all      # 拼全部 50 道

输出：
    docs/核对表_重点.png      或 docs/核对表_全部.png
"""

import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "tools"))
import fetch_commons_images as fetch  # noqa: E402

DART_DISHES = os.path.join(BASE, "lib", "data", "builtin_dishes.dart")
IMAGE_DIR = os.path.join(BASE, "assets", "dishes")

COLS = 4
TILE_W, TILE_H = 400, 300
BAR_H = 74
PAD = 12

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def parse_dishes():
    text = open(DART_DISHES, encoding="utf-8").read()
    pattern = re.compile(
        r"Dish\(\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*[\d.]+,\s*"
        r"category:\s*'[^']+',\s*imageFile:\s*'([^']+)'\s*\)"
    )
    return [
        {"id": int(m.group(1)), "name": m.group(2), "stem": os.path.splitext(m.group(3))[0]}
        for m in pattern.finditer(text)
    ]


def main():
    want_all = "--all" in sys.argv
    dishes = parse_dishes()
    if not want_all:
        dishes = [d for d in dishes if d["name"] in fetch.ALIASES]

    name_font = load_font(30)
    file_font = load_font(17)

    rows = (len(dishes) + COLS - 1) // COLS
    width = COLS * TILE_W + (COLS + 1) * PAD
    height = rows * (TILE_H + BAR_H) + (rows + 1) * PAD

    sheet = Image.new("RGB", (width, height), (247, 240, 232))
    draw = ImageDraw.Draw(sheet)

    for index, dish in enumerate(dishes):
        col = index % COLS
        row = index // COLS
        x = PAD + col * (TILE_W + PAD)
        y = PAD + row * (TILE_H + BAR_H + PAD)

        path = os.path.join(IMAGE_DIR, dish["stem"] + ".jpg")
        if os.path.exists(path):
            img = Image.open(path).convert("RGB")
            # 居中裁切成 4:3，避免变形
            scale = max(TILE_W / img.width, TILE_H / img.height)
            img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
            left = (img.width - TILE_W) // 2
            top = (img.height - TILE_H) // 2
            img = img.crop((left, top, left + TILE_W, top + TILE_H))
            sheet.paste(img, (x, y))
        else:
            draw.rectangle([x, y, x + TILE_W, y + TILE_H], fill=(230, 213, 200))
            draw.text((x + 12, y + 12), "缺少图片", font=name_font, fill=(140, 100, 80))

        # 色条 + 菜名 + 文件名
        bar_y = y + TILE_H
        draw.rectangle([x, bar_y, x + TILE_W, bar_y + BAR_H], fill=(255, 255, 255))
        draw.text((x + 12, bar_y + 8), f"{dish['id']:>2}. {dish['name']}", font=name_font, fill=(43, 35, 32))
        draw.text((x + 12, bar_y + 46), dish["stem"] + ".jpg", font=file_font, fill=(150, 138, 128))

    suffix = "全部" if want_all else "重点"
    out = os.path.join(BASE, "docs", f"核对表_{suffix}.png")
    sheet.save(out, "PNG", optimize=True)
    print(f"{len(dishes)} 道菜 → {out}  ({width}x{height}, {os.path.getsize(out)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
