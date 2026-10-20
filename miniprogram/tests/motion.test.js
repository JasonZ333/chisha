/**
 * 动效验收测试：随机结果卡片「抽签 → 翻牌 → 光爆」（方案 B）。
 *
 * 需求：「用户点完随机之后，弹出的美食卡片有翻转的效果，卡片背后有光散发出来。」
 *
 * 实现方式（全部纯 WXSS，不加依赖、不加包体）：
 *   - 翻转：rotateY + preserve-3d + backface-visibility（卡片做双面）
 *   - 背后的光：radial-gradient 光晕 + 两圈扩散冲击波
 *   - 节奏：抽签 300ms → 翻牌 180ms → 光环 420ms
 *
 * 这里锁定的是"动效确实存在且结构正确"，避免以后改样式时把它删掉。
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var MP = path.join(__dirname, '..');
var wxml = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.wxml'), 'utf8');
var wxss = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.wxss'), 'utf8');
var indexJs = fs.readFileSync(path.join(MP, 'pages', 'index', 'index.js'), 'utf8');

/** 取出某个 CSS 规则的内容 */
function rule(selector) {
  var at = wxss.indexOf(selector + ' {');
  if (at === -1) return '';
  return wxss.slice(at, wxss.indexOf('}', at));
}

// ── 结构：卡片必须是双面的 ──────────────────────────────
test('结果弹窗是「翻转舞台 + 双面卡片」结构', function () {
  assert.ok(wxml.indexOf('class="flip-stage') !== -1, '缺少翻转舞台 .flip-stage');
  assert.ok(wxml.indexOf('flip-inner') !== -1, '缺少翻转内层 .flip-inner');
  assert.ok(wxml.indexOf('flip-face') !== -1, '缺少卡面 .flip-face');
  assert.ok(wxml.indexOf('flip-back') !== -1, '缺少背面（抽签中）');
  assert.ok(wxml.indexOf('flip-front') !== -1, '缺少正面（结果）');

  // 背面要有"抽签中"的文案
  assert.ok(wxml.indexOf('正在抽签') !== -1, '背面缺少「正在抽签…」文案');
});

test('菜品内容挂在正面，不会被翻到背面去', function () {
  var frontAt = wxml.indexOf('flip-front');
  var backAt = wxml.indexOf('flip-back');
  assert.ok(frontAt !== -1 && backAt !== -1);

  // 菜名/价格/按钮都应在正面那一段里（正面在背面之后，取它之后到弹窗结束）
  var frontBlock = wxml.slice(frontAt);
  assert.ok(frontBlock.indexOf('{{dish.name}}') !== -1, '菜名应在正面');
  assert.ok(frontBlock.indexOf('{{dish.price}}') !== -1, '价格应在正面');
  assert.ok(frontBlock.indexOf('onReroll') !== -1, '「再随机一个」应在正面');
  assert.ok(frontBlock.indexOf('onTakeout') !== -1, '「点外卖」应在正面');
});

// ── 翻转样式 ────────────────────────────────────────────
test('翻转用 3D 变换实现（perspective + preserve-3d + backface-visibility）', function () {
  assert.ok(
    /perspective:\s*\d+rpx/.test(rule('.flip-stage')),
    '.flip-stage 应设置 perspective'
  );
  assert.ok(
    /transform-style:\s*preserve-3d/.test(rule('.flip-inner')),
    '.flip-inner 应设置 transform-style: preserve-3d'
  );
  assert.ok(
    /backface-visibility:\s*hidden/.test(rule('.flip-face')),
    '.flip-face 应设置 backface-visibility: hidden（否则会看到镜像的背面）'
  );

  // 背面在初始状态下转 180°，抽签阶段靠 .is-back 把整体转过去
  assert.ok(
    /rotateY\(180deg\)/.test(rule('.flip-back')),
    '背面应固定 rotateY(180deg)'
  );
  assert.ok(
    /\.flip-stage\.is-back\s+\.flip-inner\s*\{[^}]*rotateY\(180deg\)/.test(wxss),
    '抽签阶段（.is-back）应把卡片转到背面'
  );
  assert.ok(
    /transition:\s*transform\s+\d+ms/.test(rule('.flip-inner')),
    '翻转应有 transform 过渡（180ms 左右）'
  );
});

// ── 背后的光 ────────────────────────────────────────────
test('卡片背后有光晕（radial-gradient）', function () {
  var glow = rule('.fx-glow');
  assert.ok(glow.length > 0, '缺少 .fx-glow 光晕元素');
  assert.ok(/radial-gradient/.test(glow), '.fx-glow 应用 radial-gradient 做径向发光');
  assert.ok(/border-radius:\s*50%/.test(glow), '.fx-glow 应是圆形');
});

