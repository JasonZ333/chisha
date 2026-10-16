# 吃啥 · 微信小程序版

这是「吃啥」的**微信小程序版**，与 `D:\chisha` 下的 Flutter 桌面版是**两套独立代码**。

> Flutter **不能**编译成微信小程序（小程序用 WXML/WXSS/JS），所以这里是原生小程序项目。

## 怎么打开

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 「导入项目」→ 目录选 `D:\chisha\miniprogram`
3. AppID 填你自己的小程序 AppID（先在[微信公众平台](https://mp.weixin.qq.com/)注册）
   - 现在 `project.config.json` 里是 `touristappid`（游客模式），只能预览、不能上传

## 与桌面版的差异

| 功能 | 桌面版 | 小程序版 |
| --- | --- | --- |
| 所有价位随机 / 分价位随机 | ✅ | ✅ |
| 结果卡片（图片 / 菜名 / 价格 / 档位 / 分类） | ✅ | ✅ |
| **跳转吃播** | ✅ 打开浏览器跳抖音搜索 | ❌ **砍掉**（《增加功能.docx》第 1 条） |
| **点外卖** | 不做 | ✅ 复制菜名 → 选平台 → `wx.navigateToMiniProgram` |
| 附近美食随机 | ✅ | ✅（与所有价位随机行为一致，暂无定位数据） |
| 数据存储 | 本机 `dishes.json` | 暂无（数据随包） |

## 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss   小程序入口与全局样式
├── project.config.json            开发者工具项目配置
├── sitemap.json
├── data/                          数据（自动生成，勿手工改）
│   ├── dishes.js                  50 道菜
│   └── tiers.js                   10 个价格档位
├── utils/                         纯逻辑，可被 Node 直接测试
│   ├── dishes.js                  档位查询 / 筛选
│   ├── random.js                  随机抽取
│   └── takeout.js                 点外卖（平台配置 + 跳转参数 + 降级）
├── pages/index/                   首页（随机 + 结果卡片 + 点外卖选择页）
├── images/dishes/                 压缩版菜品图片（约 23 KB/张，主包限制 2 MB）
└── tests/                         Node 内置测试运行器，零依赖
```

## 数据从哪来

`data/dishes.js` 和 `data/tiers.js` **不要手工编辑**，它们由脚本从 Flutter 版生成：

```powershell
cd D:\chisha
python tools/sync_miniprogram_data.py     # 从 Dart 生成菜品与档位
python tools/sync_miniprogram_images.py   # 生成压缩版图片
```

这样两个端的数据永远一致。

## 跑测试

```powershell
cd D:\chisha\miniprogram
D:\node\node.exe --test
```

用的是 Node 内置测试运行器（`node:test`），**不需要 npm install 任何东西**。

测试覆盖：数据完整性（50 道菜 / 10 档 / 每档 5 道 / 图片齐全）、
随机抽取（等概率、不越界、能覆盖全部菜品）、点外卖（平台清单、跳转参数、未配置 appId 时的降级）。

## 点外卖的平台配置（需要你补 appId）

平台清单在 `utils/takeout.js` 的 `PLATFORMS`：

| 平台 | appId 状态 | 说明 |
| --- | --- | --- |
| 美团 | ❌ 待填 | 需你从微信里拿到 |
| 京东 | ✅ `wx91d27dbf599dff74` | 公开的固定 AppID |
| 饿了么 | ❌ 待填 | 需你从微信里拿到 |

**怎么拿 appId**：微信里搜到该小程序 → 右上角「…」→ 复制小程序链接，链接里的 `appid` 参数就是。

**没填会怎样**：点击该平台不会报错，只会提示"暂不能直接跳转，已复制菜名，请到 App 里粘贴搜索"。

**为什么能跳**：`wx.navigateToMiniProgram` **不同主体的小程序可以互相跳转，不需要关联**，
且自 2020-04-24 起无需在 `app.json` 里声明跳转名单、不受数量限制。
限制是必须**用户点击触发**，且跳转前微信会弹系统确认框。

⚠️ 还要遵守[《微信小程序平台运营规范》](https://developers.weixin.qq.com/miniprogram/product/)关于**「互推行为」**的要求，
所以这里的文案写成"帮你去点这道菜的外卖"，而不是平台之间的互推。

## 已知约束

- **图片必须打包**：小程序的网络请求域名必须是自己**备案并校验过**的域名，
  所以不能在线加载 Wikimedia 的图片。桌面版那份 6.9 MB 压缩到 23 KB/张后随包发布。
- **主包上限 2 MB**：当前图片合计 1.11 MB，加上代码仍在限制内。以后加图需注意。
- **个人主体小程序**功能受限（不能开微信支付、部分类目不可选），但本项目的功能不受影响。
