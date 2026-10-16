// 需求 F4 的验收测试：首页新增「附近美食随机」按钮，行为与另外两个随机按钮一致。
//
// 《增加功能.docx》第 4 条：「首页增加一个附近美食随机按钮，
// 功能与所有价位随机、分价位随机一致」。
//
// 说明：桌面版没有定位能力，菜品数据里也没有「附近店铺」的概念，
// 所以候选集合目前就是全部菜品 —— 本测试锁定的正是"与所有价位随机一致"这一点。

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:chisha/data/builtin_dishes.dart';
import 'package:chisha/models/dish.dart';
import 'package:chisha/pages/home_page.dart';
import 'package:chisha/services/dish_repository.dart';

import 'test_helpers.dart';

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

  /// 结果弹窗里显示的是哪一道菜
  List<Dish> shownDishes() =>
      kBuiltinDishes.where((d) => find.text(d.name).evaluate().isNotEmpty).toList();

  /// 点一次「附近美食随机」（按钮可能在小窗口里被挤到下方，先滚到可见）
  Future<void> tapNearby(WidgetTester tester) async {
    await tester.ensureVisible(find.text('附近美食随机'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('附近美食随机'));
    await settleWithIo(tester);
  }

  testWidgets('首页同时存在三个随机入口', (tester) async {
    await bootHome(tester);

    expect(find.text('所有价位随机'), findsOneWidget);
    expect(find.text('分价位随机'), findsOneWidget);
    expect(find.text('附近美食随机'), findsOneWidget);
  });

  testWidgets('点「附近美食随机」会随机推荐一道内置菜品', (tester) async {
    await bootHome(tester);

    await tapNearby(tester);

    expect(find.byType(AlertDialog), findsOneWidget, reason: '应当弹出结果弹窗');
    expect(shownDishes(), hasLength(1), reason: '弹窗里应当正好显示一道内置菜品');
    expect(find.text('再随机一个'), findsOneWidget);
    expect(find.text('关闭'), findsOneWidget);
  });

  testWidgets('可以反复点：关掉弹窗再点，每次都能出结果', (tester) async {
    await bootHome(tester);

    for (var i = 0; i < 3; i++) {
      await tapNearby(tester);
      expect(shownDishes(), hasLength(1), reason: '第 ${i + 1} 次没有出结果');

      await tester.tap(find.text('关闭'));
      await settleWithIo(tester);
      expect(find.byType(AlertDialog), findsNothing, reason: '弹窗应当已关闭');
    }
  });

  testWidgets('候选是所有价位（多次点击会落在不同菜品上）', (tester) async {
    await bootHome(tester);

    final seen = <int>{};
    for (var i = 0; i < 12; i++) {
      await tapNearby(tester);
      seen.add(shownDishes().single.id);
      await tester.tap(find.text('关闭'));
      await settleWithIo(tester);
    }

    // 12 次从 50 道里抽，只出不到 4 种几乎不可能
    expect(
      seen.length,
      greaterThan(3),
      reason: '每次都是同一道菜，说明候选集合可能被写死了',
    );
    expect(
      seen.length,
      lessThanOrEqualTo(kBuiltinDishes.length),
      reason: '不应出现内置数据之外的菜',
    );
  });
}
