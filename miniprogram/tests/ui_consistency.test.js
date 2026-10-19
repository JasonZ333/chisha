/**
 * 任务一验收测试：小程序端界面与 Windows 桌面端一致。
 *
 * 思路：**直接拿桌面端的 Dart 源码当参照**，断言小程序页面里出现同样的文案与图标。
 * 这样将来桌面端改了文案，这边会立刻失败，强制两端保持同步。
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var MP = path.join(__dirname, '..');
var DART = path.join(MP, '..', 'lib', 'pages', 'home_page.dart');

var wxml = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.wxml'), 'utf8');
var wxss = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.wxss'), 'utf8');
var indexJs = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.js'), 'utf8');
var appJson = fs.readFileSync(path.join(MP, 'app.json'), 'utf8');
var dart = fs.readFileSync(DART, 'utf8');

/** 两端必须逐字一致的文案
 *  （第一张按钮「所有价位随机 → 10 ~ 100元随机」是用户要求的**小程序端专属改动**，
 *    见下面单独那条用例，所以不放进这个清单）*/
var SHARED_TEXTS = [
  '吃啥',
  '今天吃什么？',
  '别纠结了，交给命运',
  '分价位随机',
  '先选 10 ~ 100 元档位，再随机一道',
  '附近美食随机',
];

test('桌面端源码存在（一致性测试的参照）', function () {
  assert.ok(dart.length > 0, '读不到 ' + DART);
});

test('首页文案与桌面端逐字一致', function () {
  SHARED_TEXTS.forEach(function (text) {
    assert.ok(
      dart.indexOf(text) !== -1,
      '桌面端 home_page.dart 里找不到「' + text + '」——说明桌面端改了文案，小程序需要同步'
    );
    assert.ok(wxml.indexOf(text) !== -1, '小程序 index.wxml 里缺少「' + text + '」');
  });
});

test('第一张按钮文案为「10 ~ 100元随机」，不带副标题（任务1）', function () {
  var at = wxml.indexOf('bindtap="onRandomAny"');
  assert.ok(at !== -1, '找不到第一张卡片（onRandomAny）的绑定');

  var block = wxml.slice(at, at + 500);
  assert.ok(
    block.indexOf('>10 ~ 100元随机<') !== -1,
    '第一张卡片的主标题应为「10 ~ 100元随机」'
  );
  assert.strictEqual(block.indexOf('card-sub'), -1, '第一张卡片不应有副标题');
  assert.strictEqual(
    block.indexOf('所有价位随机'),
    -1,
    '第一张卡片里不应再出现「所有价位随机」'
  );

  // 整页也不该再残留旧文案「开始」
  assert.strictEqual(
    wxml.indexOf('所有价位随机'),
    -1,
    '小程序首页整体不应再出现「所有价位随机」'
  );
  assert.strictEqual(
    wxml.indexOf('>开始<'),
    -1,
    '小程序首页整体不应再出现「开始」按钮'
  );
  // 副标题用过的 tierCount 已无用，不应再残留在页面数据里
  assert.strictEqual(
    indexJs.indexOf('tierCount'),
    -1,
    'tierCount 已无使用处，应从页面数据中清理'
  );

  // 这一版用户明确要求「只改小程序端」，桌面端保持原样
  assert.ok(
    dart.indexOf('所有价位随机') !== -1,
    '桌面端 home_page.dart 本版应保持「所有价位随机」不变'
  );
});

