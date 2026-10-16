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

test('listPlatforms 返回平台名与"能否直接跳转"标记', function () {
  var list = takeout.listPlatforms();
  assert.strictEqual(list.length, 3);
  list.forEach(function (item) {
    assert.ok(item.key && item.name, '缺少 key 或 name');
    assert.strictEqual(typeof item.canJump, 'boolean');
  });
  // 京东已知 appId，应当可跳转
  var jd = list.filter(function (i) {
    return i.key === 'jd';
  })[0];
  assert.strictEqual(jd.canJump, true, '京东已配置 appId，应可跳转');
});

test('京东使用已知的固定 AppID', function () {
  assert.strictEqual(takeout.findPlatform('jd').appId, 'wx91d27dbf599dff74');
});

test('未配置 appId 的平台降级为"只复制菜名"，而不是报错', function () {
  var meituan = takeout.findPlatform('meituan');
  var eleme = takeout.findPlatform('eleme');
  assert.strictEqual(meituan.appId, '', '前提：美团暂未配置 appId');
  assert.strictEqual(eleme.appId, '', '前提：饿了么暂未配置 appId');

  assert.strictEqual(takeout.decideAction(meituan), 'copy');
  assert.strictEqual(takeout.decideAction(eleme), 'copy');
  assert.strictEqual(takeout.decideAction(takeout.findPlatform('jd')), 'jump');
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

test('buildJumpOptions 对未配置 appId 的平台返回 null（调用方据此降级）', function () {
  assert.strictEqual(takeout.buildJumpOptions(takeout.findPlatform('meituan'), '炒饭'), null);
  assert.strictEqual(takeout.buildJumpOptions(null, '炒饭'), null);
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
