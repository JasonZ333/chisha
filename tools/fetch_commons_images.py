# -*- coding: utf-8 -*-
"""从 Wikimedia Commons 批量下载 50 道菜的真实照片，并生成署名清单。

- 菜品清单从 lib/data/builtin_dishes.dart 解析（单一数据源，不重复维护）
- 走本机代理（Clash Verge，127.0.0.1:7897），因为直连 Wikimedia 超时
- 图片统一转成 JPEG 按 <stem>.jpg 存到 assets/dishes/
- 署名清单是**增量合并**的：已经记录过的条目不会丢，缺记录的会重新检索补上
- 同时写 docs/图片来源.md 与 assets/credits.md（后者随包发布，供应用内展示署名）

用法：
    python tools/fetch_commons_images.py            # 全部处理（已存在的会跳过下载）
    python tools/fetch_commons_images.py 5          # 只处理前 5 道，快速验证
"""

import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

PROXY = "http://127.0.0.1:7897"
UA = "ChiShaApp/1.0 (https://github.com/JasonZ333/chisha; contact: zhang3330401@gmail.com)"
API = "https://commons.wikimedia.org/w/api.php"

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DART = os.path.join(BASE, "lib", "data", "builtin_dishes.dart")
OUT_DIR = os.path.join(BASE, "assets", "dishes")
CREDITS_DOC = os.path.join(BASE, "docs", "图片来源.md")
CREDITS_ASSET = os.path.join(BASE, "assets", "credits.md")

TARGET_WIDTH = 900
JPEG_QUALITY = 82
SLEEP = 1.2  # 尊重 Wikimedia 的限流

# 中文菜名在 Commons 的命中率偏低，用英文别名再搜一轮
ALIASES = {
    "鲜肉包子": ["Baozi", "Steamed bun"],
    "番茄鸡蛋盖饭": ["Tomato scrambled eggs", "Scrambled eggs with tomatoes"],
    "青椒肉丝盖饭": ["Shredded pork with green pepper", "Qingjiao rousi"],
    "沙县拌面扁肉": ["Wonton noodles", "Bian rou"],
    "回锅肉盖饭": ["Twice cooked pork", "Huiguorou"],
    "咖喱鸡排饭": ["Chicken katsu curry", "Japanese curry rice"],
    "酸菜鱼米线": ["Fish with pickled mustard greens", "Suancaiyu"],
    "干锅花菜": ["Dry pot cauliflower", "Cauliflower stir fry"],
    "番茄牛腩": ["Tomato beef brisket", "Beef brisket stew"],
    "铁板牛柳": ["Black pepper beef", "Teppanyaki beef"],
    "香辣蟹": ["Spicy crab", "Chilli crab"],
    "重庆烤鱼": ["Grilled fish", "Chongqing grilled fish"],
    "羊肉串拼盘": ["Lamb skewers", "Chuanr"],
    "炭烤羊排": ["Grilled lamb chops", "Rack of lamb"],
    "干锅牛蛙": ["Bullfrog", "Dry pot bullfrog"],
    "黑椒牛柳粒": ["Black pepper beef cubes", "Black pepper beef"],
    "酸汤肥牛": ["Beef in sour soup", "Sour soup beef"],
    "三文鱼刺身": ["Salmon sashimi", "Sashimi"],
    "法式羊排": ["Rack of lamb", "Lamb chops"],
    "海鲜大咖": ["Seafood platter", "Seafood boil"],
    "龙虾意面": ["Lobster pasta", "Lobster linguine"],
    "和牛寿喜锅": ["Sukiyaki", "Wagyu sukiyaki"],
}


def build_opener():
    handler = urllib.request.ProxyHandler({"http": PROXY, "https": PROXY})
    return urllib.request.build_opener(handler)


OPENER = build_opener()


def api_get(params, retries=3):
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with OPENER.open(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            wait = 3 * (attempt + 1)
            print(f"      [重试 {attempt+1}/{retries}] {exc} → 等 {wait}s")
            time.sleep(wait)
    return {}


def parse_dishes():
    text = open(DART, encoding="utf-8").read()
    pattern = re.compile(
        r"Dish\(\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*[\d.]+,\s*"
        r"category:\s*'([^']+)',\s*imageFile:\s*'([^']+)'\s*\)"
    )
    return [
        {"id": int(m.group(1)), "name": m.group(2), "category": m.group(3), "image_file": m.group(4)}
        for m in pattern.finditer(text)
    ]


def search(query):
    """在 Commons 文件命名空间里搜索图片，返回候选列表。"""
    data = api_get(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "6",
            "gsrlimit": "8",
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
            "iiurlwidth": str(TARGET_WIDTH),
        }
    )
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime", "") not in ("image/jpeg", "image/png"):
            continue
        if info.get("width", 0) < 600:
            continue
        meta = info.get("extmetadata") or {}

        def field(key):
            value = (meta.get(key) or {}).get("value", "")
            return re.sub(r"<[^>]+>", "", value).strip()

        out.append(
            {
                "title": page.get("title", ""),
                "thumb": info.get("thumburl") or info.get("url"),
                "page": info.get("descriptionurl", ""),
                "artist": field("Artist") or "（未标注作者）",
                "license": field("LicenseShortName") or "（未标注许可）",
                "query": query,
            }
        )
    return out


