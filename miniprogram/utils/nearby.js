/**
 * 附近美食（《增加功能.docx》任务二 + 后续调整）。
 *
 * 产品行为：点「附近美食随机」→ 按**网络 IP** 判断城市/区
 * → 用腾讯位置服务做周边搜索 → 从结果里随机挑一家
 * → 展示店名/距离/地址，可点击导航。用户也可以手动改地点。
 *
 * 为什么用 IP 定位，而不是 wx.getLocation：
 *   wx.getLocation 属于微信「地理位置接口」，2022 年起要按服务类目申请开通，
 *   个人主体 + 非定位强相关类目基本批不下来（会提示「类目未符合开通条件」）。
 *   而腾讯位置服务的 IP 定位只是普通 WebServiceAPI 请求，**不需要任何微信权限**，
 *   个人主体立即能用。
 *   代价：精度只到「区」级（不是你家楼下），所以搜索半径放大到 5 公里；
 *   另外提供「改地点」，用关键词提示让用户自己精确指定。
 *
 * 本模块只放**纯逻辑**（可被 Node 直接跑测试）：
 *   - 组装 IP 定位 / 关键词提示 / 周边搜索的请求地址
 *   - 解析它们的返回结构、把错误码翻成人话
 *   - 从 POI 列表里随机挑一家、把距离格式化
 * 真正调用 wx.request 的地方在页面里。
 */

/**
 * 腾讯位置服务 key 放在单独文件 utils/nearby_key.js 里，**该文件不入库**
 * （见 .gitignore），避免公开仓库泄露 key 后被别人盗用每日额度。
 * 换 key 时新建/修改 utils/nearby_key.js，内容形如：module.exports = '你的key';
 * 读不到就直接当作未配置处理，页面会给出提示而不是盲目发请求。
 */
function loadKey() {
  try {
    var raw = require('./nearby_key.js');
    return typeof raw === 'string' ? raw.replace(/\s+/g, '') : '';
  } catch (e) {
    return '';
  }
}

var CONFIG = {
  // 腾讯位置服务 key（来自 utils/nearby_key.js；未提供则视为未配置）
  key: loadKey(),
  // 搜索半径（米）：IP 定位只到区级，半径放大到 5 公里
  radius: 5000,
  // 搜索关键词
  keyword: '美食',
  // 每页条数（腾讯位置服务上限 20）
  pageSize: 20,
  // 周边搜索
  endpoint: 'https://apis.map.qq.com/ws/place/v1/search',
  // IP 定位（按请求方 IP 判断城市/区，不需要微信位置权限）
  ipEndpoint: 'https://apis.map.qq.com/ws/location/v1/ip',
  // 关键词提示（把用户输入的地点名转成坐标）
  suggestionEndpoint: 'https://apis.map.qq.com/ws/place/v1/suggestion',
};

/** 腾讯位置服务的状态码 → 中文提示 */
var STATUS_TEXT = {
  0: '成功',
  110: '请求来源未被授权（检查 key 的域名白名单设置）',
  111: '签名校验失败',
  112: 'IP 未被授权',
  120: '该 key 每日调用量已达上限',
  121: '该 key 调用量已达上限（每日额度或每秒并发超限）',
  190: '无效的 key',
  199: '该 key 未开启 WebService API 功能',
  301: 'key 格式错误',
  311: 'key 验证失败',
};

function isConfigured() {
  return !!CONFIG.key;
}

/** 把非 0 状态码翻成一句人话；额度类直接用腾讯原文（实测 121 的原文是「每日调用量已达到上限」） */
function errorText(status, message) {
  if ((status === 120 || status === 121) && message) {
    return '位置服务额度已用完（' + status + '：' + message + '）';
  }
  var text = STATUS_TEXT[status] || message || '未知错误';
  return '位置服务返回 ' + status + '：' + text;
}

// ── IP 定位 ────────────────────────────────────────────

/** IP 定位请求地址（不传 ip = 按请求方 IP 判断） */
function buildIpUrl() {
  return CONFIG.ipEndpoint + '?key=' + encodeURIComponent(CONFIG.key);
}

/**
 * 解析 IP 定位返回。
 * @returns {{ok:boolean, area:string, city:string, district:string, lat:number, lng:number, error:string}}
 */
function parseIpLocation(body) {
  var empty = { ok: false, area: '', city: '', district: '', lat: 0, lng: 0, error: '' };
  if (!body || typeof body !== 'object') {
    empty.error = '返回内容不是合法 JSON';
    return empty;
  }
  if (body.status !== 0) {
    empty.error = errorText(body.status, body.message);
    return empty;
  }

  var result = body.result || {};
  var loc = result.location || {};
  var info = result.ad_info || {};
  if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
    empty.error = 'IP 定位没有返回坐标';
    return empty;
  }

  var city = info.city || '';
  var district = info.district || '';
  var parts = [];
  if (city) parts.push(city);
  // 直辖市 city 和 province 同名，district 才有区分度；city 为空时退回 province
  if (district && district !== city) parts.push(district);
  if (!parts.length && info.province) parts.push(info.province);

  return {
    ok: true,
    area: parts.join(' '),
    city: city,
    district: district,
    lat: loc.lat,
    lng: loc.lng,
    error: '',
  };
}

