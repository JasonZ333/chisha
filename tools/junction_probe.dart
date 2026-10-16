// 验证：Windows 目录联接（junction）能否被 Dart 认定为"已存在的 Link"
import 'dart:io';

void main(List<String> args) {
  final linkPath = args[0];
  final link = Link(linkPath);

  print('路径        : $linkPath');
  print('typeSync(followLinks: false) : ${FileSystemEntity.typeSync(linkPath, followLinks: false)}');
  print('typeSync(followLinks: true)  : ${FileSystemEntity.typeSync(linkPath, followLinks: true)}');
  print('link.existsSync()            : ${link.existsSync()}');
  print('link.targetSync()            : ${_safe(() => link.targetSync())}');
  print('Directory.existsSync()       : ${Directory(linkPath).existsSync()}');
  print('');
  print('结论：Flutter 会 ${link.existsSync() ? "跳过创建（可用！）" : "仍然尝试创建（不可用）"}');
}

String _safe(String Function() f) {
  try {
    return f();
  } catch (e) {
    return '<抛异常: $e>';
  }
}
