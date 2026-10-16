# -*- coding: utf-8 -*-
"""为小程序渲染与 Flutter 桌面端**完全一致**的 Material 图标（PNG）。

小程序没有 Material 图标字体，所以直接把 Flutter 自带的
materialicons-regular.otf 里对应的字形渲染成 PNG。

用法：
    python tools/make_mp_icons.py
输出：
    miniprogram/images/icons/*.png
"""

import os

from PIL import Image, ImageDraw, ImageFont

FONT_PATH = r"D:\flutter\bin\cache\artifacts\material_fonts\materialicons-regular.otf"

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, "miniprogram", "images", "icons")

# 与 lib/pages/home_page.dart 中使用的图标一一对应
BROWN = (139, 74, 43, 255)      # #8B4A2B 主题棕
DARK = (107, 74, 54, 255)       # #6B4A36 设置齿轮
CREAM = (255, 248, 242, 255)    # #FFF8F2 实心按钮上的白字

SPECS = [
    # 文件名                        码点      渲染尺寸  颜色    说明
    ("icon_bowl.png",             0xF2E9, 144, BROWN, "Icons.ramen_dining_outlined 碗筷"),
    ("icon_settings.png",         0xF36E,  64, DARK,  "Icons.settings_outlined 设置齿轮"),
    ("icon_shuffle.png",          0xE5A1,  72, BROWN, "Icons.shuffle 所有价位随机"),
    ("icon_shuffle_white.png",    0xE5A1,  72, CREAM, "同上，实心卡片上用白色"),
    ("icon_tune.png",             0xE683,  72, BROWN, "Icons.tune 分价位随机"),
    ("icon_location.png",         0xF193,  72, BROWN, "Icons.location_on_outlined 附近美食"),
    ("icon_chevron.png",          0xE15F,  56, BROWN, "Icons.chevron_right 箭头"),
    ("icon_chevron_white.png",    0xE15F,  56, CREAM, "同上，实心卡片上用白色"),
]

PAD = 6  # 四周留白，避免贴边


def render(codepoint, size, color, out_path):
    font = ImageFont.truetype(FONT_PATH, size)
    canvas = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.text((size, size), chr(codepoint), font=font, fill=color)

    box = canvas.getbbox()
    if box is None:
        raise RuntimeError(f"字形渲染为空：U+{codepoint:04X}")
    glyph = canvas.crop(box)

    out = Image.new("RGBA", (glyph.width + PAD * 2, glyph.height + PAD * 2), (0, 0, 0, 0))
    out.paste(glyph, (PAD, PAD))
    out.save(out_path, "PNG", optimize=True)
    return out.size, os.path.getsize(out_path)


def main():
    if not os.path.exists(FONT_PATH):
        raise SystemExit(f"找不到 Material 图标字体：{FONT_PATH}")
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"字体: {FONT_PATH}\n输出: {OUT_DIR}\n")
    for name, cp, size, color, desc in SPECS:
        path = os.path.join(OUT_DIR, name)
        (w, h), nbytes = render(cp, size, color, path)
        print(f"  {name:<26} U+{cp:04X}  {w}x{h}  {nbytes/1024:.1f} KB   {desc}")

    print(f"\n共 {len(SPECS)} 个图标")


if __name__ == "__main__":
    main()
