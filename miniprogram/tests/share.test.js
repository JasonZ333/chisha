/**
 * 分享功能验收测试。
 *
 * 问题（用户反馈）：小程序上架后，用户在右上角「…」里看到
 * 「转发」和「分享」都是灰的，提示「当前页面不可转发 / 当前页面不可分享」。
 *
 * 原因：转发给朋友要页面实现 onShareAppMessage，分享到朋友圈要 onShareTimeline；
 * 页面没实现时微信就把这两个菜单项置灰（账号认证、可被搜索都不影响这一点）。
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var MP = path.join(__dirname, '..');
var indexJs = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.js'), 'utf8');
var settingsJs = fs.readFileSync(path.join(MP, 'pages', 'settings', 'settings.js'), 'utf8');

test('首页实现了「转发给朋友」（onShareAppMessage）', function () {
  assert.ok(/onShareAppMessage:\s*function/.test(indexJs), '首页缺少 onShareAppMessage');

  var at = indexJs.indexOf('onShareAppMessage: function');
  var block = indexJs.slice(at, at + 300);
  assert.ok(/title:\s*SHARE_TITLE/.test(block), '转发标题应取 SHARE_TITLE');
  assert.ok(
    /path:\s*'\/pages\/index\/index'/.test(block),
    '转发应指回首页 /pages/index/index'
  );
});

test('首页实现了「分享到朋友圈」（onShareTimeline）', function () {
  assert.ok(/onShareTimeline:\s*function/.test(indexJs), '首页缺少 onShareTimeline');

  var at = indexJs.indexOf('onShareTimeline: function');
  var block = indexJs.slice(at, at + 300);
  assert.ok(/title:\s*SHARE_TITLE/.test(block), '朋友圈分享标题应取 SHARE_TITLE');
});

test('SHARE_TITLE 已定义且非空（否则分享出去是空白标题）', function () {
  var m = indexJs.match(/var SHARE_TITLE = '([^']+)'/);
  assert.ok(m, '缺少 SHARE_TITLE 常量');
  assert.ok(m[1].trim().length >= 4, 'SHARE_TITLE 太短：' + m[1]);
});

test('两个页面都显式打开了分享菜单（转发 + 朋友圈）', function () {
  [
    ['首页', indexJs],
    ['设置页', settingsJs],
  ].forEach(function (pair) {
    var name = pair[0];
    var src = pair[1];
    assert.ok(/wx\.showShareMenu\s*\(/.test(src), name + ' 应调用 wx.showShareMenu');
    assert.ok(
      /menus:\s*\[\s*'shareAppMessage'\s*,\s*'shareTimeline'\s*\]/.test(src),
      name + ' 的 showShareMenu 应同时包含 shareAppMessage 与 shareTimeline'
    );
  });
});

test('设置页也实现了两个分享方法（在该页转发不会置灰）', function () {
  assert.ok(/onShareAppMessage:\s*function/.test(settingsJs), '设置页缺少 onShareAppMessage');
  assert.ok(/onShareTimeline:\s*function/.test(settingsJs), '设置页缺少 onShareTimeline');
  // 设置页不是主入口，转发应引导回首页
  var at = settingsJs.indexOf('onShareAppMessage: function');
  assert.ok(
    /path:\s*'\/pages\/index\/index'/.test(settingsJs.slice(at, at + 300)),
    '设置页转发应指向首页'
  );
});

test('没有调用 hideShareMenu（会把入口整个藏掉）', function () {
  assert.strictEqual(
    /wx\.hideShareMenu/.test(indexJs + settingsJs),
    false,
    '不应调用 wx.hideShareMenu，否则转发/分享会被隐藏'
  );
});
