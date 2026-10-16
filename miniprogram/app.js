/**
 * 「吃啥」微信小程序版。
 *
 * 与 Flutter 桌面版的差异（需求《增加功能.docx》第 1 条）：
 *   - 小程序版**不含跳转吃播**，所以这里没有任何视频入口
 *   - 菜品数据与档位由 tools/sync_miniprogram_data.py 从 Dart 源码生成，两端一致
 */

App({
  globalData: {
    // 最近一次随机到的菜品，供页面之间传递
    lastDish: null,
  },

  onLaunch: function () {
    // 小程序版不需要额外的本地存储初始化，先留空
  },
});