test('有扩散的冲击波圆环，且是两圈错开的', function () {
  var ring = rule('.fx-ring');
  assert.ok(ring.length > 0, '缺少 .fx-ring 光环');
  assert.ok(/border:.*rgba/.test(ring), '.fx-ring 应是半透明描边圆环');

  var rings = (wxml.match(/class="fx-ring"/g) || []).length;
  var ringsLate = (wxml.match(/fx-ring-late/g) || []).length;
  assert.strictEqual(rings, 1, '应有一个基础光环');
  assert.strictEqual(ringsLate, 1, '应有一个延时光环（错开扩散，更有层次）');
  assert.ok(
    /animation-delay:\s*\d+ms/.test(rule('.fx-ring-late')),
    '延时光环应设置 animation-delay'
  );
});

test('光效容器必须有实体尺寸（0×0 会导致子元素完全不渲染）', function () {
  var fx = rule('.fx');
  assert.ok(fx.length > 0, '缺少 .fx 光效容器');

  // 实测踩过的坑：把 .fx 写成 width:0; height:0，微信 webview 不会绘制它的子元素，
  // 整个光效会凭空消失（在开发者工具里表现为"光完全看不到"）。
  assert.strictEqual(
    /width:\s*0(px|rpx)?\s*[;}]/.test(fx),
    false,
    '.fx 不能是 0 宽度（子元素会不渲染）'
  );
  assert.strictEqual(
    /height:\s*0(px|rpx)?\s*[;}]/.test(fx),
    false,
    '.fx 不能是 0 高度（子元素会不渲染）'
  );

  var fillsStage = /left:\s*0/.test(fx) && /right:\s*0/.test(fx) && /bottom:\s*0/.test(fx);
  var hasSize = /width:\s*\d+rpx/.test(fx) && /height:\s*\d+rpx/.test(fx);
  assert.ok(fillsStage || hasSize, '.fx 应有明确尺寸：铺满舞台（left/right/top/bottom: 0）或指定宽高');
});

