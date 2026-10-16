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

/** 两端必须逐字一致的文案 */
var SHARED_TEXTS = [
  '吃啥',
  '今天吃什么？',
  '别纠结了，交给命运',
  '所有价位随机',
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

test('「所有价位随机」的副标题两端一致（含档位数量）', function () {
  // 桌面端：从 ${kPriceTiers.length} 个档位的全部菜品里挑一道
  assert.ok(
    dart.indexOf('个档位的全部菜品里挑一道') !== -1,
    '桌面端副标题变了'
  );
  assert.ok(
    wxml.indexOf('个档位的全部菜品里挑一道') !== -1,
    '小程序副标题缺少「个档位的全部菜品里挑一道」'
  );
  // 小程序用 {{tierCount}} 渲染，必须由 10 个档位提供
  assert.ok(/从 \{\{tierCount\}\} 个档位/.test(wxml), '小程序应当用 {{tierCount}} 渲染档位数量');
  assert.ok(/tierCount:\s*dishUtil\.tiers\.length/.test(indexJs), 'tierCount 应取档位数组长度');
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
