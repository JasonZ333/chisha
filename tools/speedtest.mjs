// 测速：对比 GCS 官方源与 flutter-io.cn 国内镜像
const targets = [
  ['GCS 官方', 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.47.7-stable.zip'],
  ['flutter-io.cn 镜像', 'https://storage.flutter-io.cn/flutter_infra_release/releases/stable/windows/flutter_windows_3.47.7-stable.zip'],
];

for (const [name, url] of targets) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { headers: { Range: 'bytes=0-30000000' }, signal: ctrl.signal });
    let bytes = 0;
    const t0 = Date.now();
    for await (const chunk of res.body) {
      bytes += chunk.length;
      if (Date.now() - t0 > 10000) break;
    }
    clearTimeout(t);
    const secs = (Date.now() - t0) / 1000;
    console.log(`${name.padEnd(20)} HTTP ${res.status}  ${(bytes / 1024 / 1024).toFixed(1)} MB in ${secs.toFixed(1)}s  =>  ${(bytes / 1024 / 1024 / secs).toFixed(2)} MB/s`);
  } catch (e) {
    console.log(`${name.padEnd(20)} ERR ${e.message}`);
  }
}
