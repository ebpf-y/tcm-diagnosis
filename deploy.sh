#!/usr/bin/env bash
# ============================================================
# 中医体质辨识应用 —— 腾讯云一键部署/更新脚本
# 用法（在服务器项目目录下执行）：
#   首次部署：bash deploy.sh
#   后续更新：bash deploy.sh   （脚本会自动 git pull）
# 前置条件：已安装 Node.js >= 18.17、pm2（sudo npm i -g pm2）
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

# Prisma 引擎国内镜像（官网下载在国内机房常超时）
export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

echo "==> [1/6] 拉取最新代码"
if [ -d .git ]; then
  # 国内机房访问 GitHub 不稳定：重试 3 次，最终失败则用当前代码继续部署
  pulled=0
  for i in 1 2 3; do
    if git pull --ff-only; then
      pulled=1
      break
    fi
    echo "    第 $i 次拉取失败，5 秒后重试…"
    sleep 5
  done
  if [ "$pulled" = "0" ]; then
    echo "    ⚠️  GitHub 连接失败，将使用服务器上的现有代码继续部署"
    echo "    （如需更新代码，可从本地打包上传，见 DEPLOY.md 常见问题）"
  fi
else
  echo "    非 git 目录，跳过（使用当前代码）"
fi

echo "==> [2/6] 安装依赖"
npm install

echo "==> [3/6] 检查环境变量"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    已从 .env.example 创建 .env（未配置 LLM Key 时以演示模式运行）"
  echo "    如需真实模型能力，请编辑 .env 后重新执行本脚本"
fi

echo "==> [4/6] 初始化/同步 SQLite 数据库"
npx prisma db push

echo "==> [5/6] 构建生产版本"
npm run build

echo "==> [6/6] 启动/重启服务（pm2）"
if pm2 describe tcm >/dev/null 2>&1; then
  pm2 restart tcm
else
  pm2 start npm --name tcm -- start
  pm2 save
fi

echo ""
echo "============================================================"
echo " 部署完成！应用运行在 http://127.0.0.1:3000"
echo " 公网访问请确认 Nginx 已反代 80 -> 3000"
echo " 查看日志：pm2 logs tcm"
echo "============================================================"
