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
    assert.ok(
      url.indexOf('nearby(39.9087%2C116.3975%2C' + nearby.CONFIG.radius + ')') !== -1,
      'boundary 参数不对：' + url
    );
    assert.strictEqual(nearby.CONFIG.radius, 5000, 'IP 定位只到区级，半径应为 5 公里');
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

// ── IP 定位（不需要微信位置权限）────────────────────────
test('buildIpUrl 组装出 IP 定位地址', function () {
  var saved = nearby.CONFIG.key;
  nearby.CONFIG.key = 'TEST-KEY-123';
  try {
    var url = nearby.buildIpUrl();
    assert.ok(
      url.indexOf('https://apis.map.qq.com/ws/location/v1/ip') === 0,
      '接口地址不对：' + url
    );
    assert.ok(url.indexOf('key=TEST-KEY-123') !== -1, '缺少 key');
    assert.strictEqual(url.indexOf('ip='), -1, '不传 ip 参数时才按请求方 IP 判断');
  } finally {
    nearby.CONFIG.key = saved;
  }
});

test('parseIpLocation 解析出城市/区与坐标', function () {
  var r = nearby.parseIpLocation({
    status: 0,
    result: {
      ip: '183.241.15.48',
      location: { lat: 40.22077, lng: 116.23128 },
      ad_info: { province: '北京市', city: '北京市', district: '昌平区', adcode: 110114 },
    },
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.area, '北京市 昌平区');
  assert.strictEqual(r.city, '北京市');
  assert.strictEqual(r.district, '昌平区');
  assert.strictEqual(r.lat, 40.22077);
  assert.strictEqual(r.lng, 116.23128);
});

test('parseIpLocation 对只有省、缺坐标、额度错误都能兜住', function () {
  var onlyProvince = nearby.parseIpLocation({
    status: 0,
    result: { location: { lat: 1, lng: 2 }, ad_info: { province: '海南省' } },
  });
  assert.strictEqual(onlyProvince.ok, true);
  assert.strictEqual(onlyProvince.area, '海南省');

  var noCoord = nearby.parseIpLocation({ status: 0, result: { ad_info: { city: '北京市' } } });
  assert.strictEqual(noCoord.ok, false);
  assert.ok(noCoord.error.indexOf('坐标') !== -1, noCoord.error);

  var err = nearby.parseIpLocation({ status: 121, message: '此key每日调用量已达到上限' });
  assert.strictEqual(err.ok, false);
  assert.ok(err.error.indexOf('调用量') !== -1, err.error);
});

// ── 改地点：关键词提示 ──────────────────────────────────
test('buildSuggestionUrl 组装出关键词提示地址', function () {
  var saved = nearby.CONFIG.key;
  nearby.CONFIG.key = 'TEST-KEY-123';
  try {
    var url = nearby.buildSuggestionUrl('三里屯', '北京市');
    assert.ok(
      url.indexOf('https://apis.map.qq.com/ws/place/v1/suggestion') === 0,
      '接口地址不对：' + url
    );
    assert.ok(url.indexOf('keyword=' + encodeURIComponent('三里屯')) !== -1, '缺少关键词');
    assert.ok(url.indexOf('region=' + encodeURIComponent('北京市')) !== -1, '缺少 region');
    assert.ok(url.indexOf('key=TEST-KEY-123') !== -1, '缺少 key');
  } finally {
    nearby.CONFIG.key = saved;
  }
});

test('parseSuggestions 解析出候选地点并跳过残缺项', function () {
  var r = nearby.parseSuggestions({
    status: 0,
    data: [
      {
        id: 'a',
        title: '三里屯太古里',
        address: '朝阳区三里屯路19号',
        location: { lat: 39.93, lng: 116.45 },
      },
      { id: 'b', title: '', address: 'x', location: { lat: 1, lng: 2 } },
      { id: 'c', title: '三里屯SOHO', location: { lat: 39.94, lng: 116.46 } },
    ],
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.items.length, 2, '空标题的条目应被跳过');
  assert.strictEqual(r.items[0].title, '三里屯太古里');
  assert.strictEqual(r.items[0].lat, 39.93);
  assert.strictEqual(r.items[1].address, '');
});

test('parseSuggestions 对空结果与错误状态都有兜底', function () {
  var empty = nearby.parseSuggestions({ status: 0, data: [] });
  assert.strictEqual(empty.ok, false);
  assert.ok(empty.error.indexOf('没搜到') !== -1, empty.error);

  var err = nearby.parseSuggestions({ status: 190, message: 'invalid key' });
  assert.strictEqual(err.ok, false);
  assert.ok(err.error.indexOf('190') !== -1, err.error);
});

// ── 页面接线 ────────────────────────────────────────────
test('不再声明 getLocation 隐私接口（改用 IP 定位，不碰设备位置）', function () {
  assert.strictEqual(
    appJson.indexOf('requiredPrivateInfos'),
    -1,
    'app.json 不应再声明 requiredPrivateInfos'
  );
  assert.strictEqual(
    appJson.indexOf('scope.userLocation'),
    -1,
    'app.json 不应再声明位置权限说明'
  );
  assert.strictEqual(
    /wx\.getLocation\s*\(/.test(indexJs),
    false,
    '页面不应再调用 wx.getLocation（个人主体拿不到该接口权限）'
  );
});

test('页面走通了「IP 定位 → 周边搜索 → 展示 → 导航」链路', function () {
  assert.ok(/nearby\.buildIpUrl\(\)/.test(indexJs), '缺少 IP 定位请求');
  assert.ok(/nearby\.parseIpLocation\(/.test(indexJs), 'IP 定位返回应交 parseIpLocation 解析');
  assert.ok(/wx\.request\(/.test(indexJs), '缺少 wx.request');
  assert.ok(/nearby\.buildSearchUrl\(/.test(indexJs), '请求地址应由 buildSearchUrl 生成');
  assert.ok(/nearby\.parsePlaces\(/.test(indexJs), '返回值应交给 parsePlaces 解析');
  assert.ok(/nearby\.pickPlace\(/.test(indexJs), '应从结果里随机挑一家');
  assert.ok(/wx\.openLocation\(/.test(indexJs), '缺少导航（wx.openLocation）');
});

test('「改地点」接入关键词提示，并复用同一套搜索', function () {
  assert.ok(/nearby\.buildSuggestionUrl\(/.test(indexJs), '缺少关键词提示请求');
  assert.ok(/nearby\.parseSuggestions\(/.test(indexJs), '提示返回应交 parseSuggestions 解析');
  assert.ok(/onChangeLocation:/.test(indexJs), '缺少打开「改地点」的处理函数');
  assert.ok(/onPickLocation:/.test(indexJs), '缺少选中候选地点的处理函数');
  assert.ok(indexWxml.indexOf('onChangeLocation') !== -1, '结果弹窗缺少「改地点」入口');
  assert.ok(indexWxml.indexOf('改地点') !== -1, '结果弹窗缺少「改地点」文案');
  assert.ok(indexWxml.indexOf('showLocationPicker') !== -1, '缺少地点选择弹窗');
  assert.ok(indexWxml.indexOf('onLocationInput') !== -1, '地点选择弹窗缺少输入框');
  assert.ok(indexWxml.indexOf('{{nearbyArea}}') !== -1, '结果弹窗应显示当前定位');
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
