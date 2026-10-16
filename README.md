# 吃啥

一个只干一件事的小软件：**帮你决定今天吃什么**。

桌面应用（Windows），用 Flutter 写的，同一套代码以后可以直接打包手机端。

> 整个项目位于 `D:\chisha`（源码、工具脚本、PRD、构建产物全部在这里）。
> 产品需求与验收标准见同目录的 [`PRD.md`](PRD.md)。

---

## 目录总览

```
D:\chisha\
├── lib\            桌面版应用源码（Dart）
├── test\           桌面版测试 + goldens\ 界面截图
├── windows\ android\ ios\   平台工程
├── assets\         占位图 + 免费图库菜品图片（dishes\，50 张）
├── miniprogram\    ★ 微信小程序版（独立原生小程序，见其中的 README.md）
├── docs\           图片来源与署名、AI 绘图提示词（备用方案）
├── tools\          构建、图片下载、两端数据同步脚本
├── build\          构建产物（Release 版 exe 在这里）
├── PRD.md          产品需求文档
└── README.md       本文件
```

> 小程序版与桌面版是**两套独立代码**（Flutter 编译不出小程序），
> 但菜品与档位数据由 `tools/sync_miniprogram_data.py` 从 Dart 源码生成，两端永远一致。

---

## 怎么运行

双击：

```
D:\chisha\build\windows\x64\runner\Release\chisha.exe
```

