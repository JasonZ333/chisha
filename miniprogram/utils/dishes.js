/**
 * 菜品与档位查询（小程序版）。
 *
 * 数据来自 data/dishes.js 和 data/tiers.js，两者由
 * tools/sync_miniprogram_data.py 从 Flutter 版的 Dart 源码生成，
 * 保证两个端的数据完全一致。
 */

var dishes = require('../data/dishes.js');
var tierData = require('../data/tiers.js');

var TIERS = tierData.tiers;
var MAX_VISIBLE_PRICE = tierData.maxVisiblePrice;

/** 找到某个价格所属的档位；超过上限返回 null（不显示） */
function tierOfPrice(price) {
  for (var i = 0; i < TIERS.length; i++) {
    if (price >= TIERS[i].min && price <= TIERS[i].max) return TIERS[i];
  }
  return null;
}

/** 所有可见菜品（价格不超过上限） */
function visibleDishes() {
  return dishes.filter(function (d) {
    return d.price <= MAX_VISIBLE_PRICE;
  });
}

/** 某个档位下的菜品 */
function dishesInTier(level) {
  var tier = null;
  for (var i = 0; i < TIERS.length; i++) {
    if (TIERS[i].level === level) tier = TIERS[i];
  }
  if (!tier) return [];
  return dishes.filter(function (d) {
    return d.price >= tier.min && d.price <= tier.max;
  });
}

module.exports = {
  dishes: dishes,
  tiers: TIERS,
  maxVisiblePrice: MAX_VISIBLE_PRICE,
  tierOfPrice: tierOfPrice,
  visibleDishes: visibleDishes,
  dishesInTier: dishesInTier,
};
