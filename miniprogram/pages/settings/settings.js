var credits = require('../../data/credits.js');
var dishUtil = require('../../utils/dishes.js');

/** 把署名里的 markdown 链接拆成「标签 + 地址」，小程序里不能渲染 markdown */
function splitSource(raw) {
  var m = /^\[([^\]]+)\]\(([^)]+)\)/.exec(raw || '');
  if (m) return { label: m[1], url: m[2] };
  return { label: raw || '—', url: '' };
}

Page({
  data: {
    version: 'v1.0.0',
    dishCount: 0,
    tierCount: 0,
    creditTotal: 0,
    userCount: 0,
    commonsCount: 0,
    credits: [],
    // '' | 'about' | 'credits'
    dialog: '',
  },

  onLoad: function () {
    var userCount = 0;
    var list = credits.map(function (c) {
      if (c.kind === 'user') userCount++;
      var s = splitSource(c.source);
      return {
        dish: c.dish,
        file: c.file,
        author: c.author,
        license: c.license,
        sourceLabel: s.label,
        sourceUrl: s.url,
      };
    });

    this.setData({
      dishCount: dishUtil.dishes.length,
      tierCount: dishUtil.tiers.length,
      creditTotal: list.length,
      userCount: userCount,
      commonsCount: list.length - userCount,
      credits: list,
    });

    // 与首页一致：显式打开转发 / 朋友圈分享，否则本页的菜单项会被置灰
    if (wx.showShareMenu) {
      wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline'],
      });
    }
  },

  /** 转发给朋友：设置页不是主入口，引导对方回首页 */
  onShareAppMessage: function () {
    return {
      title: '今天吃什么？别纠结了，交给命运',
      path: '/pages/index/index',
      imageUrl: '/images/share_cover.png',
    };
  },

  /** 分享到朋友圈 */
  onShareTimeline: function () {
    return {
      title: '今天吃什么？别纠结了，交给命运',
      query: '',
      imageUrl: '/images/share_cover.png',
    };
  },

  onShowAbout: function () {
    this.setData({ dialog: 'about' });
  },

  onShowCredits: function () {
    this.setData({ dialog: 'credits' });
  },

  onCloseDialog: function () {
    this.setData({ dialog: '' });
  },
});
