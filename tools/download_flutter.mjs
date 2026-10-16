// 从国内镜像下载 Flutter SDK stable (windows-x64)
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const MIRROR = 'https://storage.flutter-io.cn/flutter_infra_release/releases';
// 下载到系统临时目录，脚本不依赖任何项目绝对路径
const outDir = path.join(os.tmpdir(), 'flutter-download');
const outFile = path.join(outDir, 'flutter.zip');

await fsp.mkdir(outDir, { recursive: true });

console.log('[1/3] 获取 release 清单（镜像）...');
const meta = await (await fetch(`${MIRROR}/releases_windows.json`)).json();
const stableHash = meta.current_release.stable;
const rel = meta.releases.find((r) => r.hash === stableHash && r.archive.startsWith('stable'));
if (!rel) throw new Error('未找到 stable windows 版本');
const url = `${MIRROR}/${rel.archive}`;
console.log(`[2/3] 版本 ${rel.version} / dart ${rel.dart_sdk_version}`);
console.log(`      ${url}`);

const res = await fetch(url);
if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);

let done = 0;
const total = Number(res.headers.get('content-length')) || 0;
const t0 = Date.now();
let lastLog = 0;
const src = Readable.fromWeb(res.body);
src.on('data', (c) => {
  done += c.length;
  const now = Date.now();
  if (now - lastLog > 5000) {
    lastLog = now;
    const secs = (now - t0) / 1000;
    console.log(`[3/3] ${(done / 1048576).toFixed(0)}/${(total / 1048576).toFixed(0)} MB  ${((done / total) * 100).toFixed(1)}%  ${(done / 1048576 / secs).toFixed(2)} MB/s`);
  }
});

await pipeline(src, fs.createWriteStream(outFile));
const st = await fsp.stat(outFile);
const secs = (Date.now() - t0) / 1000;
console.log(`DONE -> ${outFile}  ${(st.size / 1048576).toFixed(1)} MB in ${secs.toFixed(0)}s`);
console.log(JSON.stringify({ version: rel.version, dart: rel.dart_sdk_version, file: outFile, size: st.size }));
