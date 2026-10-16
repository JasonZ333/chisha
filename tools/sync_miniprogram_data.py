# -*- coding: utf-8 -*-
"""把 Flutter 版的数据同步到微信小程序版，避免手工转录出错。

生成：
    miniprogram/data/dishes.js   50 道菜（来自 lib/data/builtin_dishes.dart）
    miniprogram/data/tiers.js    10 个价格档位（来自 lib/data/price_tiers.dart）
    miniprogram/data/credits.js  图片署名（来自 docs/图片来源.md）

图片字段统一写成 <文件名主干>.jpg —— 小程序里打包的就是图库下载下来的 JPEG。

用法：
    python tools/sync_miniprogram_data.py
"""

import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DART_DISHES = os.path.join(BASE, "lib", "data", "builtin_dishes.dart")
DART_TIERS = os.path.join(BASE, "lib", "data", "price_tiers.dart")
IMAGE_DIR = os.path.join(BASE, "assets", "dishes")

OUT_DIR = os.path.join(BASE, "miniprogram", "data")
OUT_DISHES = os.path.join(OUT_DIR, "dishes.js")
OUT_TIERS = os.path.join(OUT_DIR, "tiers.js")
OUT_CREDITS = os.path.join(OUT_DIR, "credits.js")
CREDITS_MD = os.path.join(BASE, "docs", "图片来源.md")

HEADER = "// 本文件由 tools/sync_miniprogram_data.py 自动生成，请勿手工编辑。\n"


def parse_credits():
    """解析 docs/图片来源.md → 署名条目（供小程序内展示）"""
    if not os.path.exists(CREDITS_MD):
        return []
    row = re.compile(
        r"^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$"
    )
    out = []
    for line in open(CREDITS_MD, encoding="utf-8"):
        m = row.match(line.strip())
        if not m:
            continue
        dish_name, file_name, author, license_name, source = m.groups()
        out.append(
            {
                "dish": dish_name,
                "file": file_name,
                "author": author or "（未标注作者）",
                "license": license_name or "（未标注许可）",
                "source": source or "—",
                "kind": "user" if "用户提供" in source else "commons",
            }
        )
    return out


def parse_dishes():
    text = open(DART_DISHES, encoding="utf-8").read()
    pattern = re.compile(
        r"Dish\(\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*"
        r"category:\s*'([^']+)',\s*imageFile:\s*'([^']+)'\s*\)"
    )
    out = []
    for m in pattern.finditer(text):
        price = float(m.group(3))
        out.append(
            {
                "id": int(m.group(1)),
                "name": m.group(2),
                "price": int(price) if price == int(price) else price,
                "category": m.group(4),
                "stem": os.path.splitext(m.group(5))[0],
            }
        )
    return out


def parse_tiers():
    text = open(DART_TIERS, encoding="utf-8").read()
    pattern = re.compile(
        r"PriceTier\(level:\s*(\d+),\s*minPrice:\s*([\d.]+),\s*maxPrice:\s*([\d.]+)\)"
    )
    out = []
    for m in pattern.finditer(text):
        level, lo, hi = int(m.group(1)), float(m.group(2)), float(m.group(3))
        out.append(
            {
                "level": level,
                "min": int(lo),
                "max": int(hi),
                "label": f"{level} 元档",
                "rangeLabel": "10 元及以下" if level == 10 else f"{int(lo)} ~ {int(hi)} 元",
            }
        )
    mx = re.search(r"kMaxVisiblePrice\s*=\s*([\d.]+)", text)
    return out, (int(float(mx.group(1))) if mx else 100)


def main():
    dishes = parse_dishes()
    tiers, max_price = parse_tiers()
    os.makedirs(OUT_DIR, exist_ok=True)

    # 校验每道菜都有打包图片，避免小程序里出现空白
    missing = [
        d["stem"] for d in dishes if not os.path.exists(os.path.join(IMAGE_DIR, d["stem"] + ".jpg"))
    ]

    lines = [HEADER, "// 来源：lib/data/builtin_dishes.dart\n", "module.exports = [\n"]
    for d in dishes:
        name = d["name"].replace("\\", "\\\\").replace("'", "\\'")
        lines.append(
            "  { id: %d, name: '%s', price: %s, category: '%s', image: '%s.jpg' },\n"
            % (d["id"], name, d["price"], d["category"], d["stem"])
        )
    lines.append("];\n")
    open(OUT_DISHES, "w", encoding="utf-8", newline="\n").write("".join(lines))

    tlines = [
        HEADER,
        "// 来源：lib/data/price_tiers.dart\n",
        "// 10 元档 = 10 元及以下；20 元档 = 11~20；……；100 元档 = 91~100。\n",
        "// 超过 maxVisiblePrice 的菜品完全不显示。\n",
        "module.exports = {\n",
        "  maxVisiblePrice: %d,\n" % max_price,
        "  tiers: [\n",
    ]
    for t in tiers:
        tlines.append(
            "    { level: %d, min: %d, max: %d, label: '%s', rangeLabel: '%s' },\n"
            % (t["level"], t["min"], t["max"], t["label"], t["rangeLabel"])
        )
    tlines.append("  ],\n};\n")
    open(OUT_TIERS, "w", encoding="utf-8", newline="\n").write("".join(tlines))

    # 署名数据：供小程序内「设置 → 图片来源与署名」展示（CC BY-SA 要求署名）
    credits = parse_credits()
    clines = [HEADER, "// 来源：docs/图片来源.md\n", "module.exports = [\n"]
    for c in credits:
        def esc(s):
            return str(s).replace("\\", "\\\\").replace("'", "\\'")

        clines.append(
            "  { dish: '%s', file: '%s', author: '%s', license: '%s', source: '%s', kind: '%s' },\n"
            % (
                esc(c["dish"]),
                esc(c["file"]),
                esc(c["author"]),
                esc(c["license"]),
                esc(c["source"]),
                c["kind"],
            )
        )
    clines.append("];\n")
    open(OUT_CREDITS, "w", encoding="utf-8", newline="\n").write("".join(clines))

    user_count = sum(1 for c in credits if c["kind"] == "user")

    print(f"菜品 {len(dishes)} 道 → {OUT_DISHES}")
    print(f"档位 {len(tiers)} 个（上限 {max_price} 元）→ {OUT_TIERS}")
    print(
        f"署名 {len(credits)} 条（其中用户提供 {user_count} 条）→ {OUT_CREDITS}"
    )
    if missing:
        print(f"\n⚠️ 以下 {len(missing)} 道菜缺少打包图片，小程序里会显示空白：")
        for stem in missing:
            print("   " + stem)
    else:
        print("\n✅ 50 道菜的打包图片齐全")


if __name__ == "__main__":
    main()
