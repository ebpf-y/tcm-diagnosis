# 本地上传部署手册（GitHub 拉取失败时的备选方案）

> 适用场景：腾讯云国内机房访问 GitHub 不稳定，`git clone` / `git pull` 超时或报
> `Failure when receiving data from the peer`，无法按 [DEPLOY.md](DEPLOY.md) 的主流程拉取代码。
> 本手册的路线：**本地打包 → scp 上传 → 服务器解压 → 照常执行 deploy.sh**。
>
> 以下以本地 **Windows + Git Bash**、项目目录 `D:\Work\Data\Code\projects\tcm`、
> 服务器 **Ubuntu + root** 为例；macOS/Linux 本地命令相同。

## 0. 原理一句话

服务器跑不起来不是因为缺 git，而是因为**连不上 GitHub**。所以代码不经过 GitHub：
本地打成压缩包直接传给服务器。`deploy.sh` 检测到目录里没有 `.git` 时会自动跳过拉取步骤，
其余流程（装依赖 → 建 .env → 同步数据库 → 构建 → pm2 启动）完全一样。

## 0.1 最快路径：一键脚本

项目已内置全套脚本，绝大多数情况下一条命令搞定（本地 Git Bash、项目根目录）：

```bash
bash deploy-local.sh <服务器公网IP>        # 打包 → 上传 → 备份 → 解压 → 部署 → 验证
```

想分步执行或排查问题时用子脚本：

```bash
bash scripts/pack.sh                       # 仅打包（产物在项目同级目录 tcm-latest.tar.gz）
bash scripts/upload.sh <服务器公网IP>      # 仅上传（scp 失败自动转 rsync 续传）
ssh root@<服务器公网IP> 'bash -s' < scripts/server-install.sh   # 仅服务器端安装
```

手工逐步操作的完整说明见下文（与脚本逻辑一致）。

## 1. 本地打包（Git Bash）

打开 Git Bash：

```bash
cd /d/Work/Data/Code/projects

# 打包（排除依赖、构建产物、git 元数据、本地数据库与 .env）
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude='prisma/*.db' --exclude='.env' \
    -czf tcm-latest.tar.gz tcm

# 确认包大小（通常 1~5 MB）
ls -lh tcm-latest.tar.gz
```

**排除项说明（都很重要）：**

| 排除项 | 原因 |
| --- | --- |
| `node_modules` | 体积数百 MB，服务器上 `npm install` 会重装 |
| `.next` | 本地构建产物与服务器环境不一致，服务器会重新构建 |
| `.git` | 避免与服务器上的仓库状态混淆 |
| `prisma/*.db` | **防止用本地演示数据覆盖服务器上的正式报告数据** |
| `.env` | **防止本地密钥随包外传或覆盖服务器上的 .env**（服务器 .env 由 deploy.sh 从 .env.example 创建/保留） |

## 2. 上传到服务器

```bash
scp tcm-latest.tar.gz root@<服务器公网IP>:/root/
```

- 首次连接会问 `Are you sure you want to continue connecting?`，输入 `yes`；
- 若 SSH 用密钥登录，加 `-i` 指定密钥：`scp -i ~/.ssh/xxx.pem ...`；
- 传输出错中断可改用 `rsync --partial -P` 续传：

```bash
rsync --partial -P tcm-latest.tar.gz root@<服务器公网IP>:/root/
```

## 3. 服务器解压部署

SSH 登录服务器：

```bash
ssh root@<服务器公网IP>
```

### 首次部署（服务器上还没有项目目录）

```bash
mkdir -p ~/tcm-diagnosis
tar -xzf ~/tcm-latest.tar.gz -C ~/tcm-diagnosis --strip-components=1
cd ~/tcm-diagnosis
bash deploy.sh
```

`--strip-components=1` 剥掉压缩包最外层的 `tcm/` 目录，让文件直接落在项目根目录。

### 更新部署（服务器上已有项目目录）

```bash
cd ~/tcm-diagnosis

# 解压覆盖（不会动 prisma/dev.db——包里根本没有数据库文件）
tar -xzf ~/tcm-latest.tar.gz --strip-components=1

bash deploy.sh
```

`deploy.sh` 会自动完成：装依赖（含 Prisma 引擎国内镜像）→ 同步 SQLite schema
（新增表如 FollowUp 自动创建，已有数据不受影响）→ 构建 → pm2 重启。

## 4. 验证

```bash
# 服务器本地回环测试
curl -I http://127.0.0.1:3000        # 应返回 200

# 进程与日志
pm2 status
pm2 logs tcm --lines 50
```

浏览器访问 `http://<公网IP>` 确认页面正常。

## 5. 回滚（可选但建议）

更新前留一份旧代码，出问题秒级回退：

```bash
# 服务器上，更新前先备份
cp -r ~/tcm-diagnosis ~/tcm-diagnosis.bak

# 需要回滚时
rm -rf ~/tcm-diagnosis && mv ~/tcm-diagnosis.bak ~/tcm-diagnosis
cd ~/tcm-diagnosis && bash deploy.sh
```

（回滚只影响代码；`prisma/dev.db` 数据文件不受影响。）

## 6. 常见问题

- **scp 也很慢/连不上**：确认本地能 ping 通服务器 IP、腾讯云控制台防火墙放通了 22 端口；
  也可用腾讯云控制台的「登录 → VNC/webshell」在网页里操作，改用对象存储 COS 中转
  （本地上传 COS → 服务器 `wget` COS 内网地址，速度最快）。
- **解压后 `bash deploy.sh` 提示权限不足**：`chmod +x deploy.sh` 后重试，或直接用 `bash deploy.sh`（不依赖执行位）。
- **构建时内存不足被杀（Killed）**：1G/2G 内存机器先加 swap，见 DEPLOY.md 附录。
- **`npm install` 卡在 Prisma 引擎下载**：`deploy.sh` 已内置国内镜像环境变量，务必用
  `bash deploy.sh` 而不是手动逐条执行；手动执行前先
  `export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma`。
- **担心本地代码不是最新**：打包前在本地 `git log --oneline -1` 记下提交号，
  部署后在服务器上 `grep` 一个本次新功能的关键词（如 `grep -r "FollowUp" prisma/schema.prisma`）
  确认包确实是新版本。
- **以后 GitHub 能连上了**：直接 `cd ~/tcm-diagnosis && git init && git remote add origin git@github.com:ebpf-y/tcm-diagnosis.git && git fetch && git reset --hard origin/master`，
  之后恢复 `git pull` 主流程即可（注意 `git reset --hard` 会丢弃服务器上的本地改动，
  数据库文件 `prisma/dev.db` 在 .gitignore 中不受影响）。
