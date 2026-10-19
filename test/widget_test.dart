// 内置数据与随机逻辑的测试（纯 Dart，不依赖平台插件）。

import 'package:flutter_test/flutter_test.dart';

import 'package:chisha/data/builtin_dishes.dart';
import 'package:chisha/data/price_tiers.dart';
import 'package:chisha/models/dish.dart';
import 'package:chisha/services/random_picker.dart';

void main() {
  group('内置菜品数据', () {
    test('共 64 道菜', () {
      expect(kBuiltinDishes.length, 64);
    });

    test('菜品编号唯一', () {
      final ids = kBuiltinDishes.map((d) => d.id).toSet();
      expect(ids.length, kBuiltinDishes.length);
    });

    test('图片文件名唯一', () {
      final names = kBuiltinDishes.map((d) => d.imageFile).toSet();
      expect(names.length, kBuiltinDishes.length);
    });

    test('各档位菜品数符合要求（10/20 元档各 12 道，其余各 5 道）', () {
      // 《增加功能》要求把 10 元档与 20 元档各增加到 12 道（原 5 道 + 新增 7 道）
      const expected = <int, int>{10: 12, 20: 12};
      for (final tier in kPriceTiers) {
        final want = expected[tier.level] ?? 5;
        final count = kBuiltinDishes.where((d) => tier.contains(d.price)).length;
        expect(count, want, reason: '${tier.label} 应有 $want 道菜，实际 $count 道');
      }
      expect(kBuiltinDishes.length, 12 + 12 + 5 * 8, reason: '总数应与各档之和一致');
    });

    test('没有超过 100 元的菜品', () {
      expect(kBuiltinDishes.every((d) => d.price <= kMaxVisiblePrice), isTrue);
    });
  });

  group('价格档位', () {
    test('档位划分符合确认稿', () {
      expect(tierOfPrice(10)!.label, '10 元档');
      expect(tierOfPrice(11)!.label, '20 元档');
      expect(tierOfPrice(20)!.label, '20 元档');
      expect(tierOfPrice(91)!.label, '100 元档');
      expect(tierOfPrice(100)!.label, '100 元档');
    });

    test('超过 100 元没有档位（完全不显示）', () {
      expect(tierOfPrice(100.5), isNull);
      expect(tierOfPrice(200), isNull);
    });

    test('共 10 个档位', () {
      expect(kPriceTiers.length, 10);
    });
  });

  group('随机推荐', () {
    setUp(RandomPicker.resetHistory);

    test('不会连续两次推荐同一道菜', () {
      const Dish a = Dish(
        id: 1,
        name: 'A',
        price: 5,
        category: '主食',
        imageFile: 'a.png',
      );
      const Dish b = Dish(
        id: 2,
        name: 'B',
        price: 6,
        category: '主食',
        imageFile: 'b.png',
      );
      final pool = <Dish>[a, b];

      var previous = RandomPicker.pick(pool);
      expect(previous, isNotNull);
      for (var i = 0; i < 50; i++) {
        final next = RandomPicker.pick(pool);
        expect(next!.id, isNot(previous!.id));
        previous = next;
      }
    });

    test('两道菜时两种结果都会出现', () {
      const Dish a = Dish(
        id: 1,
        name: 'A',
        price: 5,
        category: '主食',
        imageFile: 'a.png',
      );
      const Dish b = Dish(
        id: 2,
        name: 'B',
        price: 6,
        category: '主食',
        imageFile: 'b.png',
      );
      final seen = <int>{};
      for (var i = 0; i < 200; i++) {
        seen.add(RandomPicker.pick(<Dish>[a, b])!.id);
      }
      expect(seen, containsAll(<int>[1, 2]));
    });

    test('空池子返回 null', () {
      expect(RandomPicker.pick(<Dish>[]), isNull);
    });
  });

  group('菜名与视频入口', () {
    test('视频搜索关键词是「菜名 + 吃播」', () {
      final dish = kBuiltinDishes.firstWhere((d) => d.name == '宫保鸡丁');
      expect(dish.videoKeyword, '宫保鸡丁 吃播');
      expect(dish.videoTitle, '抖音搜索：宫保鸡丁 吃播');
    });

    test('整数价格不显示小数点', () {
      final dish = kBuiltinDishes.firstWhere((d) => d.price == 42);
      expect(dish.priceLabel, '42 元');
    });
  });
}
