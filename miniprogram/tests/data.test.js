/**
 * 数据完整性测试（小程序版）。
 *
 * 数据由 tools/sync_miniprogram_data.py 从 Flutter 版生成，
 * 这里校验它与需求一致：64 道菜、10 个档位、10/20 元档各 12 道、其余各 5 道、图片齐全。
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var dishUtil = require('../utils/dishes.js');
var dishes = dishUtil.dishes;
var tiers = dishUtil.tiers;

var IMAGE_DIR = path.join(__dirname, '..', 'images', 'dishes');

test('共有 64 道菜', function () {
  assert.strictEqual(dishes.length, 64);
});

test('菜品 id 唯一且连续（1~64）', function () {
  var ids = dishes.map(function (d) {
    return d.id;
  });
  assert.strictEqual(new Set(ids).size, 64, 'id 必须唯一');
  assert.deepStrictEqual(
    ids.slice().sort(function (a, b) {
      return a - b;
    }),
    Array.from({ length: 64 }, function (_, i) {
      return i + 1;
    })
  );
});

test('每道菜都有菜名、正价格、分类和图片文件名', function () {
  dishes.forEach(function (d) {
    assert.ok(d.name && d.name.length > 0, 'id=' + d.id + ' 缺菜名');
    assert.ok(typeof d.price === 'number' && d.price > 0, 'id=' + d.id + ' 价格异常');
    assert.ok(d.category && d.category.length > 0, 'id=' + d.id + ' 缺分类');
    assert.ok(/\.jpg$/.test(d.image), 'id=' + d.id + ' 图片应为 .jpg');
  });
});

test('每道菜的价格都能落在某个档位内（没有不可见的菜）', function () {
  dishes.forEach(function (d) {
    var tier = dishUtil.tierOfPrice(d.price);
    assert.ok(tier, d.name + ' 价格 ' + d.price + ' 不属于任何档位');
  });
});

test('共有 10 个档位，且完整覆盖 0~100 元不重不漏', function () {
  assert.strictEqual(tiers.length, 10);
  assert.strictEqual(tiers[0].min, 0);
  assert.strictEqual(tiers[tiers.length - 1].max, 100);
  for (var i = 1; i < tiers.length; i++) {
    assert.strictEqual(
      tiers[i].min,
      tiers[i - 1].max + 1,
      tiers[i].label + ' 与上一档不连续'
    );
  }
});

test('各档位菜品数符合要求（10/20 元档各 12 道，其余各 5 道）', function () {
  // 《增加功能》要求把 10 元档与 20 元档各增加到 12 道（原 5 道 + 新增 7 道）
  var expected = { 10: 12, 20: 12 };
  tiers.forEach(function (t) {
    var want = expected[t.level] || 5;
    var list = dishUtil.dishesInTier(t.level);
    assert.strictEqual(
      list.length,
      want,
      t.label + ' 有 ' + list.length + ' 道菜，应为 ' + want + ' 道'
    );
  });
  assert.strictEqual(dishes.length, 12 + 12 + 5 * 8, '总数应与各档之和一致');
});

test('超过 100 元的菜不显示（maxVisiblePrice = 100）', function () {
  assert.strictEqual(dishUtil.maxVisiblePrice, 100);
  assert.strictEqual(dishUtil.visibleDishes().length, dishes.length);
});

test('缺图情况必须与「待补图」清单完全一致', function () {
  var pending = require('../data/pending_images.js');
  var missing = dishes
    .filter(function (d) {
      return !fs.existsSync(path.join(IMAGE_DIR, d.image));
    })
    .map(function (d) {
      return d.image;
    });

  assert.deepStrictEqual(
    missing.slice().sort(),
    pending.slice().sort(),
    '实际缺图与「待补图」清单不一致。实际缺：' + (missing.join(', ') || '无')
  );
});

test('小程序版不含"看吃播"相关字段（第 1 条：小程序版砍掉跳转吃播）', function () {
  dishes.forEach(function (d) {
    assert.strictEqual(d.videoUrl, undefined);
    assert.strictEqual(d.video, undefined);
  });
  var pageFiles = fs.readdirSync(path.join(__dirname, '..', 'pages', 'index'));
  var source = pageFiles
    .filter(function (f) {
      return /\.(js|wxml)$/.test(f);
    })
    .map(function (f) {
      return fs.readFileSync(path.join(__dirname, '..', 'pages', 'index', f), 'utf8');
    })
    .join('\n');
  assert.ok(source.indexOf('吃播') === -1, '小程序页面里不应出现"吃播"');
  assert.ok(source.indexOf('navigateToMiniProgram') !== -1, '应当使用 navigateToMiniProgram 跳外卖');
});
