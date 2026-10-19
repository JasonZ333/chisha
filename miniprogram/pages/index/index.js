var randomUtil = require('../../utils/random.js');
var dishUtil = require('../../utils/dishes.js');
var takeout = require('../../utils/takeout.js');
var nearby = require('../../utils/nearby.js');

/**
 * 「抽签中」停留时长（ms），之后翻牌揭晓。
 * 方案 B 的三段式节奏：抽签 300ms → 翻牌 180ms → 光环扩散 420ms（约 900ms 收尾）。
 */
var ROLL_MS = 300;

Page({
  data: {
    tierLabels: [],
    tierLevels: [],
    dish: null,
    tierLabel: '',
    hasDish: false,
    // 翻牌动效阶段：'back' = 抽签中（背面），'front' = 揭晓（正面）
    flipPhase: 'front',
    // 「再随机一个」沿用的档位；null = 所有价位
    rerollTier: null,
    // 点外卖：平台选择页
    showTakeout: false,
    platforms: [],
    copied: false,
    // 附近美食：IP 定位 + 腾讯位置服务周边搜索（不需要微信位置权限）
    nearbyBusy: false,
    nearbyStatus: '',
    nearby: null,
    nearbyDistance: '',
    // 当前用于搜索的位置（IP 定位得到，或用户手动选的地点）
    nearbyArea: '',
    nearbyLat: 0,
    nearbyLng: 0,
    // 「改地点」：输入关键词 → 腾讯位置服务关键词提示
    showLocationPicker: false,
    locationKeyword: '',
    locationSuggestions: [],
    locationBusy: false,
  },

  onLoad: function () {
    this.setData({
      tierLabels: dishUtil.tiers.map(function (t) {
        return t.label + '（' + t.rangeLabel + '）';
      }),
      tierLevels: dishUtil.tiers.map(function (t) {
        return t.level;
      }),
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
   * 附近美食随机（《增加功能.docx》任务二 + 后续调整）。
   *
   * 流程：按**网络 IP** 判断城市/区（不需要微信位置权限）
   * → 腾讯位置服务周边搜索 → 随机挑一家 → 弹窗展示，可导航。
   * 本次已经定位/选过地点时直接搜索；用户也可以「改地点」手动指定。
   */
  onRandomNearby: function () {
    if (this.data.nearbyBusy) return;

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

    // 已经知道位置（本次 IP 定位过 / 手动选过）→ 直接在同一点再搜
    if (this.data.nearbyLat && this.data.nearbyLng) {
      this.searchNearby(this.data.nearbyLat, this.data.nearbyLng);
      return;
    }

    var that = this;
    this.setData({
      nearbyBusy: true,
      nearbyStatus: '正在按网络定位…',
      nearby: null,
      nearbyDistance: '',
    });

    wx.request({
      url: nearby.buildIpUrl(),
      method: 'GET',
      success: function (res) {
        var ip = nearby.parseIpLocation(res.data);
        if (!ip.ok) {
          that.setData({ nearbyBusy: false, nearbyStatus: '' });
          wx.showModal({
            title: '附近美食暂不可用',
            content: ip.error + '\n\n你可以手动指定地点。',
            confirmText: '改地点',
            cancelText: '算了',
            success: function (m) {
              if (m.confirm) that.setData({ showLocationPicker: true });
            },
          });
          return;
        }
        that.setData({
          nearbyArea: ip.area,
          nearbyLat: ip.lat,
          nearbyLng: ip.lng,
        });
        that.searchNearby(ip.lat, ip.lng);
      },
      fail: function () {
        that.setData({ nearbyBusy: false, nearbyStatus: '' });
        wx.showToast({ title: '网络异常，定位失败', icon: 'none' });
      },
    });
  },

  /** 在指定坐标周边搜索美食，并随机挑一家 */
  searchNearby: function (lat, lng) {
    var that = this;
    this.setData({
      nearbyBusy: true,
      nearbyStatus: '正在搜索附近美食…',
      nearby: null,
      nearbyDistance: '',
    });

    wx.request({
      url: nearby.buildSearchUrl(lat, lng),
      method: 'GET',
      success: function (res) {
        var parsed = nearby.parsePlaces(res.data);
        if (!parsed.ok) {
          that.setData({ nearbyBusy: false, nearbyStatus: '' });
          wx.showToast({ title: parsed.error, icon: 'none', duration: 3500 });
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

  /** 附近结果：换一家（在当前地点再随机挑一次） */
  onNearbyReroll: function () {
    if (!this.data.nearbyLat || !this.data.nearbyLng) {
      this.onRandomNearby();
      return;
    }
    this.searchNearby(this.data.nearbyLat, this.data.nearbyLng);
  },

  /** 打开「改地点」 */
  onChangeLocation: function () {
    this.setData({
      showLocationPicker: true,
      locationKeyword: '',
      locationSuggestions: [],
    });
  },

  /** 关掉「改地点」 */
  onCloseLocationPicker: function () {
    this.setData({
      showLocationPicker: false,
      locationKeyword: '',
      locationSuggestions: [],
      locationBusy: false,
    });
  },

  /** 「改地点」输入框：边输边查关键词提示 */
  onLocationInput: function (e) {
    var keyword = (e.detail.value || '').trim();
    this.setData({ locationKeyword: keyword });

    if (!keyword) {
      this.setData({ locationSuggestions: [], locationBusy: false });
      return;
    }

    var that = this;
    // 用当前城市做 region，提高命中率
    var region = (this.data.nearbyArea || '').split(' ')[0] || '';
    this.setData({ locationBusy: true });

    wx.request({
      url: nearby.buildSuggestionUrl(keyword, region),
      method: 'GET',
      success: function (res) {
        var r = nearby.parseSuggestions(res.data);
        that.setData({
          locationBusy: false,
          locationSuggestions: r.ok ? r.items : [],
        });
      },
      fail: function () {
        that.setData({ locationBusy: false, locationSuggestions: [] });
      },
    });
  },

  /** 从提示列表里选中一个地点 → 用它搜索 */
  onPickLocation: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var item = this.data.locationSuggestions[index];
    if (!item) return;

    this.setData({
      nearbyArea: item.title,
      nearbyLat: item.lat,
      nearbyLng: item.lng,
      showLocationPicker: false,
      locationKeyword: '',
      locationSuggestions: [],
    });

    this.searchNearby(item.lat, item.lng);
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
    var that = this;

    // 每次出结果都重放「抽签 → 翻牌 → 光爆」：先切回背面，再定时翻到正面
    // （「再随机一个」时同样会重播）
    this.clearFlipTimer();
    this.setData({
      dish: dish,
      hasDish: true,
      tierLabel: tier ? tier.label : '',
      showTakeout: false,
      flipPhase: 'back',
    });

    this._flipTimer = setTimeout(function () {
      that._flipTimer = null;
      that.setData({ flipPhase: 'front' });
    }, ROLL_MS);
  },

  /** 清掉翻牌定时器（关弹窗 / 离开页面时调用，避免 setData 打在已销毁的页面上） */
  clearFlipTimer: function () {
    if (this._flipTimer) {
      clearTimeout(this._flipTimer);
      this._flipTimer = null;
    }
  },

  /** 关闭结果弹窗（点遮罩或「关闭」按钮都会走到这里） */
  onCloseDish: function () {
    this.clearFlipTimer();
    this.setData({ hasDish: false, showTakeout: false, flipPhase: 'front' });
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

  /** 页面卸载：清掉翻牌定时器 */
  onUnload: function () {
    this.clearFlipTimer();
  },
});
