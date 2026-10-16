// 需求 F1 的验收测试：小程序版砍掉跳转吃播。
//
// 验证两件事：
//   1. 桌面版默认形态：结果弹窗里有「看吃播」视频入口（现有行为不变）
//   2. 小程序版形态：关掉平台开关后，视频入口彻底消失，其余功能不受影响

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:chisha/config/platform_features.dart';
import 'package:chisha/data/builtin_dishes.dart';
import 'package:chisha/models/dish.dart';
import 'package:chisha/widgets/dish_result_dialog.dart';

import 'test_helpers.dart';

void main() {
  setUpAll(loadChineseFont);
  tearDown(PlatformFeatures.resetVideoEntry);

  /// 打开结果弹窗（固定用第一道菜，结果可预期）
  Future<Dish> openResultDialog(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(kWindowSize);
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final dish = kBuiltinDishes.first;
    await tester.pumpWidget(
      hostApp(
        Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () => showDishResultDialog(
                  context,
                  dish: dish,
                  onReroll: () async => dish,
                ),
                child: const Text('打开'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('打开'));
    await settleWithIo(tester);
    return dish;
  }

  test('桌面版默认开启视频入口', () {
    expect(PlatformFeatures.videoEntry, isTrue);
  });

  test('开关可以关闭，也可以还原（测试之间不互相污染）', () {
    PlatformFeatures.videoEntry = false;
    expect(PlatformFeatures.videoEntry, isFalse);
    PlatformFeatures.resetVideoEntry();
    expect(PlatformFeatures.videoEntry, isTrue);
  });

  testWidgets('桌面版：结果弹窗显示「看吃播」视频入口', (tester) async {
    final dish = await openResultDialog(tester);

    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.text('看吃播'), findsOneWidget);
    expect(find.textContaining('打开抖音搜索页'), findsOneWidget);
    // 菜品本体信息照常展示
    expect(find.text(dish.name), findsOneWidget);
    expect(find.text(dish.priceLabel), findsOneWidget);
  });

  testWidgets('小程序版：关掉开关后不再出现任何视频入口', (tester) async {
    PlatformFeatures.videoEntry = false;

    final dish = await openResultDialog(tester);

    expect(find.byType(AlertDialog), findsOneWidget);
    // 视频入口彻底消失：按钮、卡片、标题、提示文案都不应存在
    expect(find.text('看吃播'), findsNothing);
    expect(find.textContaining('吃播'), findsNothing);
    expect(find.textContaining('抖音'), findsNothing);
    // 其余功能不受影响
    expect(find.text(dish.name), findsOneWidget);
    expect(find.text(dish.priceLabel), findsOneWidget);
    expect(find.text('再随机一个'), findsOneWidget);
    expect(find.text('关闭'), findsOneWidget);
  });
}
