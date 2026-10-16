/**
 * 随机抽取逻辑（小程序版）。
 *
 * 与桌面版 RandomPicker 的行为保持一致：等概率随机，不重复加权。
 * 随机源可注入，便于写确定性的单元测试。
 */

var dishUtil = require('./dishes.js');

function defaultRandom() {
  return Math.random();
}

/**
 * 从数组里等概率随机取一个。
 * @param {Array} list 候选列表，为空时返回 null
 * @param {Function} [randomFn] 随机源，默认 Math.random
 */
function pickOne(list, randomFn) {
  if (!list || list.length === 0) return null;
  var rnd = randomFn || defaultRandom;
  var index = Math.floor(rnd() * list.length);
  // 防止 randomFn 返回 1 时越界
  if (index >= list.length) index = list.length - 1;
  if (index < 0) index = 0;
  return list[index];
}

/** 所有价位随机：从全部可见菜品里随机取一道 */
function pickAnyDish(randomFn) {
  return pickOne(dishUtil.visibleDishes(), randomFn);
}

/** 分价位随机：从某个档位里随机取一道 */
function pickDishInTier(level, randomFn) {
  return pickOne(dishUtil.dishesInTier(level), randomFn);
}

/**
 * 附近美食随机（《增加功能.docx》第 4 条）。
 *
 * 需求原文：「首页增加一个附近美食随机按钮，功能与所有价位随机、分价位随机一致」——
 * 也就是交互与另外两个按钮相同：点一下随机出一道菜。
 *
 * ⚠️ 当前没有位置数据，菜品数据里也没有「附近店铺」的概念，
 * 所以这里暂时等价于「所有价位随机」。将来接入定位与附近店铺数据后，
 * **只需要改这个函数里的候选列表**，页面代码不用动。
 */
function pickNearbyDish(randomFn) {
  return pickOne(dishUtil.visibleDishes(), randomFn);
}

module.exports = {
  pickOne: pickOne,
  pickAnyDish: pickAnyDish,
  pickDishInTier: pickDishInTier,
  pickNearbyDish: pickNearbyDish,
};
