/**
 * 数据完整性测试（小程序版）。
 *
 * 数据由 tools/sync_miniprogram_data.py 从 Flutter 版生成，
 * 这里校验它与需求一致：50 道菜、10 个档位、每档 5 道、图片齐全。
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var dishUtil = require('../utils/dishes.js');
var dishes = dishUtil.dishes;
var tiers = dishUtil.tiers;

var IMAGE_DIR = path.join(__dirname, '..', 'images', 'dishes');

test('共有 50 道菜', function () {
  assert.strictEqual(dishes.length, 50);
});

test('菜品 id 唯一且连续（1~50）', function () {
  var ids = dishes.map(function (d) {
    return d.id;
  });
  assert.strictEqual(new Set(ids).size, 50, 'id 必须唯一');
  assert.deepStrictEqual(
    ids.slice().sort(function (a, b) {
      return a - b;
    }),
    Array.from({ length: 50 }, function (_, i) {
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

test('每个档位正好 5 道菜', function () {
  tiers.forEach(function (t) {
    var list = dishUtil.dishesInTier(t.level);
    assert.strictEqual(list.length, 5, t.label + ' 有 ' + list.length + ' 道菜，应为 5 道');
  });
});

test('超过 100 元的菜不显示（maxVisiblePrice = 100）', function () {
  assert.strictEqual(dishUtil.maxVisiblePrice, 100);
  assert.strictEqual(dishUtil.visibleDishes().length, dishes.length);
});

test('每道菜的图片都真实存在于 miniprogram/images/dishes/', function () {
  var missing = dishes
    .filter(function (d) {
      return !fs.existsSync(path.join(IMAGE_DIR, d.image));
    })
    .map(function (d) {
      return d.image;
    });
  assert.deepStrictEqual(missing, [], '以下图片缺失：' + missing.join(', '));
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
