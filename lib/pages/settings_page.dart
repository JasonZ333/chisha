import 'package:flutter/material.dart';

import '../services/dish_repository.dart';
import '../services/video_launcher.dart';

/// 设置页：第一版只放三项基础功能
/// （关于本软件 / 数据保存位置 / 恢复默认示例数据）。
///
/// 辣度、甜度、卡路里、香菜等偏好设置已确认砍掉，后续有想法再加。
class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _working = false;

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _showAbout() async {
    final theme = Theme.of(context);
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('关于本软件'),
        content: SizedBox(
          width: 360,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '吃啥',
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                '版本 1.0.0',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.outline),
              ),
              const SizedBox(height: 16),
              const Text(
                '一个只干一件事的小软件：帮你决定今天吃什么。\n\n'
                '• 所有价位随机 / 分价位随机（10 ~ 100 元档）\n'
                '• 内置 50 道示例菜品，数据保存在本机\n'
                '• 视频只做入口，点击后用系统默认浏览器打开抖音搜索页，'
                '软件本身不播放、不爬取视频',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('知道了'),
          ),
        ],
      ),
    );
  }

  Future<void> _showDataLocation() async {
    final repo = DishRepository.instance;
    final dataDir = await repo.dataDirectory();
    final imagesDir = await repo.imagesDirectory();
    final count = await repo.availableImageCount();
    final total = (await repo.loadDishes()).length;
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        final theme = Theme.of(dialogContext);
        return AlertDialog(
          title: const Text('数据保存位置'),
          content: SizedBox(
            width: 460,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('菜品数据文件：'),
                const SizedBox(height: 4),
                SelectableText(
                  '${dataDir.path}\\${DishRepository.dishesFileName}',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                Text('菜品图片文件夹（已放入 $count / $total 张）：'),
                const SizedBox(height: 4),
                SelectableText(
                  imagesDir.path,
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                Text(
                  '把 AI 生成好的图片按「文件名对照表」里的文件名放进图片文件夹，'
                  '重启软件后会自动替换统一占位图。',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline),
                ),
              ],
            ),
          ),
          actions: [
            TextButton.icon(
              onPressed: () async {
                final ok = await FolderOpener.open(dataDir.path);
                if (!ok) _toast('没能打开文件夹，可以手动复制上面的路径');
              },
              icon: const Icon(Icons.folder_open, size: 18),
              label: const Text('打开数据文件夹'),
            ),
            TextButton.icon(
              onPressed: () async {
                final ok = await FolderOpener.open(imagesDir.path);
                if (!ok) _toast('没能打开文件夹，可以手动复制上面的路径');
              },
              icon: const Icon(Icons.image_outlined, size: 18),
              label: const Text('打开图片文件夹'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _restoreDefaults() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('恢复默认示例数据？'),
        content: const Text(
          '会把菜品数据恢复成内置的 50 道示例菜品。\n'
          '已经放进图片文件夹的图片不会被删除。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('恢复'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    setState(() => _working = true);
    try {
      await DishRepository.instance.restoreDefaults();
      _toast('已恢复为内置的 50 道示例菜品');
    } catch (e) {
      _toast('恢复失败：$e');
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 12),
            children: [
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('关于本软件'),
                subtitle: const Text('版本信息与功能说明'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showAbout,
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.folder_outlined),
                title: const Text('数据保存位置'),
                subtitle: const Text('查看菜品数据文件和图片文件夹的路径'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showDataLocation,
              ),
              const Divider(height: 1),
              ListTile(
                enabled: !_working,
                leading: const Icon(Icons.restore),
                title: const Text('恢复默认示例数据'),
                subtitle: const Text('把菜品数据重置为内置的 50 道示例菜品'),
                trailing: _working
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.chevron_right),
                onTap: _working ? null : _restoreDefaults,
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                child: Text(
                  '偏好设置（辣度 / 甜度 / 卡路里 / 香菜）在第一版中不做，后续再考虑。',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
