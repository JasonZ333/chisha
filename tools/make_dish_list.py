# -*- coding: utf-8 -*-
"""生成完整的菜品 + 图片清单（Markdown），便于核对与补图。

输出：docs/菜品清单.md

用法（在项目根目录）：
    python tools/make_dish_list.py
"""

import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DART = os.path.join(BASE, "lib", "data", "builtin_dishes.dart")
TIERS_DART = os.path.join(BASE, "lib", "data", "price_tiers.dart")
IMG_DIR = os.path.join(BASE, "assets", "dishes")
OUT = os.path.join(BASE, "docs", "菜品清单.md")


def parse_dishes():
    text = open(DART, encoding="utf-8").read()
    pat = re.compile(
        r"Dish\(\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*"
        r"category:\s*'([^']+)',\s*imageFile:\s*'([^']+)'\)"
    )
    out = []
    for m in pat.finditer(text):
        price = float(m.group(3))
        out.append(
            {
                "id": int(m.group(1)),
                "name": m.group(2),
                "price": price,
                "category": m.group(4),
                "stem": os.path.splitext(m.group(5))[0],
            }
        )
    return out


def parse_tiers():
    text = open(TIERS_DART, encoding="utf-8").read()
    return [
        (int(m.group(1)), float(m.group(2)), float(m.group(3)))
        for m in re.finditer(
            r"PriceTier\(level:\s*(\d+),\s*minPrice:\s*([\d.]+),\s*maxPrice:\s*([\d.]+)\)",
            text,
        )
    ]


def tier_of(price, tiers):
    for level, lo, hi in tiers:
        if lo <= price <= hi:
            return level
    return None


def main():
    dishes = parse_dishes()
    tiers = parse_tiers()

    for d in dishes:
        d["tier"] = tier_of(d["price"], tiers)

    # 按档位 → 价格 → id 排序
    dishes.sort(key=lambda d: (d["tier"] or 999, d["price"], d["id"]))

    lines = [
        "# 菜品与图片清单",
        "",
        f"共 **{len(dishes)} 道**菜品。图片放在 `assets/dishes/`（桌面版，900px）"
        "与 `miniprogram/images/dishes/`（小程序版，400px），两处文件名相同。",
        "",
        "> 换图方式：把新图命名为下表的「图片文件名」放进上述目录即可；",
        "> 或直接把图发给助手，由 `tools/pin_commons_image.py` / 替换脚本处理。",
        "",
        "## 档位分布",
        "",
        "| 档位 | 价格区间 | 菜品数 |",
        "| --- | --- | --- |",
    ]
    for level, lo, hi in tiers:
        n = sum(1 for d in dishes if d["tier"] == level)
        rng = "10 元及以下" if level == 10 else f"{int(lo)} ~ {int(hi)} 元"
        lines.append(f"| {level} 元档 | {rng} | {n} |")

    lines += [
        "",
        "## 全部菜品",
        "",
        "| # | 菜名 | 价格 | 档位 | 分类 | 图片文件名 | 图片状态 |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]

    missing = []
    for i, d in enumerate(dishes, 1):
        fname = d["stem"] + ".jpg"
        has = os.path.exists(os.path.join(IMG_DIR, fname))
        if not has:
            missing.append(d)
        lines.append(
            f"| {i} | {d['name']} | {d['price']:g} 元 | {d['tier']} 元档 | {d['category']} "
            f"| `{fname}` | {'✅ 已有' if has else '❌ **待补**'} |"
        )

    lines += ["", "## 待补图片", ""]
    if missing:
        lines.append(f"共 **{len(missing)} 道**还没有图片：")
        lines.append("")
        for d in missing:
            lines.append(f"- **{d['name']}**（{d['price']:g} 元，{d['tier']} 元档）→ `{d['stem']}.jpg`")
        lines.append("")
        lines.append("> 补齐后运行 `python tools/sync_miniprogram_images.py` 生成小程序压缩图。")
    else:
        lines.append("无，全部菜品都有图片。")

    lines.append("")
    open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    print(f"菜品 {len(dishes)} 道（缺图 {len(missing)} 道）→ {OUT}")


if __name__ == "__main__":
    main()
