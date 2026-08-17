#!/usr/bin/env bash
# ============================================================
# 子脚本 2/3：仅上传压缩包（在项目根目录执行）
#   bash scripts/upload.sh <服务器公网IP> [SSH用户，默认 root]
# 依赖：已用 scripts/pack.sh 生成 ../tcm-latest.tar.gz
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

IP="${1:-}"
USER_NAME="${2:-root}"
PACK="../tcm-latest.tar.gz"

if [ -z "$IP" ]; then
  echo "用法: bash scripts/upload.sh <服务器公网IP> [SSH用户，默认 root]"
  exit 1
fi
if [ ! -f "$PACK" ]; then
  echo "未找到 $PACK，请先执行 bash scripts/pack.sh"
  exit 1
fi

echo "==> 上传 $PACK 到 $USER_NAME@$IP:/root/"
if ! scp "$PACK" "$USER_NAME@$IP:/root/tcm-latest.tar.gz"; then
  echo "    scp 失败，改用 rsync 断点续传…"
  rsync --partial -P "$PACK" "$USER_NAME@$IP:/root/tcm-latest.tar.gz"
fi
echo "==> 上传完成。服务器上执行 bash scripts/server-install.sh 完成部署"
echo "    （或一条命令直接部署：ssh $USER_NAME@$IP 'bash -s' < scripts/server-install.sh）"
