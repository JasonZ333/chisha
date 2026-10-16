var randomUtil = require('../../utils/random.js');
var dishUtil = require('../../utils/dishes.js');
var takeout = require('../../utils/takeout.js');
var nearby = require('../../utils/nearby.js');

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
    // 附近美食（任务二）：定位 + 腾讯位置服务周边搜索
    nearbyBusy: false,
    nearbyStatus: '',
    nearby: null,
    nearbyDistance: '',
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

  /**
   * 附近美食随机（《增加功能.docx》任务二）。
   *
   * 流程：获取用户位置（wx.getLocation，gcj02）→ 用腾讯位置服务做周边搜索
   * → 从结果里随机挑一家 → 卡片展示店名/距离/地址，可点击导航。
   */
  onRandomNearby: function () {
    if (this.data.nearbyBusy) return;
    var that = this;

    // 还没配置位置服务的 key：给个明确交代，不发请求
    if (!nearby.isConfigured()) {
      wx.showModal({
        title: '附近美食暂不可用',
        content: '还没有配置位置服务的 key，暂时无法推荐附近美食。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }

    this.setData({
      nearbyBusy: true,
      nearbyStatus: '正在获取位置…',
      nearby: null,
      nearbyDistance: '',
    });

    wx.getLocation({
      type: 'gcj02',
      success: function (loc) {
        that.setData({ nearbyStatus: '正在搜索附近美食…' });
        wx.request({
          url: nearby.buildSearchUrl(loc.latitude, loc.longitude),
          method: 'GET',
          success: function (res) {
            var parsed = nearby.parsePlaces(res.data);
            if (!parsed.ok) {
              that.setData({ nearbyBusy: false, nearbyStatus: '' });
              wx.showToast({ title: parsed.error, icon: 'none', duration: 3000 });
              return;
            }
            that.showNearby(nearby.pickPlace(parsed.places));
          },
          fail: function () {
            that.setData({ nearbyBusy: false, nearbyStatus: '' });
            wx.showToast({
              title: '搜索附近美食失败，请检查网络',
              icon: 'none',
              duration: 3000,
            });
          },
        });
      },
      fail: function (err) {
        that.setData({ nearbyBusy: false, nearbyStatus: '' });
        wx.showModal({
          title: '无法获取位置',
          content: nearby.locationErrorMessage(err),
          confirmText: '去设置',
          cancelText: '算了',
          success: function (m) {
            if (m.confirm) wx.openSetting({});
          },
        });
      },
    });
  },

  /** 展示随机挑中的那家店 */
  showNearby: function (place) {
    if (!place) {
      this.setData({ nearbyBusy: false, nearbyStatus: '' });
      wx.showToast({ title: '附近没有搜到餐饮店铺', icon: 'none' });
      return;
    }
    this.setData({
      nearbyBusy: false,
      nearbyStatus: '',
      nearby: place,
      nearbyDistance: nearby.formatDistance(place.distance),
    });
  },

  /** 附近结果：换一家（重新定位并再随机挑一次） */
  onNearbyReroll: function () {
    this.onRandomNearby();
  },

  /** 打开地图导航到这家店 */
  onNearbyNavigate: function () {
    var p = this.data.nearby;
    if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
    wx.openLocation({
      latitude: p.lat,
      longitude: p.lng,
      name: p.title,
      address: p.address,
      scale: 16,
    });
  },

  /** 关掉附近结果卡片 */
  onNearbyClose: function () {
    this.setData({ nearby: null, nearbyDistance: '' });
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
