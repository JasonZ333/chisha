import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../data/builtin_dishes.dart';
import '../data/price_tiers.dart';
import '../models/dish.dart';

/// 数据仓库：负责本地持久化、内置数据恢复、菜品图片解析。
///
/// 数据落在当前电脑的「软件数据目录」里（设置页会显示具体路径）：
///
/// ```
/// <数据目录>/
///   ├── dishes.json     菜品数据（首次运行由内置示例数据生成）
///   └── images/         菜品图片文件夹，用户生成的 AI 图片放这里
/// ```
///
/// 刷新、关闭、重启软件都不会丢失：数据是磁盘上的普通文件。
class DishRepository {
  DishRepository._();

  static final DishRepository instance = DishRepository._();

  /// 图片还没有生成时使用的统一占位图
  static const String placeholderAsset =
      'assets/placeholder/food_placeholder.png';

  static const String dishesFileName = 'dishes.json';
  static const String imagesDirName = 'images';

  Directory? _dataDir;
  List<Dish>? _cache;

  /// 候选数据目录，按优先级排列
  ///
  /// 首选 `%APPDATA%\chisha`（纯英文、可预期、跟着用户漫游）。
  /// 之后依次回退，保证在被沙箱/权限策略限制的机器上依然能落盘。
  Future<List<Directory>> _candidateDirs() async {
    final env = Platform.environment;
    final candidates = <Directory>[];

    // 手机端（以后）用 path_provider 的标准位置
    if (Platform.isAndroid || Platform.isIOS) {
      try {
        final base = await getApplicationSupportDirectory();
        candidates.add(Directory(p.join(base.path, 'chisha')));
      } catch (_) {
        // 交给后面的候选
      }
    }

    final appData = env['APPDATA'];
    if (Platform.isWindows && appData != null && appData.isNotEmpty) {
      candidates.add(Directory(p.join(appData, 'chisha')));
    }

    if (Platform.isMacOS || Platform.isLinux) {
      final xdg = env['XDG_DATA_HOME'];
      final home = env['HOME'];
      if (Platform.isMacOS && home != null) {
        candidates.add(
          Directory(p.join(home, 'Library', 'Application Support', 'chisha')),
        );
      } else if (xdg != null && xdg.isNotEmpty) {
        candidates.add(Directory(p.join(xdg, 'chisha')));
      } else if (home != null) {
        candidates.add(
          Directory(p.join(home, '.local', 'share', 'chisha')),
        );
      }
    }

    final localAppData = env['LOCALAPPDATA'];
    if (Platform.isWindows && localAppData != null && localAppData.isNotEmpty) {
      candidates.add(Directory(p.join(localAppData, 'chisha')));
    }

    // 便携模式：放在 exe 同级（绿色版，或 %APPDATA% 被策略限制时）
    try {
      final exeDir = File(Platform.resolvedExecutable).parent;
      candidates.add(Directory(p.join(exeDir.path, 'chisha-data')));
    } catch (_) {
      // 忽略
    }

    final home = env['HOME'] ?? env['USERPROFILE'];
    if (home != null && home.isNotEmpty) {
      candidates.add(Directory(p.join(home, 'chisha')));
    }

    candidates.add(Directory(p.join(Directory.systemTemp.path, 'chisha')));
    return candidates;
  }

