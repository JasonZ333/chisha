// 界面渲染测试：把首页和各弹窗真实渲染成 PNG，用于肉眼检查布局。
//
// 运行方式（会生成/更新 test/goldens/*.png）：
//   flutter test --update-goldens test/golden_test.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:chisha/data/builtin_dishes.dart';
import 'package:chisha/pages/home_page.dart';
import 'package:chisha/pages/settings_page.dart';
import 'package:chisha/widgets/dish_result_dialog.dart';
import 'package:chisha/widgets/tier_picker_dialog.dart';

import 'test_helpers.dart';

void main() {
  setUpAll(loadChineseFont);

  Future<void> useWindow(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(kWindowSize);
    addTearDown(() => tester.binding.setSurfaceSize(null));
  }

  /// 用按钮触发弹窗，模拟真实交互路径
  Widget trigger(void Function(BuildContext) onPressed) {
    return Builder(
      builder: (context) => Scaffold(
        body: Center(
          child: ElevatedButton(
            onPressed: () {
              onPressed(context);
            },
            child: const Text('打开'),
          ),
        ),
      ),
    );
  }

  testWidgets('首页', (tester) async {
    await useWindow(tester);
    await tester.pumpWidget(hostApp(const HomePage()));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/01_home.png'),
    );
  });

  testWidgets('分价位随机 - 档位选择弹窗', (tester) async {
    await useWindow(tester);
    await tester.pumpWidget(
      hostApp(
        trigger((context) {
          showTierPickerDialog(context);
        }),
      ),
    );
    await tester.tap(find.text('打开'));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/02_tier_picker.png'),
    );
  });

  testWidgets('随机结果弹窗', (tester) async {
    await useWindow(tester);
    final dish = kBuiltinDishes.firstWhere((d) => d.name == '宫保鸡丁');

    await tester.pumpWidget(
      hostApp(
        trigger((context) {
          showDishResultDialog(
            context,
            dish: dish,
            onReroll: () async => dish,
          );
        }),
      ),
    );
    await tester.tap(find.text('打开'));
    await settleWithIo(tester);
    // 先把占位图解码进缓存，否则截图里图片区域只有加载底色
    await precachePlaceholder(tester);

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/03_result_dialog.png'),
    );
  });

  testWidgets('设置页', (tester) async {
    await useWindow(tester);
    await tester.pumpWidget(hostApp(const SettingsPage()));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/04_settings.png'),
    );
  });

  testWidgets('设置页 - 数据保存位置弹窗', (tester) async {
    await useWindow(tester);
    await tester.pumpWidget(hostApp(const SettingsPage()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('数据保存位置'));
    await settleWithIo(tester);

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/05_data_location.png'),
    );
  });

  testWidgets('设置页 - 关于本软件弹窗', (tester) async {
    await useWindow(tester);
    await tester.pumpWidget(hostApp(const SettingsPage()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('关于本软件'));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/06_about.png'),
    );
  });

  test('占位图资源已经被正确打进资源包', () async {
    final data = await rootBundle.load('assets/placeholder/food_placeholder.png');
    expect(data.lengthInBytes, greaterThan(1000));
  });
}
