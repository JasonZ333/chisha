# -*- coding: utf-8 -*-
"""把某道菜的图片**指定**为 Commons 上的某个文件（按标题精确挑选）。

自动搜索有时会取到「某家餐厅 / 某个摊位」的照片，而不是菜本身；
这个工具让你按标题钉住具体文件，并同步更新署名清单。

用法：
    python tools/pin_commons_image.py "白粥配咸菜" "File:MilletPorridgeWithPickle.JPG"
    python tools/pin_commons_image.py --batch 钉图清单.tsv
        （清单每行：菜名<TAB>Commons 文件标题）
"""

import argparse
import io
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_commons_images as F  # noqa: E402

DESKTOP_WIDTH = 900
JPEG_QUALITY = 82
MINI_WIDTH = 400
MINI_QUALITY = 68

MINI_DIR = os.path.join(F.BASE, "miniprogram", "images", "dishes")


def fetch_file_info(title):
    """取某个 Commons 文件的缩略图地址与署名信息"""
    data = F.api_get(
        {
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
            "iiurlwidth": str(DESKTOP_WIDTH),
        }
    )
    pages = (data.get("query") or {}).get("pages") or {}
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        if not info:
            continue
        meta = info.get("extmetadata") or {}

        def field(key):
            import re

            value = (meta.get(key) or {}).get("value", "")
            return re.sub(r"<[^>]+>", "", value).strip()

        return {
            "title": page.get("title", title),
            "thumb": info.get("thumburl") or info.get("url"),
            "page": info.get("descriptionurl", ""),
            "artist": F.clean_artist(field("Artist")),
            "license": field("LicenseShortName") or "（未标注许可）",
        }
    return None


def save_resized(src_bytes, dst, width, quality):
    img = Image.open(io.BytesIO(src_bytes)).convert("RGB")
    if img.width > width:
        ratio = width / img.width
        img = img.resize((width, max(1, int(img.height * ratio))), Image.LANCZOS)
    img.save(dst, "JPEG", quality=quality, optimize=True)
    return os.path.getsize(dst)


def pin(dish_name, title, dishes):
    dish = None
    for d in dishes:
        if d["name"] == dish_name:
            dish = d
            break
    if dish is None:
        print(f"  [跳过] 找不到菜品：{dish_name}")
        return False

    info = fetch_file_info(title)
    if not info or not info["thumb"]:
        print(f"  [失败] 取不到文件信息：{title}")
        return False

    raw = F.download(info["thumb"])
    # fetch_commons_images.parse_dishes() 给出的字段是 image_file（不带扩展名的约定见下）
    stem = os.path.splitext(dish["image_file"])[0]
    file_name = stem + ".jpg"

    size1 = save_resized(raw, os.path.join(F.BASE, "assets", "dishes", file_name),
                         DESKTOP_WIDTH, JPEG_QUALITY)
    os.makedirs(MINI_DIR, exist_ok=True)
    size2 = save_resized(raw, os.path.join(MINI_DIR, file_name), MINI_WIDTH, MINI_QUALITY)

    # 更新署名
    rows = F.load_existing_credits()
    rows[file_name] = {
        "dish_name": dish_name,
        "artist": info["artist"],
        "license": info["license"],
        "source": f"[Commons]({info['page']})",
    }
    # 保持按菜品 id 排序
    by_stem = {os.path.splitext(d["image_file"])[0]: d for d in dishes}
    ordered = []
    for key in sorted(rows, key=lambda f: by_stem.get(os.path.splitext(f)[0], {}).get("id", 9999)):
        entry = dict(rows[key])
        entry["file"] = key  # write_credits 需要文件名
        ordered.append(entry)
    F.write_credits(ordered)

    print(f"  OK {file_name}  桌面 {size1/1024:.0f} KB / 小程序 {size2/1024:.0f} KB  {info['license']}")
    print(f"     来源 {info['title']}")
    return True


def main():
    ap = argparse.ArgumentParser(description="把某道菜的图片钉为指定的 Commons 文件")
    ap.add_argument("dish", nargs="?")
    ap.add_argument("title", nargs="?")
    ap.add_argument("--batch", help="清单文件：每行 菜名<TAB>Commons 文件标题")
    args = ap.parse_args()

    dishes = F.parse_dishes()
    jobs = []
    if args.batch:
        for line in open(args.batch, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split("\t")]
            if len(parts) >= 2:
                jobs.append((parts[0], parts[1]))
    elif args.dish and args.title:
        jobs.append((args.dish, args.title))
    else:
        ap.print_help()
        return 1

    ok = 0
    for dish_name, title in jobs:
        print(f"【{dish_name}】← {title}")
        if pin(dish_name, title, dishes):
            ok += 1
    print(f"\n完成：成功 {ok} / 共 {len(jobs)}")
    return 0 if ok == len(jobs) else 1


if __name__ == "__main__":
    sys.exit(main())