  /// 目录能否真正创建并写入（不只是"存在"）
  bool _isUsable(Directory dir) {
    try {
      if (!dir.existsSync()) {
        dir.createSync(recursive: true);
      }
      final probe = File(p.join(dir.path, '.write_probe'));
      probe.writeAsStringSync('ok');
      probe.deleteSync();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 数据目录（dishes.json 与 images 所在目录）
  ///
  /// 依次尝试候选目录，取第一个真正可写的。
  /// 具体落在哪里可以在「设置 → 数据保存位置」里看到。
  Future<Directory> dataDirectory() async {
    if (_dataDir != null) return _dataDir!;

    for (final dir in await _candidateDirs()) {
      if (_isUsable(dir)) {
        debugPrint('数据目录：${dir.path}');
        _dataDir = dir;
        return dir;
      }
      debugPrint('数据目录不可写，跳过：${dir.path}');
    }

    throw const FileSystemException('找不到可写的数据目录');
  }

  /// 菜品图片文件夹
  Future<Directory> imagesDirectory() async {
    final dir = Directory(p.join((await dataDirectory()).path, imagesDirName));
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }
    return dir;
  }

  Future<File> dishesFile() async =>
      File(p.join((await dataDirectory()).path, dishesFileName));

  /// 首次启动时准备目录与数据文件
  Future<void> ensureInitialized() async {
    await imagesDirectory();
    final file = await dishesFile();
    if (!file.existsSync()) {
      await _writeDishes(kBuiltinDishes);
    }
  }

  /// 读取菜品数据（内存缓存）
  ///
  /// 任何一步失败（数据目录建不出来、文件损坏、没有写权限）都回退到内置数据，
  /// 保证软件始终可用——最坏情况只是这次的改动没能持久化。
  Future<List<Dish>> loadDishes({bool forceReload = false}) async {
    if (!forceReload && _cache != null) return _cache!;

    try {
      final file = await dishesFile();
      if (!file.existsSync()) {
        await _writeDishes(kBuiltinDishes);
        _cache = List<Dish>.unmodifiable(kBuiltinDishes);
        return _cache!;
      }

      final raw = await file.readAsString();
      final decoded = jsonDecode(raw);
      final items = (decoded as Map<String, dynamic>)['dishes'] as List<dynamic>;
      final dishes = items
          .map((e) => Dish.fromJson(e as Map<String, dynamic>))
          .where((d) => d.price <= kMaxVisiblePrice)
          .toList();
      if (dishes.isEmpty) throw const FormatException('数据为空');
      _cache = List<Dish>.unmodifiable(dishes);
    } catch (e) {
      debugPrint('读取菜品数据失败，回退到内置数据：$e');
      try {
        await _writeDishes(kBuiltinDishes);
      } catch (_) {
        // 数据目录不可写：只影响持久化，不影响本次使用
      }
      _cache = List<Dish>.unmodifiable(kBuiltinDishes);
    }

    return _cache!;
  }

  /// 恢复默认示例数据
  Future<void> restoreDefaults() async {
    await _writeDishes(kBuiltinDishes);
    _cache = List<Dish>.unmodifiable(kBuiltinDishes);
  }

  Future<void> _writeDishes(List<Dish> dishes) async {
    final file = await dishesFile();
    final payload = <String, dynamic>{
      'version': 1,
      'updatedAt': DateTime.now().toIso8601String(),
      'dishes': dishes.map((d) => d.toJson()).toList(),
    };
    await file.writeAsString(
      const JsonEncoder.withIndent('  ').convert(payload),
      flush: true,
    );
  }

  /// 按价格档位筛选菜品
  Future<List<Dish>> dishesInTier(double minPrice, double maxPrice) async {
    final all = await loadDishes();
    return all
        .where((d) => d.price >= minPrice && d.price <= maxPrice)
        .toList();
  }

  /// 解析一道菜的图片：优先用图片文件夹里的真实图片，找不到就用统一占位图
  Future<ImageProvider> imageFor(Dish dish) async {
    try {
      final dir = await imagesDirectory();
      final file = File(p.join(dir.path, dish.imageFile));
      if (file.existsSync()) {
        return FileImage(file);
      }
    } catch (e) {
      debugPrint('读取菜品图片失败，改用占位图：$e');
    }
    return const AssetImage(placeholderAsset);
  }

  /// 图片文件夹里已经有多少张真实图片
  Future<int> availableImageCount() async {
    try {
      final dir = await imagesDirectory();
      final all = await loadDishes();
      final names = all.map((d) => d.imageFile).toSet();
      return dir
          .listSync()
          .whereType<File>()
          .where((f) => names.contains(p.basename(f.path)))
          .length;
    } catch (_) {
      return 0;
    }
  }
}
