# 腾讯云部署指南

本项目为 Next.js 14 + Prisma/SQLite 全栈应用，以下步骤以**腾讯云轻量应用服务器（Ubuntu）**为例，全程约 20~30 分钟。

## 0. 准备

- 代码仓库：https://github.com/ebpf-y/tcm-diagnosis （公开仓库，clone 无需认证）
- 服务器要求：**2核2G** 起步（1G 内存构建可能 OOM，需先加 swap，见附录）
- Node.js **>= 18.17**（本项目验证环境为 Node 20）

## 1. 购买与初始化服务器

1. 腾讯云控制台 → 轻量应用服务器 → 新建：
   - 镜像：**Ubuntu 22.04 或 24.04**（选"系统镜像"，不要选应用镜像）
   - 套餐：2核2G 起步
2. 记录**公网 IP**
3. 控制台「防火墙」放通端口：

   | 端口 | 用途 |
   |---|---|
   | 22 | SSH 登录 |
   | 80 | HTTP 访问 |
   | 443 | HTTPS（配证书后使用） |

   不要对公网开放 3000 端口（应用只监听本机，由 Nginx 反代）。

## 2. 登录服务器，安装环境

本地终端（PowerShell / Git Bash 均可）：

```bash
ssh ubuntu@<公网IP>
```

服务器上执行：

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
node -v    # 确认 v20.x

# pm2 进程守护
sudo npm i -g pm2
```

## 3. 拉取代码并一键部署

```bash
git clone https://github.com/ebpf-y/tcm-diagnosis.git
cd tcm-diagnosis
bash deploy.sh
```

`deploy.sh` 自动完成：安装依赖（含 Prisma 引擎国内镜像）→ 创建 `.env` → 初始化 SQLite → 构建 → pm2 启动。

## 4. 配置 LLM Key（可选）

不配置也能运行（演示模式，舌面诊/对话为内置模拟数据）。接入真实模型：

```bash
nano .env
```

按 `.env` 内注释填入（OpenAI 兼容协议，任选一家）：

```bash
# 文本模型（对话问诊/报告生成），示例为 DeepSeek
LLM_API_KEY="sk-xxx"
LLM_BASE_URL="https://api.deepseek.com"
LLM_MODEL="deepseek-chat"

# 多模态模型（舌诊/面诊），示例为阿里云百炼
VISION_API_KEY="sk-xxx"
VISION_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
VISION_MODEL="qwen-vl-max"
```

保存后重启生效：

```bash
pm2 restart tcm
```

## 5. Nginx 反向代理（80 端口对外）

```bash
sudo nano /etc/nginx/sites-available/tcm
```

写入（`server_name` 填公网 IP 或域名）：

```nginx
server {
    listen 80;
    server_name <公网IP或域名>;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10m;   # 舌诊/面诊图片上传
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/tcm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

浏览器访问 `http://<公网IP>` 验证。

## 6. 域名与 HTTPS（可选）

1. 域名 A 记录解析到公网 IP
2. **国内机房需完成 ICP 备案**（腾讯云控制台提交，约 2~3 周；未备案可先用 IP 访问）
3. 备案完成后申请免费证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <你的域名>
```

certbot 会自动改 Nginx 配置并设置证书自动续期。

## 7. 日常运维

```bash
# 更新到最新代码（拉取 + 重装依赖 + 构建 + 重启，一条命令）
cd tcm-diagnosis && bash deploy.sh

# 查看日志
pm2 logs tcm

# 查看运行状态
pm2 status

# 开机自启（首次部署后执行一次，按输出提示再执行一条 sudo 命令）
pm2 startup
```

> **数据库 schema 说明**：`deploy.sh` 每次执行都会跑 `npx prisma db push`，
> 新增表（如复诊记录 `FollowUp` 表）会在更新时自动创建，已有报告数据不受影响，
> 无需手动迁移。

## 8. 数据备份

报告数据存于 SQLite 单文件 `prisma/dev.db`，备份即拷贝该文件：

```bash
# 服务器上手动备份
cp prisma/dev.db ~/backup/dev-$(date +%Y%m%d).db
```

建议用 crontab 加一条每日自动备份。

## 附录：1G 内存服务器构建前加 swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 常见问题

- **`npm install` 卡在 prisma 引擎下载**：`deploy.sh` 已内置 `PRISMA_ENGINES_MIRROR` 国内镜像；手动执行 npm 命令前请先 `export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma`
- **构建时内存不足被杀**：见附录加 swap，或本地 `npm run build` 后将 `.next` 目录 scp 上传（不推荐，优先加内存）
- **访问 502**：先 `curl http://127.0.0.1:3000` 确认应用在跑，再 `pm2 logs tcm` 看日志
- **图片上传 413**：检查 Nginx 配置中 `client_max_body_size 10m` 是否存在
- **`git pull` 连不上 GitHub**（国内机房常见，`Failure when receiving data from the peer`）：`deploy.sh` 已内置 3 次重试且失败后用现有代码继续部署。仍要更新代码时，从本地打包上传（绕过服务器访问 GitHub）：

  ```bash
  # 本地 Git Bash 执行（Windows 路径示例）
  cd /d/Work/Data/Code/projects
  tar --exclude=node_modules --exclude=.next --exclude=.git --exclude='prisma/*.db' -czf tcm-latest.tar.gz tcm
  scp tcm-latest.tar.gz root@<服务器IP>:/root/
  # 服务器上执行
  cd ~/tcm-diagnosis && tar -xzf ~/tcm-latest.tar.gz --strip-components=1 && bash deploy.sh
  ```