test('三个按钮都是「图标 + 主标题 + 副标题 + 右箭头」的卡片结构', function () {
  // 桌面端 _BigButton 的结构：Icon + Column(title, subtitle) + chevron_right
  assert.ok(dart.indexOf('Icons.chevron_right') !== -1, '桌面端应有 chevron_right');
  assert.ok(dart.indexOf('Icons.shuffle') !== -1, '桌面端应有 shuffle 图标');
  assert.ok(dart.indexOf('Icons.tune') !== -1, '桌面端应有 tune 图标');
  assert.ok(dart.indexOf('Icons.location_on_outlined') !== -1, '桌面端应有 location_on_outlined 图标');
  assert.ok(dart.indexOf('Icons.ramen_dining_outlined') !== -1, '桌面端应有碗筷图标');
  assert.ok(dart.indexOf('Icons.settings_outlined') !== -1, '桌面端应有设置齿轮');

  var icons = wxml.match(/src="\/images\/icons\/[^"]+"/g) || [];
  assert.ok(icons.length >= 8, '小程序里应引用图标图片，实际 ' + icons.length + ' 个');
  ['icon_bowl.png', 'icon_settings.png', 'icon_shuffle_white.png', 'icon_tune.png',
   'icon_location.png', 'icon_chevron.png', 'icon_chevron_white.png'].forEach(function (name) {
    assert.ok(wxml.indexOf(name) !== -1, '小程序缺少图标 ' + name);
  });

  // 卡片样式：圆角 + 实心/描边两种
  assert.ok(/\.card-btn\s*\{/.test(wxss), '缺少 .card-btn 样式');
  assert.ok(/\.card-btn-filled/.test(wxss), '缺少实心卡片样式');
  assert.ok(/\.card-icon/.test(wxss) && /\.card-arrow/.test(wxss), '缺少图标/箭头样式');
});

test('右上角有设置齿轮，并能跳到设置页', function () {
  assert.ok(/bindtap="onOpenSettings"/.test(wxml), '齿轮未绑定 onOpenSettings');
  assert.ok(/onOpenSettings:\s*function/.test(indexJs), '缺少 onOpenSettings 处理函数');
  assert.ok(
    indexJs.indexOf('/pages/settings/settings') !== -1,
    'onOpenSettings 应跳转到 /pages/settings/settings'
  );
  assert.ok(
    appJson.indexOf('pages/settings/settings') !== -1,
    '设置页未在 app.json 中注册'
  );
});

test('设置页文件齐全', function () {
  ['settings.js', 'settings.json', 'settings.wxml', 'settings.wxss'].forEach(function (f) {
    var p = path.join(MP, 'pages', 'settings', f);
    assert.ok(fs.existsSync(p), '缺少 ' + p);
  });
});

test('设置页包含「关于本软件」与「图片来源与署名」（后者是 CC BY-SA 的署名要求）', function () {
  var swxml = fs.readFileSync(path.join(MP, 'pages', 'settings', 'settings.wxml'), 'utf8');
  var sjs = fs.readFileSync(path.join(MP, 'pages', 'settings', 'settings.js'), 'utf8');
  assert.ok(swxml.indexOf('关于本软件') !== -1, '设置页缺少「关于本软件」');
  assert.ok(swxml.indexOf('图片来源与署名') !== -1, '设置页缺少「图片来源与署名」');
  assert.ok(sjs.indexOf('credits') !== -1, '设置页应读取署名数据');
});

test('所有被引用的图标文件都真实存在', function () {
  var icons = wxml.match(/\/images\/icons\/[A-Za-z0-9_.-]+/g) || [];
  var uniq = Array.from(new Set(icons));
  assert.ok(uniq.length > 0);
  uniq.forEach(function (rel) {
    var p = path.join(MP, rel.replace(/^\//, ''));
    assert.ok(fs.existsSync(p), '图标文件不存在：' + rel);
  });
});

test('桌面端与小程序都不含跳转吃播入口（第 1 条的要求）', function () {
  assert.strictEqual(wxml.indexOf('吃播'), -1, '小程序首页不应出现「吃播」');
  assert.strictEqual(wxss.indexOf('吃播'), -1, '小程序样式不应出现「吃播」');
});

test('随机结果以屏幕居中的弹窗呈现（对齐桌面端的 AlertDialog）', function () {
  // 桌面端：结果用 showDialog + AlertDialog，是屏幕正中的对话框
  var dialogDart = fs.readFileSync(
    path.join(MP, '..', 'lib', 'widgets', 'dish_result_dialog.dart'),
    'utf8'
  );
  assert.ok(
    dialogDart.indexOf('AlertDialog') !== -1,
    '桌面端结果应是 AlertDialog（屏幕正中的对话框）'
  );

  // 小程序：结果包在 .modal-wrap 里，而它是 flex 双向居中
  assert.ok(/class="modal-wrap"/.test(wxml), '结果应包在 .modal-wrap 里');
  assert.ok(/class="modal-card"/.test(wxml), '结果卡片应使用 .modal-card');
  assert.ok(/\.modal-wrap\s*\{[^}]*display:\s*flex/.test(wxss), '.modal-wrap 应是 flex 容器');
  assert.ok(/\.modal-wrap\s*\{[^}]*align-items:\s*center/.test(wxss), '.modal-wrap 应垂直居中');
  assert.ok(
    /\.modal-wrap\s*\{[^}]*justify-content:\s*center/.test(wxss),
    '.modal-wrap 应水平居中'
  );

  // 不能再顺着页面流排列（旧写法正是这一条导致看起来贴在下方）
  assert.strictEqual(
    /class="card"\s+wx:if="\{\{hasDish\}\}"/.test(wxml),
    false,
    '结果卡片不应再作为普通流式卡片渲染'
  );

  // 遮罩可点关闭，弹窗底部也有「关闭」
  assert.ok(/class="modal-mask"[^>]*bindtap="onCloseDish"/.test(wxml), '遮罩应可点击关闭');
  assert.ok(/onCloseDish:\s*function/.test(indexJs), '缺少 onCloseDish 处理函数');
  assert.ok(wxml.indexOf('>关闭</view>') !== -1, '弹窗里缺少「关闭」按钮');
});

test('美食卡片里的按钮用 flex 双向居中（问题②）', function () {
  var at = wxss.indexOf('.btn {');
  assert.ok(at !== -1, '找不到 .btn 样式');
  var rule = wxss.slice(at, wxss.indexOf('}', at));

  assert.ok(/display:\s*flex/.test(rule), '.btn 应是 flex 容器');
  assert.ok(/align-items:\s*center/.test(rule), '.btn 应垂直居中');
  assert.ok(/justify-content:\s*center/.test(rule), '.btn 应水平居中');
  assert.strictEqual(
    /line-height:\s*88rpx/.test(rule),
    false,
    '.btn 不应再用「line-height = height」的写法（在小程序 button 上会让文字偏下）'
  );

  // 两个按钮都存在，且都使用这套居中样式
  assert.ok(wxml.indexOf('再随机一个') !== -1, '缺少「再随机一个」按钮');
  assert.ok(wxml.indexOf('点外卖') !== -1, '缺少「点外卖」按钮');
  assert.ok(/class="btn btn-ghost"/.test(wxml), '「再随机一个」应使用 .btn .btn-ghost');
  assert.ok(/class="btn btn-takeout"/.test(wxml), '「点外卖」应使用 .btn .btn-takeout');
});

test('「附近美食随机」下方的小字已在两端删除（任务二）', function () {
  var gone = '随机推荐一道（与所有价位随机一致）';
  assert.strictEqual(
    wxml.indexOf(gone),
    -1,
    '小程序首页仍保留着「' + gone + '」'
  );
  assert.strictEqual(
    dart.indexOf(gone),
    -1,
    '桌面端 home_page.dart 仍保留着「' + gone + '」，任务二要求两端都删'
  );
  // 附近美食卡片只剩主标题，不该再有副标题节点
  // 只截取该卡片自身（从 bindtap 标记往后 400 字符即覆盖整张卡片）
  var at = wxml.indexOf('bindtap="onRandomNearby"');
  assert.ok(at !== -1, '找不到「附近美食随机」卡片的绑定');
  var block = wxml.slice(at, at + 400);
  assert.strictEqual(
    block.indexOf('card-sub'),
    -1,
    '「附近美食随机」卡片里仍有副标题（card-sub）节点：' + block.replace(/\s+/g, ' ')
  );
  assert.ok(block.indexOf('card-title') !== -1, '「附近美食随机」卡片应保留主标题');
});
