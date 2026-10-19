// 端到端业务流程测试：走真实的仓库、真实的磁盘读写。
//
// 覆盖需求确认稿里的核心流程：
//   首页「所有价位随机」→ 结果弹窗 →「再随机一个」
//   首页「分价位随机」→ 档位弹窗 → 结果弹窗（且不越档）
//   数据落盘（dishes.json）与「恢复默认示例数据」
//   图片按文件名自动替换

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

import 'package:chisha/data/builtin_dishes.dart';
import 'package:chisha/data/price_tiers.dart';
import 'package:chisha/models/dish.dart';
import 'package:chisha/pages/home_page.dart';
import 'package:chisha/services/dish_repository.dart';

import 'test_helpers.dart';

/// 当前结果弹窗里显示的是哪一道菜
List<Dish> visibleDishes() => kBuiltinDishes
    .where((d) => find.text(d.name).evaluate().isNotEmpty)
    .toList();

void main() {
  setUpAll(loadChineseFont);

  setUp(() async {
    await DishRepository.instance.ensureInitialized();
    await DishRepository.instance.restoreDefaults();
  });

  Future<void> bootHome(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(kWindowSize);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(hostApp(const HomePage()));
    await settleWithIo(tester);
  }

  testWidgets('所有价位随机：弹出结果弹窗，并展示菜名/价格/视频入口', (tester) async {
    await bootHome(tester);

    await tester.tap(find.text('所有价位随机'));
    await settleWithIo(tester);

    expect(find.byType(AlertDialog), findsOneWidget);

    final shown = visibleDishes();
    expect(shown, hasLength(1), reason: '弹窗里应当正好显示一道内置菜品');

    expect(find.text(shown.first.priceLabel), findsOneWidget);
    expect(find.text('看吃播'), findsOneWidget);
    expect(find.text('再随机一个'), findsOneWidget);

    // 「再随机一个」能换出另一道菜（连续两次不重复）
    final first = shown.first.name;
    await tester.tap(find.text('再随机一个'));
    await settleWithIo(tester);

    final second = visibleDishes();
    expect(second, hasLength(1));
    expect(second.first.name, isNot(first));
  });

  testWidgets('分价位随机：档位弹窗有 10 个档位，选 10 元档后不越档', (tester) async {
    await bootHome(tester);

    await tester.tap(find.text('分价位随机'));
    await settleWithIo(tester);

    expect(find.text('选择价格档位'), findsOneWidget);
    for (final tier in kPriceTiers) {
      expect(find.text(tier.label), findsOneWidget, reason: tier.label);
    }

    await tester.tap(find.text('10 元档'));
    await settleWithIo(tester);

    var shown = visibleDishes();
    expect(shown, hasLength(1));
    expect(shown.first.price, lessThanOrEqualTo(10));

    // 「再随机一个」仍然留在 10 元档内
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.text('再随机一个'));
      await settleWithIo(tester);
      shown = visibleDishes();
      expect(shown, hasLength(1));
      expect(shown.first.price, lessThanOrEqualTo(10));
    }
  });

  testWidgets('100 元档推荐的菜价格在 91~100 元之间', (tester) async {
    await bootHome(tester);

    await tester.tap(find.text('分价位随机'));
    await settleWithIo(tester);
    await tester.tap(find.text('100 元档'));
    await settleWithIo(tester);

    final shown = visibleDishes();
    expect(shown, hasLength(1));
    expect(shown.first.price, inInclusiveRange(91, 100));
  });

  testWidgets('每个档位都能随机出该档位的菜', (tester) async {
    await bootHome(tester);

    for (final tier in kPriceTiers) {
      await tester.tap(find.text('分价位随机'));
      await settleWithIo(tester);
      await tester.tap(find.text(tier.label));
      await settleWithIo(tester);

      final shown = visibleDishes();
      expect(shown, hasLength(1), reason: '${tier.label} 没有推荐出菜品');
      expect(
        tier.contains(shown.first.price),
        isTrue,
        reason: '${tier.label} 推荐了 ${shown.first.name}（${shown.first.price} 元）',
      );

      // 关掉结果弹窗，回到首页再测下一个档位
      await tester.tap(find.text('关闭'));
      await settleWithIo(tester);
      expect(find.byType(AlertDialog), findsNothing);
    }
  });

  test('数据真的落在了磁盘上，并且能恢复默认', () async {
    final repo = DishRepository.instance;
    final file = await repo.dishesFile();
    expect(file.existsSync(), isTrue, reason: 'dishes.json 应该已经写入磁盘');

    final reloaded = await repo.loadDishes(forceReload: true);
    expect(reloaded.length, kBuiltinDishes.length);

    await repo.restoreDefaults();
    final afterRestore = await repo.loadDishes(forceReload: true);
    expect(afterRestore.length, kBuiltinDishes.length);
    expect(kBuiltinDishes.length, 64, reason: '内置菜品应为 64 道（10/20 档各 10 道）');
    expect(
      afterRestore.map((d) => d.name).toList(),
      kBuiltinDishes.map((d) => d.name).toList(),
    );

    final images = await repo.imagesDirectory();
    expect(images.existsSync(), isTrue);
  });

  test('图片文件名规则：找不到图片时回退到统一占位图', () async {
    for (final dish in kBuiltinDishes) {
      expect(dish.imageFile, endsWith('.png'));
    }
    final provider =
        await DishRepository.instance.imageFor(kBuiltinDishes.first);
    expect(provider, isA<AssetImage>());
  });

  test('按文件名把图片放进图片文件夹后，会自动改用真实图片', () async {
    final repo = DishRepository.instance;
    final imagesDir = await repo.imagesDirectory();
    final dish = kBuiltinDishes.first;
    final file = File(p.join(imagesDir.path, dish.imageFile));

    // 放进去之前 → 占位图
    expect(file.existsSync(), isFalse);
    expect(await repo.imageFor(dish), isA<AssetImage>());
    expect(await repo.availableImageCount(), 0);

    try {
      // 放进去之后 → 真实图片
      file.writeAsBytesSync(List<int>.filled(64, 0));
      final provider = await repo.imageFor(dish);
      expect(provider, isA<FileImage>());
      expect((provider as FileImage).file.path, file.path);
      expect(await repo.availableImageCount(), 1);
    } finally {
      if (file.existsSync()) file.deleteSync();
    }

    // 删掉之后 → 又回到占位图（说明是实时检查，不是缓存）
    expect(await repo.imageFor(dish), isA<AssetImage>());
    expect(await repo.availableImageCount(), 0);
  });
}
