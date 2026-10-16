import 'dart:io';

import 'package:url_launcher/url_launcher.dart';

/// 打开链接的结果
class LaunchOutcome {
  const LaunchOutcome.success()
      : ok = true,
        detail = '';

  const LaunchOutcome.failure(this.detail) : ok = false;

  final bool ok;

  /// 失败原因（多种方式都失败时，逐条记录）
  final String detail;
}

/// 视频入口：不在软件内播放视频、不爬取抖音内容，
/// 只用系统默认浏览器打开抖音搜索页，由用户自己在抖音里挑吃播视频看。
class DouyinLauncher {
  DouyinLauncher._();

  /// 抖音搜索页地址：关键词为「菜名 吃播」
  static String searchUrl(String keyword) =>
      'https://www.douyin.com/search/${Uri.encodeComponent(keyword)}';

  /// 依次尝试多种打开方式，全失败时返回具体原因（不再静默失败）。
  static Future<LaunchOutcome> openSearch(String keyword) async {
    final url = searchUrl(keyword);
    final problems = <String>[];

    // 方式 1：url_launcher 插件（内部走 ShellExecuteW）
    try {
      final launched = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
      if (launched) return const LaunchOutcome.success();
      problems.add('url_launcher 返回 false');
    } catch (e) {
      problems.add('url_launcher 异常：$e');
    }

    if (Platform.isWindows) {
      // 方式 2：交给 cmd 的 start（等价于在资源管理器里双击链接）
      try {
        final r = await Process.run('cmd', <String>['/c', 'start', '', url]);
        if (r.exitCode == 0) return const LaunchOutcome.success();
        problems.add('cmd start 退出码 ${r.exitCode}');
      } catch (e) {
        problems.add('cmd start 异常：$e');
      }

      // 方式 3：交给资源管理器
      try {
        final r = await Process.run('explorer', <String>[url]);
        if (r.exitCode == 0) return const LaunchOutcome.success();
        problems.add('explorer 退出码 ${r.exitCode}');
      } catch (e) {
        problems.add('explorer 异常：$e');
      }
    }

    return LaunchOutcome.failure(problems.join('\n'));
  }
}

/// 用系统文件管理器打开一个目录（设置页「数据保存位置」用）
class FolderOpener {
  FolderOpener._();

  static Future<bool> open(String path) async {
    try {
      if (Platform.isWindows) {
        await Process.run('explorer', <String>[path]);
        return true;
      }
      if (Platform.isMacOS) {
        await Process.run('open', <String>[path]);
        return true;
      }
      await Process.run('xdg-open', <String>[path]);
      return true;
    } catch (_) {
      return false;
    }
  }
}
