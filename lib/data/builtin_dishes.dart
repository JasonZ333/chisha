import '../models/dish.dart';

/// ⚠️ 已废弃（2026-10）：桌面端停止维护，菜品**唯一数据源**已迁到小程序侧
/// `miniprogram/data/dishes.js`（统一由 `tools/dish_source.py` 读取）。
/// 本文件仅为 Flutter 代码仍能编译而保留，**不要再往这里加菜或改价格**，
/// 否则会和小程序端的数据不一致。
///
/// 内置示例菜品数据：10 个价格档位。
/// 10 元档与 20 元档各 10 道，其余档位各 5 道，合计 64 道。
///
/// 价格规则（见 price_tiers.dart）：
///   10 元档 ≤10 ｜ 20 元档 11~20 ｜ 30 元档 21~30 ｜ …… ｜ 100 元档 91~100
///
/// 分类只有两种：「主食」或「菜品」（见 PRD 第 266 行）。
///
/// 图片规则：图片文件名即 `imageFile`。按这些文件名放进「图片文件夹」即可替换
/// 随包图库图；详情见 docs/图片来源.md。
const List<Dish> kBuiltinDishes = <Dish>[
  // ── 10 元档（10 元及以下）────────────────────────────────
  Dish(id: 1, name: '茶叶蛋', price: 3, category: '菜品', imageFile: 'dish_01_chayedan.png'),
  Dish(id: 2, name: '豆浆油条', price: 6, category: '主食', imageFile: 'dish_02_doujiangyoutiao.png'),
  Dish(id: 3, name: '鲜肉包子', price: 5, category: '主食', imageFile: 'dish_03_xianroubaozi.png'),
  Dish(id: 4, name: '阳春面', price: 8, category: '主食', imageFile: 'dish_04_yangchunmian.png'),
  Dish(id: 5, name: '蛋炒饭', price: 10, category: '主食', imageFile: 'dish_05_danchaofan.png'),
  Dish(id: 51, name: '素菜包子', price: 4, category: '主食', imageFile: 'dish_51_sucaibaozi.png'),
  Dish(id: 52, name: '白粥配咸菜', price: 4, category: '主食', imageFile: 'dish_52_baizhouxiancai.png'),
  Dish(id: 53, name: '葱油饼', price: 6, category: '主食', imageFile: 'dish_53_congyoubing.png'),
  Dish(id: 54, name: '华莱士9.9套餐', price: 9.9, category: '主食', imageFile: 'dish_54_hualaishi.png'),
  Dish(id: 55, name: '三个馕', price: 10, category: '主食', imageFile: 'dish_55_sangenang.png'),
  Dish(id: 56, name: '韭菜盒子', price: 9, category: '主食', imageFile: 'dish_56_jiucaizi.png'),
  Dish(id: 57, name: '卤鸡爪', price: 10, category: '菜品', imageFile: 'dish_57_lujizhua.png'),

  // ── 20 元档（11~20 元）──────────────────────────────────
  Dish(id: 6, name: '重庆小面', price: 14, category: '主食', imageFile: 'dish_06_chongqingxiaomian.png'),
  Dish(id: 7, name: '酸辣粉', price: 12, category: '主食', imageFile: 'dish_07_suanlafen.png'),
  Dish(id: 8, name: '煎饼果子', price: 11, category: '主食', imageFile: 'dish_08_jianbingguozi.png'),
  Dish(id: 9, name: '小笼包', price: 18, category: '主食', imageFile: 'dish_09_xiaolongbao.png'),
  Dish(id: 10, name: '兰州拉面', price: 16, category: '主食', imageFile: 'dish_10_lanzhoulamian.png'),
  Dish(id: 58, name: '鸡蛋灌饼', price: 11, category: '主食', imageFile: 'dish_58_jidanguanbing.png'),
  Dish(id: 59, name: '叉烧包', price: 12, category: '主食', imageFile: 'dish_59_chashaobao.png'),
  Dish(id: 60, name: '三鲜馄饨', price: 15, category: '主食', imageFile: 'dish_60_sanxianhuntun.png'),
  Dish(id: 61, name: '担担面', price: 16, category: '主食', imageFile: 'dish_61_dandanmian.png'),
  Dish(id: 62, name: '螺蛳粉', price: 17, category: '主食', imageFile: 'dish_62_luosifen.png'),
  Dish(id: 63, name: '牛肉粉', price: 19, category: '主食', imageFile: 'dish_63_niuroufen.png'),
  Dish(id: 64, name: '凉拌牛肚', price: 20, category: '菜品', imageFile: 'dish_64_liangbanniudu.png'),

  // ── 30 元档（21~30 元）──────────────────────────────────
  Dish(id: 11, name: '番茄鸡蛋盖饭', price: 22, category: '主食', imageFile: 'dish_11_fanqiejidan.png'),
  Dish(id: 12, name: '青椒肉丝盖饭', price: 25, category: '主食', imageFile: 'dish_12_qingjiaorousi.png'),
  Dish(id: 13, name: '黄焖鸡米饭', price: 28, category: '主食', imageFile: 'dish_13_huangmenjimifan.png'),
  Dish(id: 14, name: '麻辣烫', price: 26, category: '主食', imageFile: 'dish_14_malatang.png'),
  Dish(id: 15, name: '沙县拌面扁肉', price: 21, category: '主食', imageFile: 'dish_15_shaxianbanmian.png'),

  // ── 40 元档（31~40 元）──────────────────────────────────
  Dish(id: 16, name: '红烧牛肉面', price: 32, category: '主食', imageFile: 'dish_16_hongshaoniuroumian.png'),
  Dish(id: 17, name: '回锅肉盖饭', price: 35, category: '主食', imageFile: 'dish_17_huiguorou.png'),
  Dish(id: 18, name: '隆江猪脚饭', price: 38, category: '主食', imageFile: 'dish_18_zhujiaofan.png'),
  Dish(id: 19, name: '咖喱鸡排饭', price: 34, category: '主食', imageFile: 'dish_19_galijipai.png'),
  Dish(id: 20, name: '酸菜鱼米线', price: 40, category: '主食', imageFile: 'dish_20_suancaiyumixian.png'),

  // ── 50 元档（41~50 元）──────────────────────────────────
  Dish(id: 21, name: '宫保鸡丁', price: 42, category: '菜品', imageFile: 'dish_21_gongbaojiding.png'),
  Dish(id: 22, name: '鱼香肉丝', price: 45, category: '菜品', imageFile: 'dish_22_yuxiangrousi.png'),
  Dish(id: 23, name: '干锅花菜', price: 44, category: '菜品', imageFile: 'dish_23_ganguohuacai.png'),
  Dish(id: 24, name: '地三鲜', price: 43, category: '菜品', imageFile: 'dish_24_disanxian.png'),
  Dish(id: 25, name: '农家小炒肉', price: 48, category: '菜品', imageFile: 'dish_25_nongjiaxiaochaorou.png'),

  // ── 60 元档（51~60 元）──────────────────────────────────
  Dish(id: 26, name: '水煮肉片', price: 52, category: '菜品', imageFile: 'dish_26_shuizhouroupian.png'),
  Dish(id: 27, name: '酸菜鱼', price: 58, category: '菜品', imageFile: 'dish_27_suancaiyu.png'),
  Dish(id: 28, name: '番茄牛腩', price: 55, category: '菜品', imageFile: 'dish_28_fanqieniunan.png'),
  Dish(id: 29, name: '糖醋里脊', price: 56, category: '菜品', imageFile: 'dish_29_tangculiji.png'),
  Dish(id: 30, name: '铁板牛柳', price: 60, category: '菜品', imageFile: 'dish_30_tiebanniuliu.png'),

  // ── 70 元档（61~70 元）──────────────────────────────────
  Dish(id: 31, name: '麻辣小龙虾', price: 65, category: '菜品', imageFile: 'dish_31_malaxiaolongxia.png'),
  Dish(id: 32, name: '香辣蟹', price: 68, category: '菜品', imageFile: 'dish_32_xianglaxie.png'),
  Dish(id: 33, name: '重庆烤鱼', price: 70, category: '菜品', imageFile: 'dish_33_chongqingkaoyu.png'),
  Dish(id: 34, name: '羊肉串拼盘', price: 62, category: '菜品', imageFile: 'dish_34_yangrouchuan.png'),
  Dish(id: 35, name: '麻辣香锅', price: 66, category: '菜品', imageFile: 'dish_35_malaxiangguo.png'),

  // ── 80 元档（71~80 元）──────────────────────────────────
  Dish(id: 36, name: '炭烤羊排', price: 78, category: '菜品', imageFile: 'dish_36_tankaoyangpai.png'),
  Dish(id: 37, name: '干锅牛蛙', price: 75, category: '菜品', imageFile: 'dish_37_ganguoniowa.png'),
  Dish(id: 38, name: '椒盐皮皮虾', price: 76, category: '菜品', imageFile: 'dish_38_jiaoyanpipixia.png'),
  Dish(id: 39, name: '黑椒牛柳粒', price: 72, category: '菜品', imageFile: 'dish_39_heijiaoniuliu.png'),
  Dish(id: 40, name: '酸汤肥牛', price: 74, category: '菜品', imageFile: 'dish_40_suantangfeiniu.png'),

  // ── 90 元档（81~90 元）──────────────────────────────────
  Dish(id: 41, name: '黑椒牛排', price: 86, category: '菜品', imageFile: 'dish_41_heijiaoniupai.png'),
  Dish(id: 42, name: '三文鱼刺身', price: 90, category: '菜品', imageFile: 'dish_42_sanwenyucishen.png'),
  Dish(id: 43, name: '法式羊排', price: 88, category: '菜品', imageFile: 'dish_43_fashiyangpai.png'),
  Dish(id: 44, name: '海鲜大咖', price: 85, category: '菜品', imageFile: 'dish_44_haixiandaka.png'),
  Dish(id: 45, name: '龙虾意面', price: 82, category: '主食', imageFile: 'dish_45_longxiayimian.png'),

  // ── 100 元档（91~100 元）────────────────────────────────
  Dish(id: 46, name: '战斧牛排', price: 98, category: '菜品', imageFile: 'dish_46_zhanfuniupai.png'),
  Dish(id: 47, name: '帝王蟹', price: 100, category: '菜品', imageFile: 'dish_47_diwangxie.png'),
  Dish(id: 48, name: '波士顿龙虾', price: 96, category: '菜品', imageFile: 'dish_48_boshidunlongxia.png'),
  Dish(id: 49, name: '和牛寿喜锅', price: 95, category: '菜品', imageFile: 'dish_49_heniushouxiguo.png'),
  Dish(id: 50, name: '佛跳墙', price: 99, category: '菜品', imageFile: 'dish_50_fotiaoqiang.png'),
];
