# -*- coding: utf-8 -*-
"""菜品 / 档位数据的**唯一读取入口**。

## 数据源已迁移

早期菜品与档位数据放在 Flutter 侧（`lib/data/builtin_dishes.dart`、
`lib/data/price_tiers.dart`），再由 `tools/sync_miniprogram_data.py` 生成到小程序。
桌面端已停止维护，所以把数据源直接搬到了小程序侧：

    miniprogram/data/dishes.js   ← 菜品（手工维护）
    miniprogram/data/tiers.js    ← 价格档位（手工维护）

所有工具（下载图片、生成菜品清单、核对页、署名清单等）都通过这里读取，
保证**只有一个数据源**，不会再出现 Dart 与 JS 两份数据打架的情况。

以后加菜/改价格/换图，只改上面两个 JS 文件即可，不用碰 Flutter。
"""

import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DISHES_JS = os.path.join(BASE, "miniprogram", "data", "dishes.js")
TIERS_JS = os.path.join(BASE, "miniprogram", "data", "tiers.js")

# dishes.js 里的一条：
#   { id: 1, name: '茶叶蛋', price: 3, category: '菜品', image: 'dish_01_chayedan.jpg' },
DISH_RE = re.compile(
    r"\{\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*"
    r"category:\s*'([^']+)',\s*image:\s*'([^']+)'\s*\}",
    re.S,
)

# tiers.js 里的一条：
#   { level: 10, min: 0, max: 10, label: '10 元档', rangeLabel: '10 元及以下' },
TIER_RE = re.compile(
    r"\{\s*level:\s*(\d+),\s*min:\s*([\d.]+),\s*max:\s*([\d.]+),\s*"
    r"label:\s*'([^']+)',\s*rangeLabel:\s*'([^']+)'\s*\}",
    re.S,
)

MAX_PRICE_RE = re.compile(r"maxVisiblePrice:\s*([\d.]+)")


def parse_dishes():
    """读 `miniprogram/data/dishes.js`。

    返回 `[{id, name, price, category, image_file, stem}]`：
    - `image_file` 是完整文件名（含 `.jpg`）
    - `stem` 是去掉扩展名的主干（图片文件按 `<stem>.jpg` 存放）
    """
    text = open(DISHES_JS, encoding="utf-8").read()
    dishes = []
    for m in DISH_RE.finditer(text):
        price = float(m.group(3))
        image_file = m.group(5)
        dishes.append(
            {
                "id": int(m.group(1)),
                "name": m.group(2),
                "price": int(price) if price == int(price) else price,
                "category": m.group(4),
                "image_file": image_file,
                "stem": os.path.splitext(image_file)[0],
            }
        )
    return dishes


def parse_tiers():
    """读 `miniprogram/data/tiers.js` → `[{level, min, max, label, rangeLabel}]`"""
    text = open(TIERS_JS, encoding="utf-8").read()
    return [
        {
            "level": int(m.group(1)),
            "min": int(float(m.group(2))),
            "max": int(float(m.group(3))),
            "label": m.group(4),
            "rangeLabel": m.group(5),
        }
        for m in TIER_RE.finditer(text)
    ]


def tier_ranges():
    """只要区间时用这个 → `[(level, min, max)]`"""
    return [(t["level"], t["min"], t["max"]) for t in parse_tiers()]


def max_visible_price():
    """`maxVisiblePrice`（读不到默认 100）"""
    text = open(TIERS_JS, encoding="utf-8").read()
    m = MAX_PRICE_RE.search(text)
    return int(float(m.group(1))) if m else 100
