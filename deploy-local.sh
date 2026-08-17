#!/usr/bin/env bash
# ============================================================
# 本地上传一键部署（GitHub 拉取失败时的备选通道）
# 用法（在项目根目录、Git Bash 中执行）：
#   bash deploy-local.sh <服务器公网IP> [SSH用户，默认 root]
# 流程：本地打包 → scp 上传（失败自动改 rsync 续传）→
#       服务器备份旧目录 → 解压 → bash deploy.sh → 回环验证
# 详见 DEPLOY-LOCAL.md
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

IP="${1:-}"
USER_NAME="${2:-root}"
PACK="../tcm-latest.tar.gz"

if [ -z "$IP" ]; then
  echo "用法: bash deploy-local.sh <服务器公网IP> [SSH用户，默认 root]"
  exit 1
fi

echo "==> [1/4] 本地打包（排除 node_modules/.next/.git/本地数据库/.env）"
git log --oneline -1 2>/dev/null || echo "    （非 git 目录，跳过版本确认）"
tar --exclude=node_modules --exclude=.next --exclude=.git \
    --exclude='prisma/*.db' --exclude='*.tar.gz' --exclude='.env' \
    -czf "$PACK" .
ls -lh "$PACK" | awk '{print "    包大小：", $5}'

echo "==> [2/4] 上传到 $USER_NAME@$IP"
if ! scp "$PACK" "$USER_NAME@$IP:/root/tcm-latest.tar.gz"; then
  echo "    scp 失败，改用 rsync 断点续传…"
  rsync --partial -P "$PACK" "$USER_NAME@$IP:/root/tcm-latest.tar.gz"
fi

echo "==> [3/4] 服务器端部署（备份 → 解压 → deploy.sh）"
ssh "$USER_NAME@$IP" 'bash -s' <<'REMOTE'
set -euo pipefail
APP=~/tcm-diagnosis

# 已有旧目录时先备份（回滚用；数据库文件不含在包内，不受影响）
if [ -d "$APP" ] && [ "$(ls -A "$APP" 2>/dev/null)" ]; then
  echo "    备份旧目录到 ~/tcm-diagnosis.bak"
  rm -rf ~/tcm-diagnosis.bak
  cp -r "$APP" ~/tcm-diagnosis.bak
else
  mkdir -p "$APP"
fi

tar -xzf ~/tcm-latest.tar.gz -C "$APP" --strip-components=1
cd "$APP"
bash deploy.sh
REMOTE

echo "==> [4/4] 部署后验证"
if ssh "$USER_NAME@$IP" 'curl -fsI http://127.0.0.1:3000 >/dev/null'; then
  echo "    ✓ 应用回环访问正常（http://127.0.0.1:3000）"
  echo ""
  echo "部署完成！浏览器访问 http://$IP 验证。"
  echo "回滚命令（如需要）：ssh $USER_NAME@$IP 'rm -rf ~/tcm-diagnosis && mv ~/tcm-diagnosis.bak ~/tcm-diagnosis && cd ~/tcm-diagnosis && bash deploy.sh'"
else
  echo "    ✗ 回环验证失败，请登录服务器查看：ssh $USER_NAME@$IP 'pm2 logs tcm --lines 50'"
  exit 1
fi
