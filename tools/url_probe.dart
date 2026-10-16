// 复现应用里拼出的抖音搜索 URL
void main() {
  const name = '宫保鸡丁';
  final keyword = '$name 吃播';

  final encoded = Uri.encodeComponent(keyword);
  final urlString = 'https://www.douyin.com/search/$encoded';
  final parsed = Uri.parse(urlString);

  print('keyword        : $keyword');
  print('encodeComponent: $encoded');
  print('urlString      : $urlString');
  print('parsed         : $parsed');
  print('parsed.toString: ${parsed.toString()}');
  print('scheme/host    : ${parsed.scheme} / ${parsed.host}');
  print('path           : ${parsed.path}');
  print('pathSegments   : ${parsed.pathSegments}');

  // 另一种写法：用 Uri.https + 手写路径
  final alt = Uri(
    scheme: 'https',
    host: 'www.douyin.com',
    path: '/search/$name 吃播',
  );
  print('');
  print('alt            : $alt');
  print('alt encoded    : ${alt.toString()}');
}
