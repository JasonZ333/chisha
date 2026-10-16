/**
 * 随机抽取逻辑测试（小程序版）。
 *
 * 随机源是注入的，所以可以断言确定性结果，而不是"跑一次看看"。
 */

var test = require('node:test');
var assert = require('node:assert');

var randomUtil = require('../utils/random.js');
var dishUtil = require('../utils/dishes.js');

test('pickOne 按随机值取对应下标', function () {
  var list = ['a', 'b', 'c', 'd'];
  assert.strictEqual(randomUtil.pickOne(list, function () { return 0; }), 'a');
  assert.strictEqual(randomUtil.pickOne(list, function () { return 0.5; }), 'c');
  assert.strictEqual(randomUtil.pickOne(list, function () { return 0.99; }), 'd');
});

test('pickOne 对空列表返回 null', function () {
  assert.strictEqual(randomUtil.pickOne([], function () { return 0; }), null);
  assert.strictEqual(randomUtil.pickOne(null, function () { return 0; }), null);
});

test('pickOne 在随机值取到边界 1 时不越界', function () {
  var list = ['a', 'b', 'c'];
  assert.strictEqual(randomUtil.pickOne(list, function () { return 1; }), 'c');
});

test('pickAnyDish 返回一道真实存在的菜', function () {
  for (var i = 0; i < 200; i++) {
    var dish = randomUtil.pickAnyDish();
    assert.ok(dish, '不应返回空');
    assert.ok(
      dishUtil.dishes.some(function (d) {
        return d.id === dish.id;
      }),
      '返回了不存在的菜：' + JSON.stringify(dish)
    );
  }
});

test('pickAnyDish 能覆盖到全部 50 道菜（等概率、不遗漏）', function () {
  var seen = new Set();
  for (var i = 0; i < 20000; i++) {
    seen.add(randomUtil.pickAnyDish().id);
  }
  assert.strictEqual(seen.size, 50, '只覆盖到 ' + seen.size + ' 道菜');
});

test('pickDishInTier 只会返回该档位内的菜', function () {
  dishUtil.tiers.forEach(function (tier) {
    for (var i = 0; i < 50; i++) {
      var dish = randomUtil.pickDishInTier(tier.level);
      assert.ok(dish, tier.label + ' 应当有菜');
      assert.ok(
        dish.price >= tier.min && dish.price <= tier.max,
        dish.name + '（' + dish.price + ' 元）不在 ' + tier.label
      );
    }
  });
});

test('pickDishInTier 对不存在的档位返回 null', function () {
  assert.strictEqual(randomUtil.pickDishInTier(999), null);
  assert.strictEqual(randomUtil.pickDishInTier(-1), null);
});

test('pickDishInTier 能覆盖该档位的全部 5 道菜', function () {
  dishUtil.tiers.forEach(function (tier) {
    var seen = new Set();
    for (var i = 0; i < 2000; i++) {
      seen.add(randomUtil.pickDishInTier(tier.level).id);
    }
    assert.strictEqual(seen.size, 5, tier.label + ' 只覆盖到 ' + seen.size + ' 道');
  });
});

// ── F4：附近美食随机（《增加功能.docx》第 4 条）────────────────
// 需求原文：「首页增加一个附近美食随机按钮，功能与所有价位随机、分价位随机一致」

test('pickNearbyDish 返回一道真实存在的菜', function () {
  for (var i = 0; i < 200; i++) {
    var dish = randomUtil.pickNearbyDish();
    assert.ok(dish, '不应返回空');
    assert.ok(
      dishUtil.dishes.some(function (d) {
        return d.id === dish.id;
      }),
      '返回了不存在的菜：' + JSON.stringify(dish)
    );
  }
});

test('pickNearbyDish 与「所有价位随机」范围一致（覆盖全部 50 道菜）', function () {
  var nearby = new Set();
  var any = new Set();
  for (var i = 0; i < 20000; i++) {
    nearby.add(randomUtil.pickNearbyDish().id);
    any.add(randomUtil.pickAnyDish().id);
  }
  assert.strictEqual(nearby.size, 50, '附近美食只覆盖到 ' + nearby.size + ' 道菜');
  assert.deepStrictEqual(
    Array.from(nearby).sort(function (a, b) {
      return a - b;
    }),
    Array.from(any).sort(function (a, b) {
      return a - b;
    }),
    '附近美食的候选集合应与所有价位随机一致'
  );
});

test('pickNearbyDish 尊重注入的随机源', function () {
  assert.strictEqual(randomUtil.pickNearbyDish(function () { return 0; }).id, dishUtil.dishes[0].id);
  assert.strictEqual(randomUtil.pickNearbyDish(function () { return 1; }).id, 50);
});

test('首页确实有「附近美食随机」按钮，且绑定了处理函数', function () {
  var fs = require('node:fs');
  var path = require('node:path');
  var wxml = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index', 'index.wxml'), 'utf8');
  var js = fs.readFileSync(path.join(__dirname, '..', 'pages', 'index', 'index.js'), 'utf8');

  assert.ok(wxml.indexOf('附近美食随机') !== -1, 'WXML 里缺少按钮文案');
  assert.ok(/bindtap="onRandomNearby"/.test(wxml), '按钮未绑定 onRandomNearby');
  assert.ok(/onRandomNearby:\s*function/.test(js), 'JS 里缺少 onRandomNearby 处理函数');

  // 三个随机入口都要在
  assert.ok(/bindtap="onRandomAny"/.test(wxml), '缺少所有价位随机');
  assert.ok(/bindchange="onPickTier"/.test(wxml), '缺少按价位随机');
});
