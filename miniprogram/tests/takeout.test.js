/**
 * 点外卖功能测试（《增加功能.docx》第 3 条）。
 *
 * 产品行为：随机出一道菜后 → 复制菜名 → 弹出外卖平台选择页 →
 * 点击后跳转到对应平台的微信小程序。
 *
 * 这里覆盖：平台清单是否符合需求、跳转参数是否正确、
 * appId 未配置时是否安全降级为"只复制菜名"。
 */

var test = require('node:test');
var assert = require('node:assert');

var takeout = require('../utils/takeout.js');

test('平台清单为 美团 / 京东 / 饿了么（已去掉淘宝闪购）', function () {
  var names = takeout.PLATFORMS.map(function (p) {
    return p.name;
  });
  assert.deepStrictEqual(names, ['美团', '京东', '饿了么']);

  var all = names.join(',');
  assert.ok(all.indexOf('淘宝') === -1, '需求已改为去掉淘宝闪购');
  assert.ok(all.indexOf('饿了么') !== -1, '饿了么应在清单里');
});

test('平台 key 唯一，且都能被 findPlatform 找到', function () {
  var keys = takeout.PLATFORMS.map(function (p) {
    return p.key;
  });
  assert.strictEqual(new Set(keys).size, keys.length, 'key 必须唯一');
  keys.forEach(function (k) {
    var p = takeout.findPlatform(k);
    assert.ok(p, '找不到平台 ' + k);
    assert.strictEqual(p.key, k);
  });
});

test('三个平台都已配置 AppID，且格式合法、互不相同', function () {
  var appIds = takeout.PLATFORMS.map(function (p) {
    return p.appId;
  });
  appIds.forEach(function (id, i) {
    assert.match(
      id,
      /^wx[0-9a-f]{16}$/,
      takeout.PLATFORMS[i].name + ' 的 appId 格式不对：' + id
    );
  });
  assert.strictEqual(new Set(appIds).size, 3, '三个平台的 appId 不能重复');
});

test('AppID 与需求方提供的值一致', function () {
  assert.strictEqual(takeout.findPlatform('meituan').appId, 'wx2c348cf579062e56');
  assert.strictEqual(takeout.findPlatform('jd').appId, 'wx91d27dbf599dff74');
  assert.strictEqual(takeout.findPlatform('eleme').appId, 'wxece3a9a4c82f58c9');
});

test('三个平台都能直接跳转（不再降级）', function () {
  ['meituan', 'jd', 'eleme'].forEach(function (key) {
    var p = takeout.findPlatform(key);
    assert.strictEqual(takeout.decideAction(p), 'jump', p.name + ' 应当可跳转');
    assert.ok(takeout.buildJumpOptions(p, '炒饭'), p.name + ' 应当能构造出跳转参数');
  });
});

test('listPlatforms 三个平台都标记为可跳转', function () {
  var list = takeout.listPlatforms();
  assert.strictEqual(list.length, 3);
  list.forEach(function (item) {
    assert.strictEqual(item.canJump, true, item.name + ' 应当标记为可跳转');
  });
});

// ── 降级逻辑仍必须有效：用"没配 appId"的合成平台来测 ──────────
// 真实平台现在都配好了，但 appId 将来可能被清空（换平台/临时停用），
// 所以这条兜底路径必须继续有测试守着。
test('未配置 appId 的平台降级为「只复制菜名」，而不是报错', function () {
  var notConfigured = { key: 'x', name: '某平台', appId: '', path: '' };
  assert.strictEqual(takeout.decideAction(notConfigured), 'copy');
  assert.strictEqual(takeout.buildJumpOptions(notConfigured, '炒饭'), null);
});

test('decideAction 对不存在的平台返回 unknown（不抛异常）', function () {
  assert.strictEqual(takeout.decideAction(null), 'unknown');
  assert.strictEqual(takeout.decideAction(undefined), 'unknown');
  assert.strictEqual(takeout.decideAction(takeout.findPlatform('不存在')), 'unknown');
});

test('buildJumpOptions 组装出 wx.navigateToMiniProgram 需要的参数', function () {
  var jd = takeout.findPlatform('jd');
  var options = takeout.buildJumpOptions(jd, '宫保鸡丁');

  assert.strictEqual(options.appId, 'wx91d27dbf599dff74');
  assert.deepStrictEqual(options.extraData, { dishName: '宫保鸡丁' });
  // path 没配置时不应带上，否则会打开一个不存在的页面
  assert.strictEqual(options.path, undefined);
});

test('配置了 path 的平台会带上 path', function () {
  var fake = { key: 'x', name: 'X', appId: 'wx1234567890abcdef', path: 'pages/search/index?kw=1' };
  var options = takeout.buildJumpOptions(fake, '小笼包');
  assert.strictEqual(options.path, 'pages/search/index?kw=1');
  assert.strictEqual(options.appId, 'wx1234567890abcdef');
});

test('复制提示与选择页标题都带上菜名', function () {
  assert.ok(takeout.copyTip('蛋炒饭').indexOf('蛋炒饭') !== -1);
  assert.ok(takeout.sheetTitle('蛋炒饭').indexOf('蛋炒饭') !== -1);
});

test('菜名为空时不出现 undefined', function () {
  assert.ok(takeout.copyTip('').indexOf('undefined') === -1);
  assert.ok(takeout.copyTip().indexOf('undefined') === -1);
  assert.ok(takeout.sheetTitle().indexOf('undefined') === -1);
  var options = takeout.buildJumpOptions(takeout.findPlatform('jd'));
  assert.strictEqual(options.extraData.dishName, '');
});

test('页面里必须真的调用 wx.navigateToMiniProgram，而不是只弹提示', function () {
  var fs = require('node:fs');
  var path = require('node:path');
  var source = fs.readFileSync(
    path.join(__dirname, '..', 'pages', 'index', 'index.js'),
    'utf8'
  );
  assert.ok(source.indexOf('wx.navigateToMiniProgram') !== -1, '缺少跳转调用');
  assert.ok(source.indexOf('wx.setClipboardData') !== -1, '缺少复制菜名');
});
