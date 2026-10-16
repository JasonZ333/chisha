/// 平台能力开关。
///
/// 起因：《增加功能.docx》第 1 条 —— 后续要上架微信小程序，
/// **小程序版砍掉"跳转吃播"**（详见 PRD 的「小程序版（规划中）」一节）。
///
/// 为了不让这个决定散落在界面代码里，把"结果页是否显示视频入口"
/// 抽成一个显式开关：桌面版保持开启（现有行为不变），
/// 小程序版/移动端复用同一套业务代码时置为关闭。
class PlatformFeatures {
  PlatformFeatures._();

  /// 桌面版的默认值：显示视频入口
  static const bool _defaultVideoEntry = true;

  /// 结果页是否显示「看吃播」视频入口。
  ///
  /// - 桌面版：`true`（默认，现有行为不变）
  /// - 小程序版：`false`，即"砍掉跳转吃播"
  ///
  /// 编译期可关：`flutter build windows --dart-define=CHISHA_VIDEO_ENTRY=false`
  /// 测试里也可直接赋值来验证两种形态。
  static bool videoEntry = const bool.fromEnvironment(
    'CHISHA_VIDEO_ENTRY',
    defaultValue: _defaultVideoEntry,
  );

  /// 还原为编译期默认值（测试用，避免用例之间互相污染）
  static void resetVideoEntry() {
    videoEntry = const bool.fromEnvironment(
      'CHISHA_VIDEO_ENTRY',
      defaultValue: _defaultVideoEntry,
    );
  }
}
