/**
 * exFAT / FAT32 ドライブ対策パッチ
 *
 * NTFS では「シンボリックリンクではないファイル」に fs.readlink すると EINVAL が返る。
 * ところが exFAT ではリパースポイント自体が存在しないため EISDIR が返り、
 * webpack / Next.js のモジュール解決が「想定外のエラー」として落ちてしまう。
 *
 *   Error: EISDIR: illegal operation on a directory, readlink '...\next\dist\pages\_app.js'
 *
 * ここでは readlink の EISDIR を EINVAL に読み替えるだけの最小のパッチを当てる。
 * NTFS 上では何も起きない（EISDIR が返らないため）ので、環境を選ばず安全。
 *
 * scripts/run-next.mjs から NODE_OPTIONS=--require で読み込まれ、
 * Next.js が生成する子プロセス（型チェック・ページデータ収集）にも引き継がれる。
 */
const fs = require("node:fs");

const UV_EINVAL = -4071; // Windows における libuv の EINVAL

function remap(err) {
  if (err && err.code === "EISDIR" && err.syscall === "readlink") {
    err.code = "EINVAL";
    err.errno = UV_EINVAL;
    err.message = err.message.replace(
      "EISDIR: illegal operation on a directory",
      "EINVAL: invalid argument",
    );
  }
  return err;
}

const origSync = fs.readlinkSync;
fs.readlinkSync = function readlinkSync(...args) {
  try {
    return origSync.apply(this, args);
  } catch (err) {
    throw remap(err);
  }
};

const origCb = fs.readlink;
fs.readlink = function readlink(...args) {
  const cb = args[args.length - 1];
  if (typeof cb !== "function") return origCb.apply(this, args);
  args[args.length - 1] = (err, ...rest) => cb(remap(err), ...rest);
  return origCb.apply(this, args);
};

if (fs.promises && fs.promises.readlink) {
  const origPromise = fs.promises.readlink;
  fs.promises.readlink = (...args) =>
    origPromise.apply(fs.promises, args).catch((err) => {
      throw remap(err);
    });
}
