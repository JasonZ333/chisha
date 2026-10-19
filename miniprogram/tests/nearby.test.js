/**
 * 任务二验收测试：附近美食随机 = 获取位置 → 搜附近餐饮 → 随机挑一家。
 *
 * 《增加功能.docx》任务二：「附近美食随机下面一行小字删除，
 * 并且点击附近美食随机之后会获取用户位置信息，随机推荐用户附近美食。」
 *
 * 本文件覆盖：腾讯位置服务请求的组装与解析、错误码翻译、
 * 随机挑选、距离格式化、定位失败的提示文案，
 * 以及页面是否真的走通了「定位 → 请求 → 展示 → 导航」这条链路。
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var nearby = require('../utils/nearby.js');

var MP = path.join(__dirname, '..');
var appJson = fs.readFileSync(path.join(MP, 'app.json'), 'utf8');
var indexJs = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.js'), 'utf8');
var indexWxml = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.wxml'), 'utf8');

// ── 配置 ────────────────────────────────────────────────
test('key 配置状态与 isConfigured() 一致，且 key 不含多余空白', function () {
  var key = nearby.CONFIG.key;
  assert.strictEqual(
    nearby.isConfigured(),
    !!key,
    'isConfigured() 应与 key 是否填写保持一致'
  );
  if (key) {
    // 从控制台粘贴 key 时经常带上换行/tab（实测踩过，会让请求报 key 格式错误）
    assert.strictEqual(key, key.trim(), 'key 前后不能有空白');
    assert.strictEqual(key.indexOf('\n'), -1, 'key 里不能有换行');
    assert.strictEqual(key.indexOf('\t'), -1, 'key 里不能有 tab');
    assert.strictEqual(key.indexOf(' '), -1, 'key 里不能有空格');
  }
});

test('页面在未配置时给出明确提示，而不是静默失败', function () {
  assert.ok(
    /isConfigured\(\)/.test(indexJs),
    'onRandomNearby 应先检查 isConfigured()'
  );
  assert.ok(
    indexJs.indexOf('还没有配置位置服务的 key') !== -1,
    '缺少未配置时的提示文案'
  );
});

// ── 请求组装 ────────────────────────────────────────────
test('buildSearchUrl 组装出腾讯位置服务的周边搜索地址', function () {
  var saved = nearby.CONFIG.key;
  nearby.CONFIG.key = 'TEST-KEY-123';
  try {
    var url = nearby.buildSearchUrl(39.9087, 116.3975);

    assert.ok(url.indexOf('https://apis.map.qq.com/ws/place/v1/search') === 0, '接口地址不对');
    assert.ok(url.indexOf('nearby(39.9087%2C116.3975%2C3000)') !== -1, 'boundary 参数不对：' + url);
    assert.ok(url.indexOf('keyword=' + encodeURIComponent('美食')) !== -1, '缺少关键词');
    assert.ok(url.indexOf('page_size=20') !== -1, '缺少每页条数');
    assert.ok(url.indexOf('orderby=_distance') !== -1, '应按距离排序');
    assert.ok(url.indexOf('key=TEST-KEY-123') !== -1, '缺少 key');
  } finally {
    nearby.CONFIG.key = saved;
  }
});

// ── 返回解析 ────────────────────────────────────────────
function okBody() {
  return {
    status: 0,
    message: 'query ok',
    count: 2,
    data: [
      {
        id: 'A1',
        title: '老王牛肉面',
        address: '朝阳区某路 1 号',
        category: '美食:中餐',
        location: { lat: 39.91, lng: 116.4 },
        _distance: 320,
      },
      {
        id: 'A2',
        title: '沙县小吃',
        address: '朝阳区某路 2 号',
        category: '美食:快餐',
        location: { lat: 39.92, lng: 116.41 },
        _distance: 1580,
      },
    ],
  };
}

test('parsePlaces 解析成功返回并做规范化', function () {
  var r = nearby.parsePlaces(okBody());

  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.places.length, 2);
  assert.strictEqual(r.places[0].title, '老王牛肉面');
  assert.strictEqual(r.places[0].address, '朝阳区某路 1 号');
  assert.strictEqual(r.places[0].category, '美食', '分类应去掉冒号后的子类');
  assert.strictEqual(r.places[0].lat, 39.91);
  assert.strictEqual(r.places[0].distance, 320);
});

test('parsePlaces 遇到非 0 状态码时翻译成中文错误', function () {
  var r = nearby.parsePlaces({ status: 190, message: 'invalid key' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.places.length, 0);
  assert.ok(r.error.indexOf('190') !== -1, '错误里应带上原始状态码');
  assert.ok(r.error.indexOf('无效的 key') !== -1, '应翻译成中文：' + r.error);
});

test('额度用完（121）的提示要说清原因并带上腾讯原文', function () {
  var r = nearby.parsePlaces({ status: 121, message: '此key每日调用量已达到上限' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.places.length, 0);
  assert.ok(r.error.indexOf('121') !== -1, '错误里应带上原始状态码：' + r.error);
  assert.ok(r.error.indexOf('调用量') !== -1, '应说明是调用量上限：' + r.error);
  assert.ok(
    r.error.indexOf('此key每日调用量已达到上限') !== -1,
    '应带上腾讯返回的原文：' + r.error
  );
});

test('parsePlaces 对空结果与非法结构都能兜住', function () {
  var empty = nearby.parsePlaces({ status: 0, data: [] });
  assert.strictEqual(empty.ok, false);
  assert.ok(empty.error.indexOf('没有搜到') !== -1, empty.error);

  var bad = nearby.parsePlaces('not an object');
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error.length > 0);

  var nullBody = nearby.parsePlaces(null);
  assert.strictEqual(nullBody.ok, false);
});

test('parsePlaces 会跳过没有店名的条目', function () {
  var body = okBody();
  body.data.push({ id: 'A3', title: '', address: 'x', location: {} });
  var r = nearby.parsePlaces(body);
  assert.strictEqual(r.places.length, 2, '空标题的条目应被跳过');
});

// ── 随机挑选 ────────────────────────────────────────────
test('pickPlace 按注入的随机源挑选，且不会越界', function () {
  var places = nearby.parsePlaces(okBody()).places;

  assert.strictEqual(nearby.pickPlace(places, function () { return 0; }).title, '老王牛肉面');
  assert.strictEqual(nearby.pickPlace(places, function () { return 0.99; }).title, '沙县小吃');
  assert.strictEqual(nearby.pickPlace(places, function () { return 1; }).title, '沙县小吃');
  assert.strictEqual(nearby.pickPlace([], function () { return 0; }), null);
  assert.strictEqual(nearby.pickPlace(null), null);
});

test('pickPlace 能覆盖到列表里的每一家', function () {
  var places = nearby.parsePlaces(okBody()).places;
  var seen = new Set();
  for (var i = 0; i < 2000; i++) {
    seen.add(nearby.pickPlace(places).title);
  }
  assert.strictEqual(seen.size, places.length, '只覆盖到 ' + seen.size + ' 家');
});

// ── 距离格式化 ──────────────────────────────────────────
test('formatDistance 小于 1 公里显示米，否则显示公里', function () {
  assert.strictEqual(nearby.formatDistance(320), '320 米');
  assert.strictEqual(nearby.formatDistance(999), '999 米');
  assert.strictEqual(nearby.formatDistance(1000), '1.0 公里');
  assert.strictEqual(nearby.formatDistance(1580), '1.6 公里');
  assert.strictEqual(nearby.formatDistance(0), '0 米');
});

test('formatDistance 对无效值返回空串（界面不显示占位标签）', function () {
  assert.strictEqual(nearby.formatDistance(null), '');
  assert.strictEqual(nearby.formatDistance(undefined), '');
  assert.strictEqual(nearby.formatDistance(NaN), '');
  assert.strictEqual(nearby.formatDistance(-5), '');
  assert.strictEqual(nearby.formatDistance('320'), '');
});

// ── 定位失败提示 ────────────────────────────────────────
test('locationErrorMessage 把各种失败翻译成人话', function () {
  assert.ok(
    nearby.locationErrorMessage({ errMsg: 'getLocation:fail auth deny' }).indexOf('位置权限') !== -1
  );
  assert.ok(
    nearby.locationErrorMessage({ errMsg: 'getLocation:fail timeout' }).indexOf('超时') !== -1
  );
  assert.ok(
    nearby.locationErrorMessage({ errMsg: 'getLocation:fail system permission denied' })
      .indexOf('手机设置') !== -1
  );
  assert.ok(nearby.locationErrorMessage({}).length > 0, '未知错误也要有兜底文案');
  assert.ok(nearby.locationErrorMessage(null).length > 0);
});

// ── 页面接线 ────────────────────────────────────────────
test('app.json 声明了位置权限与隐私接口（wx.getLocation 的硬性要求）', function () {
  assert.ok(appJson.indexOf('"requiredPrivateInfos"') !== -1, '缺少 requiredPrivateInfos');
  assert.ok(/"requiredPrivateInfos"[\s\S]*?"getLocation"/.test(appJson), 'requiredPrivateInfos 里应有 getLocation');
  assert.ok(appJson.indexOf('scope.userLocation') !== -1, '缺少 scope.userLocation 权限说明');
  assert.ok(appJson.indexOf('desc') !== -1, '权限说明要有 desc');
});

test('页面真的走通了「定位 → 请求 → 展示 → 导航」链路', function () {
  assert.ok(/wx\.getLocation\(/.test(indexJs), '缺少 wx.getLocation');
  assert.ok(/type:\s*'gcj02'/.test(indexJs), '定位坐标系应为 gcj02（腾讯地图用这个）');
  assert.ok(/wx\.request\(/.test(indexJs), '缺少 wx.request');
  assert.ok(/nearby\.buildSearchUrl\(/.test(indexJs), '请求地址应由 buildSearchUrl 生成');
  assert.ok(/nearby\.parsePlaces\(/.test(indexJs), '返回值应交给 parsePlaces 解析');
  assert.ok(/nearby\.pickPlace\(/.test(indexJs), '应从结果里随机挑一家');
  assert.ok(/wx\.openLocation\(/.test(indexJs), '缺少导航（wx.openLocation）');
  assert.ok(/wx\.openSetting\(/.test(indexJs), '定位被拒后应能引导用户去设置');
});

test('附近结果卡片有店名/距离/分类/地址与两个操作按钮', function () {
  ['{{nearby.title}}', '{{nearbyDistance}}', '{{nearby.category}}', '{{nearby.address}}'].forEach(
    function (field) {
      assert.ok(indexWxml.indexOf(field) !== -1, '结果卡片缺少 ' + field);
    }
  );
  assert.ok(indexWxml.indexOf('onNearbyReroll') !== -1, '缺少「换一家」按钮');
  assert.ok(indexWxml.indexOf('onNearbyNavigate') !== -1, '缺少「导航过去」按钮');
  assert.ok(indexWxml.indexOf('换一家') !== -1);
  assert.ok(indexWxml.indexOf('导航过去') !== -1);
  assert.ok(/nearbyBusy/.test(indexWxml), '加载状态应在界面上体现');
});
