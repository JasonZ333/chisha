/**
 * 附近美食（《增加功能.docx》任务二）。
 *
 * 产品行为：点「附近美食随机」→ 获取用户位置 → 用腾讯位置服务做周边搜索
 * → 从结果里随机挑一家 → 展示店名/距离/地址，可点击导航。
 *
 * 本模块只放**纯逻辑**（可被 Node 直接跑测试）：
 *   - 组装腾讯位置服务 WebService 的请求地址
 *   - 解析它的返回结构、把错误码翻成人话
 *   - 从 POI 列表里随机挑一家、把距离格式化
 * 真正调用 wx.getLocation / wx.request 的地方在页面里。
 *
 * 配置说明：
 *   key —— 腾讯位置服务的 key。**留空表示尚未配置**，此时
 *           isConfigured() 返回 false，页面会提示"暂不可用"而不是发请求。
 *           申请地址：https://lbs.qq.com/  （控制台 → 应用管理 → 创建应用 → 添加 key）
 *           还要在微信公众平台把 https://apis.map.qq.com 加进 request 合法域名。
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
  // 搜索半径（米）
  radius: 3000,
  // 搜索关键词
  keyword: '美食',
  // 每页条数（腾讯位置服务上限 20）
  pageSize: 20,
  // 搜索接口
  endpoint: 'https://apis.map.qq.com/ws/place/v1/search',
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
 * 解析腾讯位置服务的返回。
 * @returns {{ok:boolean, places:Array, error:string}}
 */
function parsePlaces(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, places: [], error: '返回内容不是合法 JSON' };
  }
  if (body.status !== 0) {
    var text = STATUS_TEXT[body.status] || body.message || '未知错误';
    // 额度类错误码：腾讯在不同情况下会用 120/121 表示「每日」或「每秒」超限，
    // 直接补上它的原文，避免我们猜错（实测 121 的原文是「每日调用量已达到上限」）
    if ((body.status === 120 || body.status === 121) && body.message) {
      text += '（' + body.message + '）';
    }
    return { ok: false, places: [], error: '位置服务返回 ' + body.status + '：' + text };
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

/** 获取定位失败时，根据错误信息给用户一句人话 */
function locationErrorMessage(err) {
  var msg = (err && (err.errMsg || err.message)) || '';
  if (msg.indexOf('auth deny') !== -1 || msg.indexOf('authorize') !== -1) {
    return '需要位置权限才能推荐附近美食';
  }
  if (msg.indexOf('timeout') !== -1) {
    return '定位超时，请走到窗边或稍后再试';
  }
  if (msg.indexOf('system permission denied') !== -1) {
    return '系统未授权微信使用定位，请在手机设置里打开';
  }
  return '获取位置失败，请稍后再试';
}

module.exports = {
  CONFIG: CONFIG,
  STATUS_TEXT: STATUS_TEXT,
  isConfigured: isConfigured,
  buildSearchUrl: buildSearchUrl,
  parsePlaces: parsePlaces,
  pickPlace: pickPlace,
  formatDistance: formatDistance,
  locationErrorMessage: locationErrorMessage,
};
