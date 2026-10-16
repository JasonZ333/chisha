// 本文件由 tools/sync_miniprogram_data.py 自动生成，请勿手工编辑。
// 来源：lib/data/price_tiers.dart
// 10 元档 = 10 元及以下；20 元档 = 11~20；……；100 元档 = 91~100。
// 超过 maxVisiblePrice 的菜品完全不显示。
module.exports = {
  maxVisiblePrice: 100,
  tiers: [
    { level: 10, min: 0, max: 10, label: '10 元档', rangeLabel: '10 元及以下' },
    { level: 20, min: 11, max: 20, label: '20 元档', rangeLabel: '11 ~ 20 元' },
    { level: 30, min: 21, max: 30, label: '30 元档', rangeLabel: '21 ~ 30 元' },
    { level: 40, min: 31, max: 40, label: '40 元档', rangeLabel: '31 ~ 40 元' },
    { level: 50, min: 41, max: 50, label: '50 元档', rangeLabel: '41 ~ 50 元' },
    { level: 60, min: 51, max: 60, label: '60 元档', rangeLabel: '51 ~ 60 元' },
    { level: 70, min: 61, max: 70, label: '70 元档', rangeLabel: '61 ~ 70 元' },
    { level: 80, min: 71, max: 80, label: '80 元档', rangeLabel: '71 ~ 80 元' },
    { level: 90, min: 81, max: 90, label: '90 元档', rangeLabel: '81 ~ 90 元' },
    { level: 100, min: 91, max: 100, label: '100 元档', rangeLabel: '91 ~ 100 元' },
  ],
};
