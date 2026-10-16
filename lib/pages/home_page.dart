import 'package:flutter/material.dart';

import '../data/price_tiers.dart';
import '../models/dish.dart';
import '../services/dish_repository.dart';
import '../services/random_picker.dart';
import '../widgets/dish_result_dialog.dart';
import '../widgets/tier_picker_dialog.dart';
import 'settings_page.dart';

/// 首页：只有两个随机按钮（外加右上角一个设置入口）。
///
/// 需求确认稿：首页不放价格档位浏览入口，不能主动浏览某个档位的全部菜品。
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _busy = false;

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 2)),
    );
  }

  /// 所有价位随机：从全部内置菜品里随机推荐一道
  Future<void> _randomFromAll() async {
    if (_busy) return;
    setState(() => _busy = true);

    // 只在"取数据"期间转圈；结果弹窗打开后首页不再空转
    Dish? dish;
    try {
      final all = await DishRepository.instance.loadDishes();
      dish = RandomPicker.pick(all);
    } catch (e) {
      _toast('读取菜品数据失败：$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }

    if (dish == null) {
      _toast('没有可推荐的菜品');
      return;
    }
    if (!mounted) return;
    await showDishResultDialog(
      context,
      dish: dish,
      onReroll: () async {
        final pool = await DishRepository.instance.loadDishes();
        return RandomPicker.pick(pool);
      },
    );
  }

  /// 附近美食随机（《增加功能.docx》第 4 条）。
  ///
  /// 需求原文：「首页增加一个附近美食随机按钮，功能与所有价位随机、分价位随机一致」——
  /// 也就是交互与另外两个按钮相同：点一下随机推荐一道菜。
  ///
  /// ⚠️ 桌面版没有定位能力，菜品数据里也没有「附近店铺」的概念，
  /// 所以候选集合目前就是全部菜品，直接复用 [_randomFromAll]。
  /// 将来接入定位与附近店铺数据后，**只要改这里的候选来源**，界面代码不用动。
  Future<void> _randomNearby() => _randomFromAll();

  /// 分价位随机：弹出档位列表 → 选一个档位 → 直接随机推荐该档位的一道菜
  Future<void> _randomFromTier() async {
    if (_busy) return;

    final tier = await showTierPickerDialog(context);
    if (tier == null || !mounted) return;

    setState(() => _busy = true);
    Dish? dish;
    try {
      final pool = await DishRepository.instance
          .dishesInTier(tier.minPrice, tier.maxPrice);
      dish = RandomPicker.pick(pool);
    } catch (e) {
      _toast('读取菜品数据失败：$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }

    if (dish == null) {
      _toast('${tier.label}里还没有菜品');
      return;
    }
    if (!mounted) return;
    await showDishResultDialog(
      context,
      dish: dish,
      onReroll: () async {
        final again = await DishRepository.instance
            .dishesInTier(tier.minPrice, tier.maxPrice);
        return RandomPicker.pick(again);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('吃啥'),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: '设置',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (context) => const SettingsPage(),
              ),
            ),
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              theme.colorScheme.surface,
              theme.colorScheme.primaryContainer.withValues(alpha: 0.35),
            ],
          ),
        ),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.ramen_dining_outlined,
                    size: 72,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '今天吃什么？',
                    style: theme.textTheme.headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '别纠结了，交给命运',
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 40),

                  _BigButton(
                    icon: Icons.shuffle,
                    title: '所有价位随机',
                    subtitle: '从 ${kPriceTiers.length} 个档位的全部菜品里挑一道',
                    filled: true,
                    onPressed: _busy ? null : _randomFromAll,
                  ),
                  const SizedBox(height: 16),
                  _BigButton(
                    icon: Icons.tune,
                    title: '分价位随机',
                    subtitle: '先选 10 ~ 100 元档位，再随机一道',
                    filled: false,
                    onPressed: _busy ? null : _randomFromTier,
                  ),
                  const SizedBox(height: 16),
                  _BigButton(
                    icon: Icons.location_on_outlined,
                    title: '附近美食随机',
                    subtitle: '随机推荐一道（与所有价位随机一致）',
                    filled: false,
                    onPressed: _busy ? null : _randomNearby,
                  ),

                  if (_busy) ...[
                    const SizedBox(height: 28),
                    const CircularProgressIndicator(),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BigButton extends StatelessWidget {
  const _BigButton({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.filled,
    required this.onPressed,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool filled;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final child = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: Row(
        children: [
          Icon(icon, size: 30),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(subtitle, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );

    if (filled) {
      return FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        child: child,
      );
    }
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        padding: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
      child: child,
    );
  }
}
