import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/price_tiers.dart';
import '../models/dish.dart';
import '../services/dish_repository.dart';
import '../services/video_launcher.dart';

/// 随机推荐结果弹窗。
///
/// [onReroll] 由调用方决定"再随机一个"的范围：
/// 首页「所有价位随机」传全量池子，首页「分价位随机」传当前档位池子。
Future<void> showDishResultDialog(
  BuildContext context, {
  required Dish dish,
  required Future<Dish?> Function() onReroll,
}) {
  return showDialog<void>(
    context: context,
    builder: (context) => _DishResultDialog(dish: dish, onReroll: onReroll),
  );
}

class _DishResultDialog extends StatefulWidget {
  const _DishResultDialog({required this.dish, required this.onReroll});

  final Dish dish;
  final Future<Dish?> Function() onReroll;

  @override
  State<_DishResultDialog> createState() => _DishResultDialogState();
}

class _DishResultDialogState extends State<_DishResultDialog> {
  late Dish _dish = widget.dish;
  bool _rolling = false;

  Future<void> _reroll() async {
    if (_rolling) return;
    setState(() => _rolling = true);
    final next = await widget.onReroll();
    if (!mounted) return;
    setState(() {
      if (next != null) _dish = next;
      _rolling = false;
    });
  }

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openVideo() async {
    final outcome = await DouyinLauncher.openSearch(_dish.videoKeyword);
    if (!mounted || outcome.ok) return;

    // 打不开浏览器时不再静默失败：把地址和真实原因都摆出来，并允许复制链接
    final url = DouyinLauncher.searchUrl(_dish.videoKeyword);
    final theme = Theme.of(context);

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('没能自动打开浏览器'),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('可以复制下面的链接，粘贴到浏览器地址栏里打开：'),
              const SizedBox(height: 8),
              SelectableText(url, style: theme.textTheme.bodySmall),
              const SizedBox(height: 16),
              Text('诊断信息：', style: theme.textTheme.labelLarge),
              const SizedBox(height: 4),
              SelectableText(
                outcome.detail.isEmpty ? '（无）' : outcome.detail,
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.outline),
              ),
            ],
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (dialogContext.mounted) {
                Navigator.of(dialogContext).pop();
              }
              _toast('链接已复制，粘贴到浏览器即可');
            },
            icon: const Icon(Icons.copy_all_outlined, size: 18),
            label: const Text('复制链接'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('关闭'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tier = tierOfPrice(_dish.price);

    return AlertDialog(
      contentPadding: const EdgeInsets.fromLTRB(0, 0, 0, 8),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── 食物图片 ────────────────────────────────
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(28)),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: _DishImage(
                      key: ValueKey(_dish.id),
                      dish: _dish,
                    ),
                  ),
                ),
              ),

              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── 菜名 ─────────────────────────────
                    Text(
                      _dish.name,
                      style: theme.textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),

                    // ── 价格 + 标签 ───────────────────────
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          _dish.priceLabel,
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (tier != null) _Tag(text: tier.label),
                        _Tag(text: _dish.category),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // ── 视频入口 ─────────────────────────
                    _VideoEntryCard(
                      dish: _dish,
                      onPressed: _openVideo,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '不在软件内播放，点击后用系统默认浏览器打开抖音搜索页',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(
            '关闭',
            style: TextStyle(color: theme.colorScheme.outline),
          ),
        ),
        FilledButton.icon(
          onPressed: _rolling ? null : _reroll,
          icon: _rolling
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.casino_outlined),
          label: const Text('再随机一个'),
        ),
      ],
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: theme.textTheme.labelMedium?.copyWith(
          color: theme.colorScheme.onSecondaryContainer,
        ),
      ),
    );
  }
}

/// 视频入口卡片：封面图（用菜品自己的食物图片）+ 标题 + 按钮
class _VideoEntryCard extends StatelessWidget {
  const _VideoEntryCard({required this.dish, required this.onPressed});

  final Dish dish;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.6),
        ),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 84,
              height: 60,
              child: _DishImage(dish: dish),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dish.videoTitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  '吃播视频入口',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton.tonalIcon(
            onPressed: onPressed,
            icon: const Icon(Icons.play_circle_outline, size: 18),
            label: const Text('看吃播'),
          ),
        ],
      ),
    );
  }
}

/// 菜品图片：有真实图片用真实图片，否则用统一占位图
class _DishImage extends StatelessWidget {
  const _DishImage({super.key, required this.dish});

  final Dish dish;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<ImageProvider>(
      future: DishRepository.instance.imageFor(dish),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const ColoredBox(color: Color(0xFFF2E9DE));
        }
        return Image(
          image: snapshot.data!,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) => const ColoredBox(
            color: Color(0xFFF2E9DE),
            child: Center(child: Icon(Icons.image_not_supported_outlined)),
          ),
        );
      },
    );
  }
}
