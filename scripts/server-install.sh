#!/usr/bin/env bash
# ============================================================
# 子脚本 3/3：服务器端安装（依赖 /root/tcm-latest.tar.gz 已上传）
# 两种用法：
#   A. 已登录服务器：      bash server-install.sh
#   B. 从本地一次性执行：  ssh root@<服务器IP> 'bash -s' < scripts/server-install.sh
# 流程：备份旧目录 → 解压 → bash deploy.sh → 回环验证
# ============================================================
set -euo pipefail

APP=~/tcm-diagnosis
PACK=~/tcm-latest.tar.gz

if [ ! -f "$PACK" ]; then
  echo "未找到 $PACK，请先在本地执行 scripts/upload.sh 上传"
  exit 1
fi

echo "==> [1/3] 备份旧目录（如存在）"
if [ -d "$APP" ] && [ "$(ls -A "$APP" 2>/dev/null)" ]; then
  rm -rf ~/tcm-diagnosis.bak
  cp -r "$APP" ~/tcm-diagnosis.bak
  echo "    已备份到 ~/tcm-diagnosis.bak"
else
  mkdir -p "$APP"
fi

echo "==> [2/3] 解压并部署"
tar -xzf "$PACK" -C "$APP" --strip-components=1
cd "$APP"
bash deploy.sh

echo "==> [3/3] 回环验证"
if curl -fsI http://127.0.0.1:3000 >/dev/null; then
  echo "    ✓ 应用正常（http://127.0.0.1:3000）"
else
  echo "    ✗ 验证失败：pm2 logs tcm --lines 50"
  exit 1
fi
