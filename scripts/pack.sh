#!/usr/bin/env bash
# ============================================================
# 子脚本 1/3：仅本地打包（在项目根目录执行）
#   bash scripts/pack.sh
# 产物：项目同级目录下的 tcm-latest.tar.gz
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 当前代码版本"
git log --oneline -1 2>/dev/null || echo "    （非 git 目录）"

tar --exclude=node_modules --exclude=.next --exclude=.git \
    --exclude='prisma/*.db' --exclude='*.tar.gz' --exclude='.env' \
    -czf ../tcm-latest.tar.gz .

ls -lh ../tcm-latest.tar.gz | awk '{print "==> 打包完成：../tcm-latest.tar.gz（", $5, "）"}'
echo "    已排除：node_modules / .next / .git / prisma/*.db / .env（服务器 .env 由 deploy.sh 管理，本地密钥不外传）"
