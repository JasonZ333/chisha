# -*- coding: utf-8 -*-
"""生成「菜品图片 ↔ 菜名」核对页面，方便逐张肉眼核对是否相符。

输出：docs/图片核对.html （双击用浏览器打开）

页面内容：
- 每道菜一张卡片：大图 + 菜名 + 文件名 + 价格/档位/分类 + Commons 来源
- 用**英文别名**检索到的菜会标黄 —— 这类图对版风险相对高，建议重点看
- 顶部有「只看重点核对」开关和"全部相符"的自我确认计数

用法：
    python tools/make_image_review.py
"""

import os
import re
import html
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(BASE, "tools")
sys.path.insert(0, TOOLS)

import fetch_commons_images as fetch  # noqa: E402  复用别名表，避免两处维护

DART_DISHES = os.path.join(BASE, "lib", "data", "builtin_dishes.dart")
DART_TIERS = os.path.join(BASE, "lib", "data", "price_tiers.dart")
CREDITS = os.path.join(BASE, "docs", "图片来源.md")
OUT = os.path.join(BASE, "docs", "图片核对.html")

ALIASES = fetch.ALIASES


def parse_dishes():
    text = open(DART_DISHES, encoding="utf-8").read()
    pattern = re.compile(
        r"Dish\(\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*price:\s*([\d.]+),\s*"
        r"category:\s*'([^']+)',\s*imageFile:\s*'([^']+)'\s*\)"
    )
    return [
        {
            "id": int(m.group(1)),
            "name": m.group(2),
            "price": float(m.group(3)),
            "category": m.group(4),
            "stem": os.path.splitext(m.group(5))[0],
        }
        for m in pattern.finditer(text)
    ]


def parse_tiers():
    text = open(DART_TIERS, encoding="utf-8").read()
    return [
        (int(m.group(1)), float(m.group(2)), float(m.group(3)))
        for m in re.finditer(
            r"PriceTier\(level:\s*(\d+),\s*minPrice:\s*([\d.]+),\s*maxPrice:\s*([\d.]+)\)", text
        )
    ]


def tier_label(price, tiers):
    for level, lo, hi in tiers:
        if lo <= price <= hi:
            return f"{level} 元档"
    return "—"


def parse_credits():
    """从署名文件里取 文件名 -> (作者, 许可, 来源说明)。

    来源列是自由文本：可能是 `[Commons](url)`，也可能是「用户提供」。
    """
    out = {}
    if not os.path.exists(CREDITS):
        return out
    row = re.compile(
        r"^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$"
    )
    for line in open(CREDITS, encoding="utf-8"):
        m = row.match(line.strip())
        if m:
            out[m.group(2)] = {"artist": m.group(3), "license": m.group(4), "source": m.group(5)}
    return out


def render_source(raw):
    """把来源说明渲染成 HTML：markdown 链接 → <a>，否则原样输出。"""
    if not raw or raw == "—":
        return "（未提供来源）"
    m = re.match(r"\[([^\]]+)\]\(([^)]+)\)", raw)
    if m:
        label, url = m.group(1), m.group(2)
        return f'<a href="{html.escape(url)}" target="_blank">{html.escape(label)}</a>'
    return html.escape(raw)


def main():
    dishes = parse_dishes()
    tiers = parse_tiers()
    credits = parse_credits()

    cards = []
    focus_count = 0
    for d in dishes:
        file_name = d["stem"] + ".jpg"
        src = f"../assets/dishes/{file_name}"
        info = credits.get(file_name, {})
        needs_focus = d["name"] in ALIASES
        if needs_focus:
            focus_count += 1
        cls = "card focus" if needs_focus else "card"
        badge = '<span class="badge">重点核对</span>' if needs_focus else ""
        source = (
            f'{render_source(info.get("source"))}'
            f' · {html.escape(info.get("artist", "?"))} · {html.escape(info.get("license", "?"))}'
            if info
            else "（署名文件里没有这条记录）"
        )
        cards.append(
            f"""    <div class="{cls}" data-focus="{str(needs_focus).lower()}">
      <img src="{src}" alt="{html.escape(d['name'])}" loading="lazy" />
      <div class="meta">
        <div class="row1"><span class="name">{html.escape(d['name'])}</span>{badge}</div>
        <div class="file">{file_name}</div>
        <div class="tags">
          <span>{d['price']:g} 元</span>
          <span>{tier_label(d['price'], tiers)}</span>
          <span>{html.escape(d['category'])}</span>
        </div>
        <div class="source">{source}</div>
      </div>
    </div>"""
        )

    doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>吃啥 · 菜品图片与菜名核对</title>
