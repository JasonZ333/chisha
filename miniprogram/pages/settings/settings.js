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
