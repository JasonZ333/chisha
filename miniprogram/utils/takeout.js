/**
 * 点外卖（《增加功能.docx》第 3 条）。
 *
 * 产品行为：随机出一道菜后 → **复制菜名** → 弹出外卖平台选择页 →
 * 用户点击后**跳转到对应平台的微信小程序**。
 *
 * 本模块只放**纯逻辑**（可被 Node 直接跑测试），
 * 真正调用 wx.setClipboardData / wx.navigateToMiniProgram 的地方在页面里。
 *
 * 平台配置说明：
 *   appId —— 该平台微信小程序的 AppID。**留空表示暂不支持直接跳转**，
 *            此时点击只复制菜名并提示去 App 里粘贴搜索（降级，不会报错）。
 *   path  —— 可选，目标小程序内的页面路径。留空 = 打开该小程序首页。
 *
 * 怎么补 appId：微信里搜到该小程序 → 右上角「…」→ 复制小程序链接，
 * 链接里的 appid 参数即为所需值。
 *
 * 依据：wx.navigateToMiniProgram **不同主体的小程序可以互相跳转，不需要关联**，
 * 且自 2020-04-24 起无需在 app.json 声明跳转名单、不受数量限制。
 * 限制是必须由用户点击触发，且跳转前微信会有系统确认弹窗。
 * 另需遵守《微信小程序平台运营规范》关于「互推行为」的要求，
 * 因此这里的文案强调"帮你去点这道菜的外卖"，而不是平台之间的互推。
 */

/** 外卖平台清单（顺序即选择页里的显示顺序） */
var PLATFORMS = [
  {
    key: 'meituan',
    name: '美团',
    // 美团外卖小程序 AppID（需求方提供）
    appId: 'wx2c348cf579062e56',
    path: '',
  },
  {
    key: 'jd',
    name: '京东',
    // 京东购物小程序 AppID
    appId: 'wx91d27dbf599dff74',
    path: '',
  },
  {
    key: 'eleme',
    name: '饿了么',
    // 饿了么小程序 AppID（需求方提供）
    appId: 'wxece3a9a4c82f58c9',
    path: '',
  },
];

/**
 * 选择页要展示的平台列表。
 * @returns {Array<{key:string,name:string,canJump:boolean}>}
 */
function listPlatforms() {
  return PLATFORMS.map(function (p) {
    return { key: p.key, name: p.name, canJump: !!p.appId };
  });
}

/** 按 key 找平台；找不到返回 null */
function findPlatform(key) {
  for (var i = 0; i < PLATFORMS.length; i++) {
    if (PLATFORMS[i].key === key) return PLATFORMS[i];
  }
  return null;
}

/**
 * 点击某个平台后该做什么。
 * @returns {'jump'|'copy'|'unknown'} jump=跳转小程序；copy=只复制菜名（降级）
 */
function decideAction(platform) {
  if (!platform) return 'unknown';
  return platform.appId ? 'jump' : 'copy';
}

/**
 * 组装 wx.navigateToMiniProgram 的参数；该平台不支持跳转时返回 null。
 */
function buildJumpOptions(platform, dishName) {
  if (!platform || !platform.appId) return null;
  var options = { appId: platform.appId };
  if (platform.path) options.path = platform.path;
  options.extraData = { dishName: dishName || '' };
  return options;
}

/** 复制菜名后给用户的提示文案 */
function copyTip(dishName) {
  return '已复制「' + (dishName || '') + '」，到 App 里粘贴即可搜索';
}

/** 选择页的标题 */
function sheetTitle(dishName) {
  return '去点「' + (dishName || '') + '」的外卖';
}

module.exports = {
  PLATFORMS: PLATFORMS,
  listPlatforms: listPlatforms,
  findPlatform: findPlatform,
  decideAction: decideAction,
  buildJumpOptions: buildJumpOptions,
  copyTip: copyTip,
  sheetTitle: sheetTitle,
};