<style>
  :root {{ --line: #E6D5C8; --brown: #8B4A2B; --bg: #FBF3EC; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; padding: 24px 28px 60px; background: var(--bg);
         font-family: "Microsoft YaHei", system-ui, sans-serif; color: #2B2320; }}
  h1 {{ font-size: 26px; margin: 0 0 6px; color: var(--brown); }}
  .hint {{ color: #7A6A60; font-size: 14px; line-height: 1.8; margin-bottom: 16px; }}
  .bar {{ position: sticky; top: 0; z-index: 9; background: rgba(251,243,236,.96);
          padding: 12px 0; border-bottom: 1px solid var(--line); margin-bottom: 20px; }}
  .bar button {{ font-size: 14px; padding: 7px 16px; border-radius: 18px;
                 border: 1px solid var(--line); background: #fff; color: var(--brown);
                 cursor: pointer; margin-right: 10px; }}
  .bar button.on {{ background: var(--brown); color: #fff; border-color: var(--brown); }}
  .bar .count {{ font-size: 14px; color: #7A6A60; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }}
  .card {{ background: #fff; border-radius: 14px; overflow: hidden;
           box-shadow: 0 3px 14px rgba(139,74,43,.10); border: 2px solid transparent; }}
  .card.focus {{ border-color: #E8A33D; }}
  .card img {{ display: block; width: 100%; height: 200px; object-fit: cover; background: #F3E7DC; }}
  .meta {{ padding: 12px 14px 14px; }}
  .row1 {{ display: flex; align-items: center; gap: 8px; }}
  .name {{ font-size: 22px; font-weight: 700; }}
  .badge {{ font-size: 11px; padding: 3px 8px; border-radius: 10px;
            background: #FDF0DA; color: #A9660E; border: 1px solid #F0D8AC; }}
  .file {{ font-family: Consolas, monospace; font-size: 12px; color: #8A7A70; margin: 4px 0 8px; }}
  .tags span {{ display: inline-block; font-size: 12px; padding: 2px 9px; margin-right: 6px;
                border-radius: 10px; background: #F7E9DE; color: var(--brown); }}
  .source {{ font-size: 11px; color: #9C8A80; margin-top: 8px; line-height: 1.6; }}
  .source a {{ color: #9C8A80; }}
  .done {{ opacity: .35; filter: grayscale(1); }}
  .legend {{ font-size: 13px; color: #7A6A60; margin: 10px 0 0; }}
</style>
</head>
<body>
  <h1>菜品图片与菜名核对</h1>
  <div class="hint">
    共 <b>{len(dishes)}</b> 道菜。请逐张确认「图片内容」与「菜名」是否相符。<br />
    图片目录：<code>assets/dishes/</code>　菜名来源：<code>lib/data/builtin_dishes.dart</code>
  </div>
  <div class="bar">
    <button id="focusBtn">只看重点核对（{focus_count}）</button>
    <button id="doneBtn">标为已核对</button>
    <span class="count" id="count"></span>
  </div>
  <div class="legend">
    ⚠️ <b>重点核对</b>：这些菜名在 Wikimedia Commons 上检索不到中文结果，
    是用<b>英文别名</b>搜出来的（例如「海鲜大咖 → Seafood platter」），图文不符的可能性相对更高。
  </div>
  <div class="grid">
{chr(10).join(cards)}
  </div>
<script>
  var focusOnly = false, doneCount = 0;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  function render() {{
    cards.forEach(function (c) {{
      c.style.display = (!focusOnly || c.dataset.focus === 'true') ? '' : 'none';
    }});
    document.getElementById('count').textContent =
      '已核对 ' + doneCount + ' / ' + cards.length + ' 道';
  }}
  document.getElementById('focusBtn').addEventListener('click', function () {{
    focusOnly = !focusOnly;
    this.classList.toggle('on', focusOnly);
    render();
  }});
  document.getElementById('doneBtn').addEventListener('click', function () {{
    cards.forEach(function (c) {{
      if (c.style.display !== 'none') {{
        if (!c.classList.contains('done')) doneCount++;
        c.classList.add('done');
      }}
    }});
    render();
  }});
  render();
</script>
</body>
</html>
"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8", newline="\n").write(doc)
    print(f"共 {len(dishes)} 道菜，其中重点核对 {focus_count} 道")
    print(f"核对页面已生成: {OUT}")
    print("双击用浏览器打开即可逐张核对")


if __name__ == "__main__":
    main()
