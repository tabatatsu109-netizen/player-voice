/**
 * next CLI 起動ラッパ。
 *
 * scripts/win-readlink-fix.cjs を NODE_OPTIONS 経由で読み込ませてから next を起動する。
 * NODE_OPTIONS は子プロセスにも引き継がれるため、Next.js が内部で立ち上げる
 * 型チェック用・ページデータ収集用のワーカーにもパッチが効く。
 *
 * 使い方:  node scripts/run-next.mjs dev | build | start
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// NODE_OPTIONS はバックスラッシュをエスケープ文字として解釈するため、
// Windows でもスラッシュ区切りに直して渡す。
const patch = path.join(here, "win-readlink-fix.cjs").replace(/\\/g, "/");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const nodeOptions = [process.env.NODE_OPTIONS, `--require "${patch}"`]
  .filter(Boolean)
  .join(" ");

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