def search_best(dish):
    """按 中文名 → 英文别名 → 中文名+菜 的顺序找一张图。"""
    queries = [dish["name"]] + ALIASES.get(dish["name"], []) + [f"{dish['name']} 菜"]
    for query in queries:
        cands = search(query)
        time.sleep(SLEEP)
        if cands:
            return cands[0]
    return None


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with OPENER.open(req, timeout=60) as resp:
        return resp.read()


def load_existing_credits():
    """解析已有署名文件 → {文件名: 条目}，保证增量运行不丢已有记录。"""
    result = {}
    if not os.path.exists(CREDITS_DOC):
        return result
    row = re.compile(
        r"^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*"
        r"\|\s*\[Commons\]\(([^)]+)\)\s*\|"
    )
    for line in open(CREDITS_DOC, encoding="utf-8"):
        m = row.match(line.strip())
        if m:
            result[m.group(2)] = {
                "dish_name": m.group(1),
                "artist": m.group(3),
                "license": m.group(4),
                "page": m.group(5),
            }
    return result


def write_credits(entries):
    lines = [
        "# 菜品图片来源与署名",
        "",
        "本文件列出 `assets/dishes/` 下每张图片的来源、作者与许可，",
        "用于满足 Wikimedia Commons 上 CC BY / CC BY-SA 等许可的署名要求。",
        "",
        "| 菜品 | 文件名 | 作者 | 许可 | 原始页面 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for e in entries:
        lines.append(
            f"| {e['dish_name']} | `{e['file']}` | {e['artist']} | {e['license']} "
            f"| [Commons]({e['page']}) |"
        )
    lines += [
        "",
        f"共 {len(entries)} 张图片，全部来自 [Wikimedia Commons](https://commons.wikimedia.org/)，",
        "各自按其标注的许可使用。若某张图片的许可要求署名，请保留本文件。",
        "",
    ]
    text = "\n".join(lines)
    os.makedirs(os.path.dirname(CREDITS_DOC), exist_ok=True)
    open(CREDITS_DOC, "w", encoding="utf-8").write(text)
    os.makedirs(os.path.dirname(CREDITS_ASSET), exist_ok=True)
    open(CREDITS_ASSET, "w", encoding="utf-8").write(text)


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    os.makedirs(OUT_DIR, exist_ok=True)

    dishes = parse_dishes()
    if limit:
        dishes = dishes[:limit]

    existing = load_existing_credits()
    print(f"菜品数: {len(dishes)}   已有署名记录: {len(existing)}\n")

    entries = []
    downloaded = skip_ok = recorded = failed = 0

    for dish in dishes:
        stem = os.path.splitext(dish["image_file"])[0]
        file_name = stem + ".jpg"
        target = os.path.join(OUT_DIR, file_name)
        print(f"[{dish['id']:>2}] {dish['name']}")

        # 图片已存在
        if os.path.exists(target) and os.path.getsize(target) > 1000:
            if file_name in existing:
                e = existing[file_name]
                entries.append({"dish_name": dish["name"], "file": file_name, **e})
                skip_ok += 1
                continue
            # 有图但缺署名记录 → 只补检索，不重新下载
            picked = search_best(dish)
            if picked:
                entries.append(
                    {
                        "dish_name": dish["name"],
                        "file": file_name,
                        "artist": picked["artist"],
                        "license": picked["license"],
                        "page": picked["page"],
                    }
                )
                print("      已有图片，补上署名记录")
                recorded += 1
            else:
                print("      已有图片，但补署名失败")
                failed += 1
            continue

        # 需要下载
        picked = search_best(dish)
        if not picked:
            print("      未找到合适图片 → 保留占位图")
            failed += 1
            continue

        try:
            raw = download(picked["thumb"])
            time.sleep(SLEEP)
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            if img.width > TARGET_WIDTH:
                ratio = TARGET_WIDTH / img.width
                img = img.resize((TARGET_WIDTH, int(img.height * ratio)), Image.LANCZOS)
            img.save(target, "JPEG", quality=JPEG_QUALITY, optimize=True)
            print(f"      OK {file_name}  {os.path.getsize(target)/1024:.0f} KB   {picked['license']}")
            entries.append(
                {
                    "dish_name": dish["name"],
                    "file": file_name,
                    "artist": picked["artist"],
                    "license": picked["license"],
                    "page": picked["page"],
                }
            )
            downloaded += 1
        except Exception as exc:  # noqa: BLE001
            print(f"      下载/转换失败: {exc}")
            failed += 1

    if entries:
        write_credits(entries)
        print(f"\n署名清单已写入:\n  {CREDITS_DOC}\n  {CREDITS_ASSET}（随包）")

    print(
        f"\n完成：新下载 {downloaded}，沿用已有 {skip_ok}，补记录 {recorded}，失败/未找到 {failed}"
        f"\n署名条目合计 {len(entries)}"
    )


if __name__ == "__main__":
    main()
