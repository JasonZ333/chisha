# -*- coding: utf-8 -*-
"""生成「吃啥」应用图标：windows/runner/resources/app_icon.ico"""
import os
import tempfile
from PIL import Image, ImageDraw

# 项目根目录（脚本位于 tools/ 下），不依赖任何绝对路径
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "windows", "runner", "resources", "app_icon.ico")
S = 256
SS = 4  # 超采样倍数，边缘更平滑
W = S * SS

TOP = (242, 112, 32)
BOTTOM = (202, 62, 6)
WHITE = (255, 255, 255, 255)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


# 1) 竖直渐变底
grad = Image.new("RGBA", (W, W))
gd = ImageDraw.Draw(grad)
for y in range(W):
    gd.line([(0, y), (W, y)], fill=lerp(TOP, BOTTOM, y / (W - 1)) + (255,))

# 2) 圆角遮罩
mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=56 * SS, fill=255)

img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)

k = SS  # 坐标缩放


def sc(*pts):
    return [(x * k, y * k) for x, y in pts]


# 3) 碗（梯形）+ 碗底
d.polygon(sc((56, 134), (200, 134), (172, 198), (84, 198)), fill=WHITE)
d.rounded_rectangle([x * k for x in (76, 192, 180, 206)], radius=7 * k, fill=WHITE)

# 4) 碗里冒出的一抹橙色（汤面）
d.arc([x * k for x in (68, 106, 188, 158)], start=200, end=340,
      fill=(255, 255, 255, 255), width=0)

# 5) 筷子
d.line(sc((152, 42), (210, 116)), fill=WHITE, width=12 * k)
d.line(sc((178, 34), (226, 110)), fill=WHITE, width=12 * k)

# 6) 热气
for x, y0 in ((92, 56), (126, 42)):
    d.arc([v * k for v in (x - 15, y0, x + 15, y0 + 42)], start=200, end=340,
          fill=(255, 255, 255, 235), width=8 * k)

icon = img.resize((S, S), Image.LANCZOS)
icon.save(OUT, format="ICO",
          sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("OK", OUT, os.path.getsize(OUT), "bytes")

png = os.path.join(tempfile.gettempdir(), "app_icon_preview.png")
icon.save(png, "PNG")
print("PREVIEW", png)