test('光效有 keyframes：光晕扩散 + 光环外扩', function () {
  assert.ok(/@keyframes\s+glow-bloom/.test(wxss), '缺少光晕动画 glow-bloom');
  assert.ok(/@keyframes\s+ring-burst/.test(wxss), '缺少光环动画 ring-burst');

  var bloom = wxss.slice(wxss.indexOf('@keyframes glow-bloom'));
  bloom = bloom.slice(0, bloom.indexOf('@keyframes', 10) === -1 ? bloom.length : bloom.indexOf('@keyframes', 10));
  assert.ok(/scale\(/.test(bloom), '光晕动画应包含缩放（扩散感）');
  assert.ok(/opacity/.test(bloom), '光晕动画应包含透明度变化');

  var burst = wxss.slice(wxss.indexOf('@keyframes ring-burst'));
  assert.ok(/scale\(/.test(burst), '光环动画应包含缩放');
});

test('光效挂在揭晓阶段（.is-front）上，切阶段就会重播', function () {
  assert.ok(
    /\.flip-stage\.is-front\s+\.fx-glow\s*\{[^}]*animation:/.test(wxss),
    '光晕动画应绑定到 .is-front，这样每次揭晓都会重播'
  );
  assert.ok(
    /\.flip-stage\.is-front\s+\.fx-ring\s*\{[^}]*animation:/.test(wxss),
    '光环动画应绑定到 .is-front'
  );
});

// ── 状态机 ──────────────────────────────────────────────
test('出结果时先「抽签」再「揭晓」（flipPhase 状态机）', function () {
  assert.ok(
    /flipPhase:\s*'front'/.test(indexJs),
    'data 里应有 flipPhase 字段'
  );
  assert.ok(
    /var ROLL_MS = \d+/.test(indexJs),
    '应有「抽签中」停留时长常量'
  );

  // showDish 里先切 back，再用定时器切 front
  var showAt = indexJs.indexOf('showDish: function');
  assert.ok(showAt !== -1);
  var showBlock = indexJs.slice(showAt, showAt + 1200);
  assert.ok(
    /flipPhase:\s*'back'/.test(showBlock),
    'showDish 应先把 flipPhase 置为 back（抽签中）'
  );
  assert.ok(
    /setTimeout\(/.test(showBlock),
    'showDish 应用定时器在抽签结束后翻牌'
  );
  assert.ok(
    /flipPhase:\s*'front'/.test(showBlock),
    '定时器里应把 flipPhase 切到 front（揭晓）'
  );
});

test('关弹窗 / 离开页面都会清掉翻牌定时器', function () {
  assert.ok(
    /clearFlipTimer:\s*function/.test(indexJs),
    '缺少 clearFlipTimer'
  );
  assert.ok(
    /clearTimeout\(this\._flipTimer\)/.test(indexJs),
    'clearFlipTimer 应真正 clearTimeout'
  );

  var closeAt = indexJs.indexOf('onCloseDish: function');
  assert.ok(closeAt !== -1);
  var closeBlock = indexJs.slice(closeAt, closeAt + 300);
  assert.ok(/clearFlipTimer\(\)/.test(closeBlock), 'onCloseDish 应清掉定时器');

  assert.ok(/onUnload:\s*function/.test(indexJs), '缺少 onUnload');
  var unloadAt = indexJs.indexOf('onUnload: function');
  assert.ok(
    /clearFlipTimer\(\)/.test(indexJs.slice(unloadAt, unloadAt + 200)),
    'onUnload 应清掉定时器'
  );
});

test('整体节奏约 2 秒（用户要求放慢，别又改快）', function () {
  var rollMatch = indexJs.match(/var ROLL_MS = (\d+)/);
  assert.ok(rollMatch, '缺少 ROLL_MS');
  var roll = Number(rollMatch[1]);

  var flipMatch = wxss.match(/\.flip-inner\s*\{[^}]*transition:\s*transform\s+(\d+)ms/);
  assert.ok(flipMatch, '缺少翻转过渡时长');

  var glowMatch = wxss.match(
    /\.flip-stage\.is-front \.fx-glow\s*\{[^}]*animation:\s*glow-bloom\s+(\d+)ms/
  );
  assert.ok(glowMatch, '缺少光晕动画时长');

  var ringMatch = wxss.match(
    /\.flip-stage\.is-front \.fx-ring\s*\{[^}]*animation:\s*ring-burst\s+(\d+)ms/
  );
  assert.ok(ringMatch, '缺少光环动画时长');

  // 抽签结束后开始光爆，所以「抽签 + 光爆」就是用户感知的总时长
  var total = roll + Number(glowMatch[1]);
  assert.ok(
    total >= 1800 && total <= 2200,
    '整体节奏应约 2 秒，当前约 ' + total + 'ms（抽签 ' + roll + ' + 光晕 ' + glowMatch[1] + '）'
  );
  assert.ok(
    Number(flipMatch[1]) >= 400,
    '翻转过渡应足够慢，当前 ' + flipMatch[1] + 'ms'
  );
  assert.ok(
    Number(ringMatch[1]) >= 600,
    '光环扩散应足够慢，当前 ' + ringMatch[1] + 'ms'
  );
});

test('「再随机一个」不提前泄露结果：靠重新挂载卡片，从背面起步', function () {
  var showAt = indexJs.indexOf('showDish: function');
  assert.ok(showAt !== -1, '找不到 showDish');
  var block = indexJs.slice(showAt, showAt + 1400);

  // 关键：翻 key + 翻回背面 + 换新菜必须在同一次 setData 里。
  // 靠"慢慢转回背面"会让新菜在旋转过程中露出；靠"先关过渡"又有时序问题
  // （实测有时候有效、有时候漏），所以改成重新挂载卡片。
  var setData = block.match(/this\.setData\(\{[\s\S]*?\n    \}\);/);
  assert.ok(setData, 'showDish 里应有 setData');
  var body = setData[0];
  assert.ok(/flipList:\s*\[/.test(body), 'setData 里应更新 flipList（触发重新挂载）');
  assert.ok(/flipPhase:\s*'back'/.test(body), 'setData 里应先翻回背面');
  assert.ok(/dish:\s*dish/.test(body), 'setData 里同时换上新菜（此时藏在背面之后）');

  // 不应再依赖"同一帧关过渡"那套（时序不可靠）—— 只查真实用法，注释里允许提到
  assert.strictEqual(
    /noFlipAnim\s*:/.test(indexJs),
    false,
    '不应再依赖 noFlipAnim：wx.nextTick 不保证在视图刷新后执行，会导致偶发泄露'
  );
  assert.strictEqual(/noFlipAnim\s*\?/.test(wxml), false, 'WXML 不应再绑 noFlipAnim');
  assert.strictEqual(/\.no-anim/.test(wxss), false, 'WXSS 不应再有 no-anim 规则');

  // WXML 用 wx:for + wx:key 提供"重新挂载"能力
  assert.ok(/wx:for="\{\{flipList\}\}"/.test(wxml), 'WXML 应用 flipList 做 wx:for');
  assert.ok(/wx:key="\*this"/.test(wxml), '需要 wx:key，key 变化才会重新挂载元素');
  assert.ok(
    /<block\s+wx:for/.test(wxml),
    '重新挂载应包在 <block wx:for> 里，避免多出一层影响布局的节点'
  );
});

test('WXML 结构配对（重新挂载用的 block 不能漏闭合）', function () {
  var tags = wxml.match(/<\/?(view|block)\b[^>]*>/g) || [];
  assert.ok(tags.length > 10, '标签数量异常：' + tags.length);

  var depth = 0;
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (/^<\//.test(tag)) {
      depth -= 1;
      assert.ok(depth >= 0, '出现多余的闭合标签：' + tag);
    } else if (!/\/>$/.test(tag)) {
      depth += 1;
    }
  }
  assert.strictEqual(depth, 0, 'view/block 标签没有配对（很可能是重新挂载的 block 漏了 </block>）');
});

test('动效只用 WXSS 实现，不引入动画库或额外资源', function () {
  assert.strictEqual(
    /lottie|f2-plugin|canvas-api/i.test(indexJs),
    false,
    '不应引入动画库（会加包体）'
  );
  assert.strictEqual(
    /\.json['"]?\s*\)/.test(wxml),
    false,
    '动效不应依赖外部动画资源文件'
  );
});