// ── 关键词提示（手动改地点用）──────────────────────────

/**
 * 关键词提示请求地址。
 * @param {string} keyword 用户输入的地点名
 * @param {string} [region] 城市名，用于提高命中率
 */
function buildSuggestionUrl(keyword, region) {
  var url =
    CONFIG.suggestionEndpoint +
    '?keyword=' +
    encodeURIComponent(keyword) +
    '&page_size=10&page_index=1' +
    '&key=' +
    encodeURIComponent(CONFIG.key);
  if (region) {
    url += '&region=' + encodeURIComponent(region);
  }
  return url;
}

/**
 * 解析关键词提示返回。
 * @returns {{ok:boolean, items:Array, error:string}}
 */
function parseSuggestions(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, items: [], error: '返回内容不是合法 JSON' };
  }
  if (body.status !== 0) {
    return { ok: false, items: [], error: errorText(body.status, body.message) };
  }

  var raw = body.data || [];
  var items = [];
  for (var i = 0; i < raw.length; i++) {
    var p = raw[i] || {};
    var loc = p.location || {};
    if (!p.title || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') continue;
    items.push({
      id: p.id || String(i),
      title: p.title,
      address: p.address || '',
      lat: loc.lat,
      lng: loc.lng,
    });
  }
  if (items.length === 0) {
    return { ok: false, items: [], error: '没搜到这个地点，换个说法试试' };
  }
  return { ok: true, items: items, error: '' };
}

// ── 周边搜索 ───────────────────────────────────────────

/**
 * 组装周边搜索请求地址。
 * @param {number} lat 纬度（gcj02）
 * @param {number} lng 经度（gcj02）
 * @returns {string}
 */
function buildSearchUrl(lat, lng) {
  var boundary = 'nearby(' + lat + ',' + lng + ',' + CONFIG.radius + ')';
  return (
    CONFIG.endpoint +
    '?boundary=' +
    encodeURIComponent(boundary) +
    '&keyword=' +
    encodeURIComponent(CONFIG.keyword) +
    '&page_size=' +
    CONFIG.pageSize +
    '&page_index=1' +
    '&orderby=_distance' +
    '&key=' +
    encodeURIComponent(CONFIG.key)
  );
}

/**
 * 解析周边搜索的返回。
 * @returns {{ok:boolean, places:Array, error:string}}
 */
function parsePlaces(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, places: [], error: '返回内容不是合法 JSON' };
  }
  if (body.status !== 0) {
    return { ok: false, places: [], error: errorText(body.status, body.message) };
  }

  var raw = body.data || [];
  var places = [];
  for (var i = 0; i < raw.length; i++) {
    var p = raw[i] || {};
    var loc = p.location || {};
    if (!p.title) continue;
    places.push({
      id: p.id || '',
      title: p.title,
      address: p.address || '',
      category: (p.category || '').split(':')[0] || '美食',
      lat: loc.lat,
      lng: loc.lng,
      distance: typeof p._distance === 'number' ? p._distance : null,
    });
  }
  if (places.length === 0) {
    return { ok: false, places: [], error: '附近没有搜到餐饮店铺' };
  }
  return { ok: true, places: places, error: '' };
}

/** 从 POI 列表里随机挑一家；空列表返回 null */
function pickPlace(places, randomFn) {
  if (!places || places.length === 0) return null;
  var rnd = randomFn || Math.random;
  var i = Math.floor(rnd() * places.length);
  if (i >= places.length) i = places.length - 1;
  if (i < 0) i = 0;
  return places[i];
}

/** 距离格式化：<1000 米显示「xxx 米」，否则显示「x.x 公里」 */
function formatDistance(meters) {
  if (typeof meters !== 'number' || isNaN(meters) || meters < 0) return '';
  if (meters < 1000) return Math.round(meters) + ' 米';
  return (meters / 1000).toFixed(1) + ' 公里';
}

module.exports = {
  CONFIG: CONFIG,
  STATUS_TEXT: STATUS_TEXT,
  isConfigured: isConfigured,
  errorText: errorText,
  buildIpUrl: buildIpUrl,
  parseIpLocation: parseIpLocation,
  buildSuggestionUrl: buildSuggestionUrl,
  parseSuggestions: parseSuggestions,
  buildSearchUrl: buildSearchUrl,
  parsePlaces: parsePlaces,
  pickPlace: pickPlace,
  formatDistance: formatDistance,
};
