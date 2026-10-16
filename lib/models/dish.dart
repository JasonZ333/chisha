/// 一道菜（或主食）的数据模型。
///
/// 第一版数据是只读的内置示例数据，但模型与存储结构已经按"以后可编辑"设计：
/// 所有字段都能序列化，用户数据以 JSON 形式落在本地磁盘上。
class Dish {
  const Dish({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    required this.imageFile,
  });

  /// 稳定编号（1~50），也用于图片文件名排序
  final int id;

  /// 菜名，例如「宫保鸡丁」
  final String name;

  /// 价格（元），用于归类到价格档位
  final double price;

  /// 分类：「主食」或「菜品」
  final String category;

  /// 图片文件名，例如 `dish_21_gongbaojiding.png`
  ///
  /// 用户把 AI 生成的图片按此文件名放进图片文件夹后，界面会自动替换占位图。
  final String imageFile;

  /// 价格显示文本：整数不显示小数点
  String get priceLabel {
    if (price == price.roundToDouble()) {
      return '${price.toInt()} 元';
    }
    return '${price.toStringAsFixed(1)} 元';
  }

  /// 视频入口标题
  String get videoTitle => '抖音搜索：$name 吃播';

  /// 抖音搜索关键词
  String get videoKeyword => '$name 吃播';

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'category': category,
        'imageFile': imageFile,
      };

  factory Dish.fromJson(Map<String, dynamic> json) => Dish(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String,
        price: (json['price'] as num).toDouble(),
        category: json['category'] as String? ?? '菜品',
        imageFile: json['imageFile'] as String,
      );

  Dish copyWith({
    int? id,
    String? name,
    double? price,
    String? category,
    String? imageFile,
  }) =>
      Dish(
        id: id ?? this.id,
        name: name ?? this.name,
        price: price ?? this.price,
        category: category ?? this.category,
        imageFile: imageFile ?? this.imageFile,
      );
}
