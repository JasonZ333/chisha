// 需求 F2 的验收测试：食物图片改用免费图库（Wikimedia Commons）。
//
// 验证图片来源的优先级链与扩展名匹配：
//   1. 随软件打包的图库图片存在且是图片格式
//   2. 没有用户图片时 → 用打包的图库图片（而不是占位图）
//   3. 用户自己放的图片 → 优先级高于打包图片
//   4. 扩展名灵活：数据里写 .png，实际是 .jpg 也能命中
//   5. 两者都没有 → 回退统一占位图
//   6. imagesReadyCount 反映真实配图数量

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

import 'package:chisha/data/builtin_dishes.dart';
import 'package:chisha/models/dish.dart';
import 'package:chisha/services/dish_repository.dart';

void main() {
  // 纯 test() 用例下也要用 rootBundle / AssetManifest，必须先初始化 binding
  TestWidgetsFlutterBinding.ensureInitialized();

  final repo = DishRepository.instance;

  /// 资源清单里"随包图库图片"的 文件名主干 -> 资源路径
  Future<Map<String, String>> bundledStems() async {
    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    final map = <String, String>{};
    for (final asset in manifest.listAssets()) {
      if (asset.startsWith('${DishRepository.bundledImagesDir}/')) {
        map[p.basenameWithoutExtension(asset)] = asset;
      }
    }
    return map;
  }

  String stemOf(Dish dish) => p.basenameWithoutExtension(dish.imageFile);

  /// 取一道"有打包图片"的菜
  Future<Dish> dishWithBundledImage(Map<String, String> bundled) {
    return Future.value(
      kBuiltinDishes.firstWhere((d) => bundled.containsKey(stemOf(d))),
    );
  }

  setUp(() async {
    await repo.ensureInitialized();
    await repo.restoreDefaults();
    repo.resetBundledImageCache();
  });

  tearDown(() async {
    // 清掉测试写进去的用户图片
    try {
      final dir = await repo.imagesDirectory();
      for (final entity in dir.listSync()) {
        if (entity is File) entity.deleteSync();
      }
    } catch (_) {
      // 忽略清理失败
    }
    repo.resetBundledImageCache();
  });

  test('已随软件打包免费图库图片，且都是图片格式', () async {
    final bundled = await bundledStems();

    expect(bundled, isNotEmpty, reason: 'assets/dishes/ 下应当有图库图片');
    for (final asset in bundled.values) {
      final lower = asset.toLowerCase();
      expect(
        lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.webp'),
        isTrue,
        reason: '$asset 不是支持的图片格式',
      );
    }
  });

  test('没有用户图片时，用打包的图库图片而不是占位图', () async {
    final bundled = await bundledStems();
    final dish = await dishWithBundledImage(bundled);

    final provider = await repo.imageFor(dish);

    expect(provider, isA<AssetImage>());
    final assetName = (provider as AssetImage).assetName;
    expect(assetName, startsWith('${DishRepository.bundledImagesDir}/'));
    expect(assetName, isNot(DishRepository.placeholderAsset));
  });

  test('用户自己放的图片优先级高于打包图库图片', () async {
    final bundled = await bundledStems();
    final dish = await dishWithBundledImage(bundled);

    // 放入一张"用户图片"，扩展名故意用 .png（数据里也写 .png）
    final dir = await repo.imagesDirectory();
    final userFile = File(p.join(dir.path, '${stemOf(dish)}.png'));
    userFile.writeAsBytesSync(List<int>.filled(64, 0));

    final provider = await repo.imageFor(dish);

    expect(provider, isA<FileImage>());
    expect((provider as FileImage).file.path, userFile.path);
  });

  test('扩展名灵活：数据写 .png，实际图片是 .jpg 也能命中', () async {
    final bundled = await bundledStems();
    final dish = await dishWithBundledImage(bundled);

    // 数据里的 imageFile 是 .png，这里放一张 .jpg
    final dir = await repo.imagesDirectory();
    final userFile = File(p.join(dir.path, '${stemOf(dish)}.jpg'));
    userFile.writeAsBytesSync(List<int>.filled(64, 0));

    expect(dish.imageFile.endsWith('.png'), isTrue, reason: '前提：数据里写的是 .png');
    final provider = await repo.imageFor(dish);

    expect(provider, isA<FileImage>());
    expect((provider as FileImage).file.path, userFile.path);
  });

  test('既没有用户图片也没有打包图片时，回退到统一占位图', () async {
    // 用一道数据里不存在的菜，结果确定，不依赖图库命中率
    const ghost = Dish(
      id: 9999,
      name: '不存在的菜',
      price: 5,
      category: '菜品',
      imageFile: 'dish_9999_nonexistent.png',
    );

    final provider = await repo.imageFor(ghost);

    expect(provider, isA<AssetImage>());
    expect((provider as AssetImage).assetName, DishRepository.placeholderAsset);
  });

  test('imagesReadyCount 反映实际配好的图片数', () async {
    final ready = await repo.imagesReadyCount();

    expect(ready, greaterThan(0), reason: '至少应有部分菜品已配图');
    expect(ready, lessThanOrEqualTo(kBuiltinDishes.length));
  });

  test('bundledImageCount 统计随包图库图片，且覆盖率达标', () async {
    final bundled = await bundledStems();
    final count = await repo.bundledImageCount();

    final expected =
        kBuiltinDishes.where((d) => bundled.containsKey(stemOf(d))).length;
    expect(count, expected);
    expect(count, greaterThan(30), reason: '免费图库至少要覆盖大部分菜品');
    expect(count, lessThanOrEqualTo(kBuiltinDishes.length));
  });
}
