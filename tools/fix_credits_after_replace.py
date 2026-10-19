# -*- coding: utf-8 -*-
"""调整署名清单：去掉被替换菜品的旧条目，补上新高价位的用户提供条目。

用法（在项目根目录）：
    python tools/fix_credits_after_replace.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_commons_images as F  # noqa: E402

# 被替换掉的两道菜（图片已删，署名条目也要去掉）
REMOVE = ["dish_54_hongtangfagao.jpg", "dish_55_liangbanhuanggua.jpg"]

# 新换上的两道菜：图由需求方提供，先占位记录
ADD = {
    "dish_54_hualaishi.jpg": {
        "dish_name": "华莱士9.9套餐",
        "artist": "用户提供",
        "license": "用户确认可商用",
        "source": "用户提供（图待补）",
    },
    "dish_55_sangenang.jpg": {
        "dish_name": "三个馕",
        "artist": "用户提供",
        "license": "用户确认可商用",
        "source": "用户提供（图待补）",
    },
}


def main():
    rows = F.load_existing_credits()
    before = len(rows)

    for key in REMOVE:
        rows.pop(key, None)
    for key, value in ADD.items():
        rows[key] = dict(value)

    dishes = F.parse_dishes()
    by_stem = {os.path.splitext(d["image_file"])[0]: d for d in dishes}

    ordered = []
    for key in sorted(
        rows, key=lambda f: by_stem.get(os.path.splitext(f)[0], {}).get("id", 9999)
    ):
        entry = dict(rows[key])
        entry["file"] = key
        ordered.append(entry)

    F.write_credits(ordered)
    print(f"署名条目：{before} → {len(ordered)}")
    print(f"  移除 {len(REMOVE)} 条旧记录，新增 {len(ADD)} 条")


if __name__ == "__main__":
    main()
