/// ⚠️ 已废弃（2026-10）：桌面端停止维护，价格档位的**唯一数据源**已迁到小程序侧
/// `miniprogram/data/tiers.js`（统一由 `tools/dish_source.py` 读取）。
/// 本文件仅为 Flutter 代码仍能编译而保留，**不要再改这里的档位**，
/// 否则会和小程序端的档位不一致。
///
/// 价格档位定义。
///
/// 需求确认稿：
/// - 10 元档 = 10 元及以下
/// - 20 元档 = 11~20 元
/// - ……
/// - 100 元档 = 91~100 元
/// - 超过 100 元的菜品完全不显示
class PriceTier {
  const PriceTier({
    required this.level,
    required this.minPrice,
    required this.maxPrice,
  });

  /// 档位名上的数字：10、20、……、100
  final int level;

  /// 该档位最低价（含）
  final double minPrice;

  /// 该档位最高价（含）
  final double maxPrice;

  String get label => '$level 元档';

  /// 区间说明，例如「11 ~ 20 元」
  String get rangeLabel =>
      level == 10 ? '10 元及以下' : '${minPrice.toInt()} ~ ${maxPrice.toInt()} 元';

  /// 价格是否落在这个档位内
  bool contains(double price) => price >= minPrice && price <= maxPrice;
}

/// 10 个价格档位：10 元档 ~ 100 元档
const List<PriceTier> kPriceTiers = <PriceTier>[
  PriceTier(level: 10, minPrice: 0, maxPrice: 10),
  PriceTier(level: 20, minPrice: 11, maxPrice: 20),
  PriceTier(level: 30, minPrice: 21, maxPrice: 30),
  PriceTier(level: 40, minPrice: 31, maxPrice: 40),
  PriceTier(level: 50, minPrice: 41, maxPrice: 50),
  PriceTier(level: 60, minPrice: 51, maxPrice: 60),
  PriceTier(level: 70, minPrice: 61, maxPrice: 70),
  PriceTier(level: 80, minPrice: 71, maxPrice: 80),
  PriceTier(level: 90, minPrice: 81, maxPrice: 90),
  PriceTier(level: 100, minPrice: 91, maxPrice: 100),
];

/// 超过这个价格的菜品完全不显示
const double kMaxVisiblePrice = 100;

/// 找到某个价格所属的档位；超过 100 元返回 null（不显示）
PriceTier? tierOfPrice(double price) {
  for (final tier in kPriceTiers) {
    if (tier.contains(price)) return tier;
  }
  return null;
}
