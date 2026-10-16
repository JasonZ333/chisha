// 测试公共辅助：中文字体加载 + 与真实 App 一致的宿主壳。

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:chisha/services/dish_repository.dart';

/// 窗口尺寸，与 windows/runner/main.cpp 里的窗口大小保持一致
const Size kWindowSize = Size(560, 900);

/// 等待界面稳定。
///
/// 被测流程里有真实的文件读写（dishes.json），而 widget 测试跑在 fake async 里，
/// 所以先用 runAsync 让真实 I/O 有机会跑完，再让界面收敛。
Future<void> settleWithIo(WidgetTester tester, {int rounds = 10}) async {
  for (var i = 0; i < rounds; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 15)),
    );
    await tester.pump(const Duration(milliseconds: 15));
  }
  await tester.pumpAndSettle();
}

/// 把统一占位图预先解码进图片缓存。
///
/// 不做这一步的话，golden 截图里图片区域只会渲染出加载中的底色，
/// 看不出占位图到底能不能显示。
Future<void> precachePlaceholder(WidgetTester tester) async {
  await tester.runAsync(() async {
    final element = tester.element(find.byType(MaterialApp));
    await precacheImage(
      const AssetImage(DishRepository.placeholderAsset),
      element,
    );
  });
  await tester.pumpAndSettle();
}

/// 加载系统中文字体，否则测试环境里中文会渲染成方块
Future<void> loadChineseFont() async {
  const candidates = <String>[
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\msyhl.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
    r'C:\Windows\Fonts\simsun.ttc',
  ];
  for (final path in candidates) {
    final file = File(path);
    if (!file.existsSync()) continue;
    try {
      final bytes = file.readAsBytesSync();
      final loader = FontLoader('ChineseFont')
        ..addFont(
          Future<ByteData>.value(ByteData.sublistView(Uint8List.fromList(bytes))),
        );
      await loader.load();
      return;
    } catch (_) {
      // 换下一个候选字体
    }
  }
}

/// 与 main.dart 中 ChishaApp 一致的宿主
Widget hostApp(Widget home) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    locale: const Locale('zh', 'CN'),
    supportedLocales: const [Locale('zh', 'CN'), Locale('en', 'US')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    theme: ThemeData(
      useMaterial3: true,
      fontFamily: 'ChineseFont',
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFFE8590C),
        brightness: Brightness.light,
      ),
    ),
    home: home,
  );
}
