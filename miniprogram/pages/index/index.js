var randomUtil = require('../../utils/random.js');
var dishUtil = require('../../utils/dishes.js');
var takeout = require('../../utils/takeout.js');

Page({
  data: {
    tierLabels: [],
    tierLevels: [],
    // 与桌面端「从 N 个档位的全部菜品里挑一道」保持一致
    tierCount: 0,
    dish: null,
    tierLabel: '',
    hasDish: false,
    // 「再随机一个」沿用的档位；null = 所有价位
    rerollTier: null,
    // 点外卖：平台选择页
    showTakeout: false,
    platforms: [],
    copied: false,
  },

  onLoad: function () {
    this.setData({
      tierLabels: dishUtil.tiers.map(function (t) {
        return t.label + '（' + t.rangeLabel + '）';
      }),
      tierLevels: dishUtil.tiers.map(function (t) {
        return t.level;
      }),
      tierCount: dishUtil.tiers.length,
      platforms: takeout.listPlatforms(),
    });
  },

  /** 打开设置页（对齐 Windows 端右上角的设置入口） */
  onOpenSettings: function () {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  /** 所有价位随机 */
  onRandomAny: function () {
    this.setData({ rerollTier: null });
    this.showDish(randomUtil.pickAnyDish());
  },

  /** 附近美食随机（《增加功能.docx》第 4 条，与另外两个按钮行为一致） */
  onRandomNearby: function () {
    this.setData({ rerollTier: null });
    this.showDish(randomUtil.pickNearbyDish());
  },

  /** 按价位随机（picker 选择档位后触发） */
  onPickTier: function (e) {
    var index = Number(e.detail.value);
    var level = this.data.tierLevels[index];
    this.setData({ rerollTier: level });
    this.showDish(randomUtil.pickDishInTier(level));
    return level;
  },

  /** 再随机一个：沿用上一次的档位（没有则全价位） */
  onReroll: function () {
    if (this.data.rerollTier) {
      this.showDish(randomUtil.pickDishInTier(this.data.rerollTier));
    } else {
      this.showDish(randomUtil.pickAnyDish());
    }
  },

  showDish: function (dish) {
    if (!dish) {
      wx.showToast({ title: '这个档位暂无菜品', icon: 'none' });
      return;
    }
    var tier = dishUtil.tierOfPrice(dish.price);
    this.setData({
      dish: dish,
      hasDish: true,
      tierLabel: tier ? tier.label : '',
      showTakeout: false,
    });
  },

  // ── 点外卖（《增加功能.docx》第 3 条）──────────────────────
  // 流程：复制菜名 → 弹出平台选择页 → 点击后跳转到对应平台的微信小程序
  onTakeout: function () {
    var dish = this.data.dish;
    if (!dish) return;
    var that = this;
    wx.setClipboardData({
      data: dish.name,
      success: function () {
        that.setData({ showTakeout: true, copied: true });
      },
      fail: function () {
        that.setData({ showTakeout: true, copied: false });
      },
    });
  },

  onTakeoutCancel: function () {
    this.setData({ showTakeout: false });
  },

  onTakeoutPick: function (e) {
    var key = e.currentTarget.dataset.key;
    var platform = takeout.findPlatform(key);
    var dishName = this.data.dish ? this.data.dish.name : '';
    var action = takeout.decideAction(platform);

    this.setData({ showTakeout: false });

    if (action === 'jump') {
      var options = takeout.buildJumpOptions(platform, dishName);
      wx.navigateToMiniProgram(
        Object.assign({}, options, {
          fail: function () {
            wx.showToast({ title: '跳转失败，菜名已复制', icon: 'none' });
          },
        })
      );
      return;
    }

    if (action === 'copy') {
      // 该平台暂未配置 appId：降级为提示用户去 App 里粘贴搜索
      wx.showModal({
        title: '暂不能直接跳转',
        content:
          takeout.copyTip(dishName) + '\n\n（请在「' + platform.name + '」里粘贴搜索）',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }

    wx.showToast({ title: '平台不存在', icon: 'none' });
  },
});
