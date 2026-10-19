# -*- coding: utf-8 -*-
"""替换某道菜的图片，并自动走完后续所有环节。

用法：
    # 最小用法：只要菜名 + 新图路径
    python tools/replace_dish_image.py "干锅牛蛙" "D:\\图\\牛蛙.jpg"

    # 带上来源信息（会写进署名清单，建议填）
    python tools/replace_dish_image.py "干锅牛蛙" "D:\\图\\牛蛙.jpg" ^
        --author "我自己拍的" --license "自有版权" --credit "用户提供"

    # 一次替换多道菜（清单文件，每行：菜名<TAB>图片路径[<TAB>作者[<TAB>许可]]）
    python tools/replace_dish_image.py --batch 替换清单.txt

    # 先看看会做什么，不实际改文件
    python tools/replace_dish_image.py "干锅牛蛙" "D:\\图\\牛蛙.jpg" --dry-run

自动完成的步骤：
    1. 旧图备份到 build/image_backup/（可随时还原，build/ 不进版本库）
    2. 生成 900px 的桌面版图片 assets/dishes/<文件名>.jpg
    3. 更新 docs/图片来源.md 与 assets/credits.md 的署名记录
    4. 生成 400px 的小程序版图片 miniprogram/images/dishes/<同名>.jpg
    5. 重新生成核对页与拼图核对表

替换完请跑一遍测试（golden 截图里的菜品图会变）：
    cd D:\\chisha
    tools\\fl.cmd test            # 如结果弹窗 golden 失败，就 tools\\fl.cmd test --update-goldens
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time

from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dish_source import parse_dishes  # noqa: E402

DESKTOP_DIR = os.path.join(BASE, "assets", "dishes")
MINI_DIR = os.path.join(BASE, "miniprogram", "images", "dishes")
BACKUP_DIR = os.path.join(BASE, "build", "image_backup")
CREDITS_DOC = os.path.join(BASE, "docs", "图片来源.md")
CREDITS_ASSET = os.path.join(BASE, "assets", "credits.md")

DESKTOP_WIDTH = 900
DESKTOP_QUALITY = 82
MINI_WIDTH = 400
MINI_QUALITY = 68

ROW = re.compile(
    r"^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$"
)


def resolve_dish(key, dishes):
    """按菜名或文件名主干找菜；找不到返回 None"""
    for d in dishes:
        if d["name"] == key or d["stem"] == key:
            return d
    # 宽松匹配：包含关系
    hits = [d for d in dishes if key in d["name"] or key in d["stem"]]
    return hits[0] if len(hits) == 1 else None


def read_credits():
    rows = {}
    order = []
    if not os.path.exists(CREDITS_DOC):
        return rows, order
    for line in open(CREDITS_DOC, encoding="utf-8"):
        m = ROW.match(line.strip())
        if m:
            rows[m.group(2)] = {
                "dish_name": m.group(1),
                "artist": m.group(3),
                "license": m.group(4),
                "credit": m.group(5),
            }
            order.append(m.group(2))
    return rows, order


def clean_cell(value):
    """清理会破坏 Markdown 表格的内容：换行、竖线（否则整行会被截断而丢失）。"""
    text = re.sub(r"\s+", " ", str(value or ""))
    return text.replace("|", "/").strip()


def clean_artist(value):
    """Commons 的 Artist 字段有时把整段许可条款也塞进来，这里只留作者名。"""
    text = clean_cell(value)
    for marker in (
        "This file is licensed",
        "I'd appreciate",
        "You are free",
        "Under the following conditions",
        "Creative Commons",
        "https://creativecommons.org",
    ):
        idx = text.find(marker)
        if idx > 0:
            text = text[:idx].strip()
            break
    return text[:80].strip() or "（未标注作者）"


def write_credits(rows, order, dishes):
    """按菜品 id 顺序重写署名清单，并同步一份到 assets/credits.md"""
    by_stem = {d["stem"]: d for d in dishes}
    stem_order = sorted(
        rows.keys(),
        key=lambda f: by_stem.get(os.path.splitext(f)[0], {}).get("id", 9999),
    )
    lines = [
        "# 菜品图片来源与署名",
        "",
        "本文件列出 `assets/dishes/` 下每张图片的来源、作者与许可。",
        "来自 Wikimedia Commons 的图片按各自标注的许可使用（CC BY / CC BY-SA 等要求署名）；",
        "由需求方自行提供并替换的图片，来源列写明「用户提供」。",
        "",
        "| 菜品 | 文件名 | 作者 | 许可 | 来源 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for f in stem_order:
        r = rows[f]
        lines.append(
            f"| {clean_cell(r['dish_name'])} | `{f}` | {clean_artist(r['artist'])} "
            f"| {clean_cell(r['license'])} | {clean_cell(r['credit']) or '—'} |"
        )
    commons = sum(1 for f in stem_order if "commons.wikimedia.org" in rows[f]["credit"])
    lines += [
        "",
        f"共 {len(stem_order)} 张图片，其中 {commons} 张来自 "
        "[Wikimedia Commons](https://commons.wikimedia.org/)，"
        f"{len(stem_order) - commons} 张由需求方提供。",
        "若某张图片的许可要求署名，请保留本文件。",
        "",
    ]
    text = "\n".join(lines)
    open(CREDITS_DOC, "w", encoding="utf-8").write(text)
    open(CREDITS_ASSET, "w", encoding="utf-8").write(text)


def save_resized(src, dst, width, quality):
    img = Image.open(src)
    if img.mode != "RGB":
        img = img.convert("RGB")
    if img.width > width:
        ratio = width / img.width
        img = img.resize((width, max(1, int(img.height * ratio))), Image.LANCZOS)
    img.save(dst, "JPEG", quality=quality, optimize=True)
    return os.path.getsize(dst)


def replace_one(dish, src_path, author, license_text, credit, dry_run=False):
    if not os.path.exists(src_path):
        print(f"  ❌ 找不到图片：{src_path}")
        return False

    stem = dish["stem"]
    file_name = stem + ".jpg"
    desktop = os.path.join(DESKTOP_DIR, file_name)
    mini = os.path.join(MINI_DIR, file_name)

    if dry_run:
        print(f"  （dry-run）{dish['name']}：{src_path} → {desktop}")
        return True

    # 1) 备份旧图
    if os.path.exists(desktop):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = time.strftime("%Y%m%d_%H%M%S")
        shutil.copy2(desktop, os.path.join(BACKUP_DIR, f"{stem}.{stamp}.jpg"))
        print(f"  旧图已备份到 build/image_backup/{stem}.{stamp}.jpg")

    # 2) 桌面版 900px
    size = save_resized(src_path, desktop, DESKTOP_WIDTH, DESKTOP_QUALITY)
    print(f"  桌面版已生成 assets/dishes/{file_name}  {size/1024:.0f} KB")

    # 3) 小程序版 400px
    os.makedirs(MINI_DIR, exist_ok=True)
    mini_size = save_resized(src_path, mini, MINI_WIDTH, MINI_QUALITY)
    print(f"  小程序版已生成 miniprogram/images/dishes/{file_name}  {mini_size/1024:.0f} KB")

    # 4) 署名记录
    rows, order = read_credits()
    rows[file_name] = {
        "dish_name": dish["name"],
        "artist": author,
        "license": license_text,
        "credit": credit,
    }
    if file_name not in order:
        order.append(file_name)
    write_credits(rows, order, parse_dishes())
    print(f"  署名记录已更新：作者={author}｜许可={license_text}｜来源={credit}")
    return True


def regenerate_review():
    py = sys.executable
    for script, extra in (
        ("make_image_review.py", []),
        ("make_contact_sheet.py", []),
        ("make_contact_sheet.py", ["--all"]),
    ):
        path = os.path.join(BASE, "tools", script)
        subprocess.run([py, path] + extra, check=False)
        print()


def main():
    ap = argparse.ArgumentParser(description="替换菜品图片并自动处理后续环节")
    ap.add_argument("dish", nargs="?", help="菜名或文件名主干，例如 干锅牛蛙 / dish_37_ganguoniowa")
    ap.add_argument("image", nargs="?", help="新图片路径（jpg/png/webp 都行）")
    ap.add_argument("--author", default="用户提供", help="作者，写进署名清单")
    ap.add_argument("--license", dest="license_text", default="用户确认可商用", help="许可")
    ap.add_argument("--credit", default="用户提供", help="来源说明")
    ap.add_argument("--batch", help="清单文件：每行 菜名<TAB>图片路径[<TAB>作者[<TAB>许可]]")
    ap.add_argument("--dry-run", action="store_true", help="只显示会做什么，不改文件")
    args = ap.parse_args()

    dishes = parse_dishes()
    jobs = []

    if args.batch:
        for lineno, line in enumerate(open(args.batch, encoding="utf-8"), 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split("\t")]
            if len(parts) < 2:
                print(f"  ⚠️ 清单第 {lineno} 行格式不对，已跳过：{line}")
                continue
            jobs.append(
                (
                    parts[0],
                    parts[1],
                    parts[2] if len(parts) > 2 else args.author,
                    parts[3] if len(parts) > 3 else args.license_text,
                    parts[4] if len(parts) > 4 else args.credit,
                )
            )
    elif args.dish and args.image:
        jobs.append((args.dish, args.image, args.author, args.license_text, args.credit))
    else:
        ap.print_help()
        return 1

    ok = 0
    for key, src, author, lic, credit in jobs:
        dish = resolve_dish(key, dishes)
        print(f"\n【{key}】")
        if dish is None:
            print(f"  ❌ 找不到对应菜品（菜名或文件名主干都不匹配）")
            continue
        print(f"  → 对应菜品：{dish['id']}. {dish['name']}（{dish['stem']}.jpg）")
        if replace_one(dish, src, author, lic, credit, args.dry_run):
            ok += 1

    if ok and not args.dry_run:
        print("\n=== 重新生成核对页与拼图核对表 ===")
        regenerate_review()
        print("=== 下一步 ===")
        print("  cd D:\\chisha")
        print("  node --test（在 miniprogram 下）验证小程序数据仍完整")
        print("  tools\\fl.cmd test   （结果弹窗 golden 变了就加 --update-goldens）")

    print(f"\n完成：成功 {ok} / 共 {len(jobs)}")
    return 0 if ok == len(jobs) else 1


if __name__ == "__main__":
    sys.exit(main())
