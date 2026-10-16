import 'dart:math';

import '../models/dish.dart';

/// 随机推荐：单纯随机，但会避免连续两次推荐同一道菜。
class RandomPicker {
  RandomPicker._();

  static final Random _random = Random();
  static int? _lastPickedId;

  /// 从池子里随机挑一道菜；[pool] 为空时返回 null
  static Dish? pick(List<Dish> pool) {
    if (pool.isEmpty) return null;

    var candidates = pool;
    if (pool.length > 1 && _lastPickedId != null) {
      final withoutLast =
          pool.where((d) => d.id != _lastPickedId).toList(growable: false);
      if (withoutLast.isNotEmpty) candidates = withoutLast;
    }

    final dish = candidates[_random.nextInt(candidates.length)];
    _lastPickedId = dish.id;
    return dish;
  }

  /// 单元测试用：重置"上一道菜"记忆
  static void resetHistory() => _lastPickedId = null;
}