⚠️ **必须整个 `Release` 文件夹一起保留**，不能只拷 exe —— 它需要同目录下的
`data\`、`flutter_windows.dll`、`url_launcher_windows_plugin.dll`。

### 为什么不放在 DSH 工作目录里

DSH 的文件沙箱会限制**任何位于工作区（`C:\Users\<你的用户名>\Desktop\jason1`）内的可执行文件**：
它既写不了 `%APPDATA%`，也无法通过 `ShellExecute` 把链接交给浏览器。
实测对照（同一个 `cmd.exe`，只换位置）：

| 可执行文件位置 | 能否在 `%APPDATA%` 建目录 |
| --- | --- |
| 工作区内 | ❌ `Access is denied.` |
| 工作区外 | ✅ 成功 |

本项目整体放在 `D:\chisha`，产物在 `build\windows\x64\runner\Release\`，
本身就在工作区外，可以直接运行。桌面上不再保留任何副本。

---

## 功能范围（第一版）

**首页只有两个按钮**

- **所有价位随机** —— 从全部 50 道内置菜品里随机推荐一道
- **分价位随机** —— 弹出 10 个价格档位，选一个后直接从该档位随机推荐一道

首页不放价格档位浏览入口，不能主动浏览某个档位的全部菜品。

**价格档位**（共 10 档）

| 档位 | 价格区间 | 档位 | 价格区间 |
| --- | --- | --- | --- |
| 10 元档 | 10 元及以下 | 60 元档 | 51 ~ 60 元 |
| 20 元档 | 11 ~ 20 元 | 70 元档 | 61 ~ 70 元 |
| 30 元档 | 21 ~ 30 元 | 80 元档 | 71 ~ 80 元 |
| 40 元档 | 31 ~ 40 元 | 90 元档 | 81 ~ 90 元 |
| 50 元档 | 41 ~ 50 元 | 100 元档 | 91 ~ 100 元 |

超过 100 元的菜品完全不显示。

**结果弹窗**展示：菜名、价格、所属档位、分类、食物图片、
视频封面（用该菜品自己的食物图片）+ 标题 + 按钮。

点击「看吃播」→ 用**系统默认浏览器**打开抖音搜索页，关键词为 `菜名 + 吃播`。
软件本身**不播放视频、不爬取视频、不保存任何具体视频链接**。

> 📌 **视频入口由平台开关控制**：`lib/config/platform_features.dart` 里的 `PlatformFeatures.videoEntry`。
> 桌面版默认开启；**小程序版按规划砍掉**（见 PRD「小程序版（规划中）」）。
> 可编译出无视频入口的版本：`flutter build windows --dart-define=CHISHA_VIDEO_ENTRY=false`，
> 对应测试见 `test/platform_features_test.dart`。

**设置页**三项：关于本软件、数据保存位置、恢复默认示例数据。

**第一版不做**：用户添加/修改/删除菜品、辣度甜度卡路里香菜等偏好设置、
软件内播放视频、爬取抖音、登录、云数据库、服务器部署、手机端交付。

---

## 数据保存在哪里

所有数据都是当前电脑上的普通文件，**刷新、关闭、重启都不会丢**：

```
C:\Users\<你的用户名>\AppData\Roaming\chisha\
├── dishes.json      菜品数据（首次运行由内置示例数据生成）
└── images\          菜品图片文件夹
```

软件的「设置 → 数据保存位置」里可以直接看到路径，并有按钮一键打开这两个文件夹。

程序按下面的顺序挑选**第一个真正可写**的目录（会依次做写入探测）：

1. `%APPDATA%\chisha` —— 正常情况下用这个，也就是上面那个路径；
2. `%LOCALAPPDATA%\chisha`；
3. **exe 同级目录下的 `chisha-data\`** —— 便携模式，适用于 `%APPDATA%` 被权限策略限制的环境；
4. `%USERPROFILE%\chisha`；
5. 系统临时目录（最后兜底，重启可能被清理）。

所以**以「设置 → 数据保存位置」里显示的路径为准**。软件每次启动都会把最终选中的目录写到标准错误输出，便于排查。

### 菜品图片来自哪里

**图片来自免费图库 [Wikimedia Commons](https://commons.wikimedia.org/)**，已随软件打包在
`assets/dishes/`（50 道菜各一张，约 6.9 MB）。作者与许可见 [`docs/图片来源.md`](docs/图片来源.md)，
软件内也能看：**设置 → 图片来源与署名**。

图片解析优先级（从高到低）：

1. **你自己放的图** —— `<数据目录>/images/`，可随时替换
2. **随软件打包的图库图片** —— `assets/dishes/`
3. **统一占位图** —— 上面两者都没有时

匹配时按同名前缀依次尝试 `.png / .jpg / .jpeg / .webp`，所以数据里写 `.png`、
实际文件是 `.jpg` 也能命中。图片是**实时检查**的，不需要重新编译。

> 想换成自己的图？把文件按文件名放进 `images\` 文件夹即可覆盖打包图片。
> 需要 AI 生成的图，可参考备用的 [`docs/AI绘图提示词.md`](docs/AI绘图提示词.md)。

图片由 `tools/fetch_commons_images.py` 批量下载并生成署名清单（增量运行，不会丢失已有记录）。

---

## 开发

### 环境

| 依赖 | 说明 |
| --- | --- |
| Flutter | 3.47.7（stable），装在 `D:\flutter` |
| Visual Studio Build Tools 2022 | 装在 `D:\BuildTools`，含 MSVC v143 与 Windows SDK |
| Dart | 随 Flutter 一起，3.13.5 |

VS 生成工具**已经装好**，平时不需要再动它。以后要增删组件，用系统里的 VS 安装器：

```
C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe
```

如果哪天需要重装，正确的命令行是（**必须以管理员身份运行**）：

```powershell
& "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe" modify `
  --installPath "D:\BuildTools" `
  --add Microsoft.VisualStudio.Workload.VCTools `
  --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
  --add Microsoft.VisualStudio.Component.Windows11SDK.22621 `
  --includeRecommended --passive --norestart
