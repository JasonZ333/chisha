# -*- coding: utf-8 -*-
"""生成小程序侧的 `miniprogram/data/credits.js`（图片署名）。

## 数据源迁移说明

早期本脚本负责把 Flutter 侧的菜品/档位数据"同步"成小程序的 `dishes.js`、
`tiers.js`。桌面端停止维护后，数据源已经搬到了小程序侧，那两个文件改为
**手工维护**（见 `tools/dish_source.py`），本脚本不再生成它们。

现在只剩两件事：
1. 校验每道菜是否都有打包图片（缺图会列出来）
2. 把 `docs/图片来源.md` 的署名数据生成 `miniprogram/data/credits.js`
   —— CC BY-SA 等许可要求在应用内展示署名

用法：
    python tools/sync_miniprogram_data.py
"""

import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dish_source import parse_dishes  # noqa: E402

IMAGE_DIR = os.path.join(BASE, "assets", "dishes")
OUT_DIR = os.path.join(BASE, "miniprogram", "data")
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


def esc(value):
    """转义成可以安全塞进单引号字符串的内容"""
    return str(value).replace("\\", "\\\\").replace("'", "\\'")


def main():
    dishes = parse_dishes()
    os.makedirs(OUT_DIR, exist_ok=True)

    # 校验每道菜都有打包图片，避免小程序里出现空白
    missing = [
        d["stem"] for d in dishes if not os.path.exists(os.path.join(IMAGE_DIR, d["stem"] + ".jpg"))
    ]

    # 署名数据：供小程序内「设置 → 图片来源与署名」展示
    credits = parse_credits()
    lines = [HEADER, "// 来源：docs/图片来源.md\n", "module.exports = [\n"]
    for c in credits:
        lines.append(
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
    lines.append("];\n")
    open(OUT_CREDITS, "w", encoding="utf-8", newline="\n").write("".join(lines))

    user_count = sum(1 for c in credits if c["kind"] == "user")
    print(f"菜品 {len(dishes)} 道（来自 miniprogram/data/dishes.js）")
    print(f"署名 {len(credits)} 条（其中用户提供 {user_count} 条）→ {OUT_CREDITS}")
    if missing:
        print(f"\n⚠️ 以下 {len(missing)} 道菜缺少打包图片，小程序里会显示空白：")
        for stem in missing:
            print("   " + stem)
    else:
        print(f"\n✅ 全部 {len(dishes)} 道菜的打包图片齐全")


if __name__ == "__main__":
    main()
