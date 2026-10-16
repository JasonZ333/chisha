# -*- coding: utf-8 -*-
"""为微信小程序生成压缩版菜品图片。

为什么要单独一份：小程序**不能在线加载** Wikimedia 的图片
（网络请求域名必须是自己备案并校验过的），所以图片只能打包进小程序包；
而小程序**主包上限 2 MB**，桌面版那份 900px / 6.9 MB 的图放不下。

这里统一压到 400px 宽、JPEG 质量 68，约 25~35 KB/张，50 张合计约 1.5 MB。

用法：
    python tools/sync_miniprogram_images.py
"""

import os

from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE, "assets", "dishes")
OUT_DIR = os.path.join(BASE, "miniprogram", "images", "dishes")

TARGET_WIDTH = 400
JPEG_QUALITY = 68


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sources = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith(".jpg"))

    total = 0
    skipped = 0
    for name in sources:
        src = os.path.join(SRC_DIR, name)
        dst = os.path.join(OUT_DIR, name)
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            total += os.path.getsize(dst)
            skipped += 1
            continue
        img = Image.open(src).convert("RGB")
        if img.width > TARGET_WIDTH:
            ratio = TARGET_WIDTH / img.width
            img = img.resize((TARGET_WIDTH, int(img.height * ratio)), Image.LANCZOS)
        img.save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        total += os.path.getsize(dst)

    if sources:
        print(f"生成 {len(sources)} 张（跳过未变化的 {skipped} 张）")
        print(f"总大小 {total/1024/1024:.2f} MB，平均 {total/len(sources)/1024:.0f} KB")
        if total > 2 * 1024 * 1024:
            print("⚠️ 超过主包 2 MB 上限，需要改用分包或进一步压缩")
        else:
            print("✅ 在主包 2 MB 上限之内")
    else:
        print("源目录没有图片，请先运行 tools/fetch_commons_images.py")


if __name__ == "__main__":
    main()