```

> ⚠️ **不要用 `Microsoft.VisualStudio.Workload.NativeDesktop`**。
> 那是 Visual Studio IDE（完整版）的工作负载 ID，**Build Tools 产品里不存在**。
> 传它的后果很隐蔽：安装器只装 MSBuild 基础组件，然后**以退出码 0 报告成功**，
> 但 `VC\Tools\MSVC` 压根不存在，`vswhere -requires ...VC.Tools.x86.x64` 返回空。
> 排查方法：看 `%LOCALAPPDATA%\Temp\dd_setup_*.log`——工作负载 ID 若没被解析成包，
> 就只会出现在 `_SFX_CAB_EXE_PARAMETERS` 那行命令行回显里。

国内镜像与所有写入位置都通过环境变量重定向到 D 盘（见 `tools\fl.cmd`）：
`FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn`、`PUB_HOSTED_URL=https://pub.flutter-io.cn`、
`PUB_CACHE=D:\flutter\pub-cache`、`APPDATA`/`LOCALAPPDATA` 指向 `D:\flutter\dsh-appdata`。

> 这样做是有意的：以前 pub 缓存和工具状态放在 DSH 工作区里，工作区被清理时一起没了。
> 现在全部落在 D 盘，工作区怎么变都不影响环境。

### 常用命令

在 `D:\chisha` 目录下：

```bat
tools\fl.cmd pub get
tools\fl.cmd analyze
tools\fl.cmd test
tools\fl.cmd run -d windows
```

一键构建 Windows 发布版：

```powershell
& ([scriptblock]::Create([System.IO.File]::ReadAllText(
    "D:\chisha\tools\build_windows.ps1",
    [System.Text.Encoding]::UTF8)))
```

脚本会自动：重建插件 junction → 编译 → 报告 exe 路径。
产物就是 `build\windows\x64\runner\Release\chisha.exe`，直接在原地运行即可，不再往别处复制。

---

## 目录结构（源码）

```
D:\chisha\
├── lib/
│   ├── main.dart                     应用入口
│   ├── models/dish.dart              菜品数据模型
│   ├── data/
│   │   ├── price_tiers.dart          10 个价格档位定义
│   │   └── builtin_dishes.dart       50 道内置菜品
│   ├── services/
│   │   ├── dish_repository.dart      本地持久化 / 图片解析 / 恢复默认
│   │   ├── random_picker.dart        随机推荐（避免连续重复）
│   │   └── video_launcher.dart       打开抖音搜索页 / 打开文件夹
│   ├── pages/
│   │   ├── home_page.dart            首页（两个随机按钮）
│   │   └── settings_page.dart        设置页（三项）
│   └── widgets/
│       ├── tier_picker_dialog.dart   价格档位选择弹窗
│       └── dish_result_dialog.dart   随机结果弹窗
├── test/
│   ├── widget_test.dart              数据与随机逻辑（纯 Dart）
│   ├── app_flow_test.dart            端到端流程（真实读盘写盘）
│   ├── golden_test.dart              界面渲染截图
│   └── goldens/                      渲染出的界面 PNG
├── assets/placeholder/               统一占位图
├── docs/AI绘图提示词.md               50 条提示词 + 文件名对照表
└── tools/                            构建与运维脚本
```

---

## 测试与验证

```bat
tools\fl.cmd analyze                 :: 0 问题
tools\fl.cmd test                    :: 27 个用例
tools\fl.cmd test --update-goldens   :: 重新生成界面截图
```

其中：

- `widget_test.dart` —— 50 道菜/档位划分/随机不重复/视频关键词等纯逻辑；
- `app_flow_test.dart` —— 真的点按钮、真的读 `dishes.json`、逐个档位验证不越档、
  验证图片按文件名自动替换；
- `golden_test.dart` —— 把首页、档位弹窗、结果弹窗、设置页渲染成 PNG 供肉眼检查。

---

## 环境备注

### 插件符号链接

Flutter 构建带插件的 Windows 应用时，原本需要在
`windows/flutter/ephemeral/.plugin_symlinks/` 下创建符号链接，
而 Windows 默认不允许非管理员进程创建符号链接。

本项目改用 **NTFS 目录联接（junction）** 预置这些链接：
Flutter 源码 `flutter_plugins.dart` 在链接已存在时会直接跳过创建，
而 junction 不需要管理员权限。`tools\make_plugin_junctions.ps1` 负责这件事，
构建脚本每次会自动重建。
