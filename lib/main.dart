import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'pages/home_page.dart';
import 'services/dish_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 首次启动时准备好数据目录与 dishes.json；
  // 即使这里失败也不阻塞界面，仓库内部会回退到内置数据。
  try {
    await DishRepository.instance.ensureInitialized();
  } catch (e) {
    debugPrint('初始化数据目录失败：$e');
  }

  runApp(const ChishaApp());
}

class ChishaApp extends StatelessWidget {
  const ChishaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '吃啥',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE8590C),
          brightness: Brightness.light,
        ),
        visualDensity: VisualDensity.standard,
      ),
      locale: const Locale('zh', 'CN'),
      supportedLocales: const [
        Locale('zh', 'CN'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const HomePage(),
    );
  }
}
