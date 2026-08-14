# 中医辨证论治系统

从"体质辨识"升级为"证候级辨证论治"的中医专家系统：
底层保留《中医体质分类与判定》标准（CCMQ-60 量表）的九种体质判定，
上层新增**证候辨证层**（八纲/脏腑/气血津液辨证，18 个常见证候），
并为每个证候给出完整调理方案——**经典方剂（组成/剂量/煎服/加减/禁忌）、食疗、穴位保健、导引起居**。

通过 **问卷问诊、AI 对话问诊（选择式）、舌诊拍照、面诊拍照** 四种方式采集信息，
规则引擎综合判定体质与证候，方案全部由知识库直接组装（无 LLM 依赖、可解释、可复现）。

> 免责声明：本系统输出为中医辨证调理参考，不构成疾病诊断；方药须在执业中医师指导下使用。

## 技术栈

- Next.js 14（App Router）+ TypeScript + Tailwind CSS
- 规则引擎：CCMQ 计分规则的确定性纯函数（`lib/engine/`），配 vitest 单元测试
- LLM 抽象层：OpenAI 兼容协议（`lib/llm/`），默认 DeepSeek（文本）+ 通义 Qwen-VL（图像），
  未配置 Key 时自动进入演示（mock）模式，应用仍可完整跑通
- AI 对话问诊采用选择式交互：LLM 每轮返回 `{reply, options, done}` JSON，
  用户点选候选回答作答，另保留自定义输入兜底；解析失败自动降级为纯文本
- Prisma + SQLite：报告持久化与历史查询（照片不落盘，只存分析文本）

## 快速开始

```bash
npm install          # 安装依赖（自动执行 prisma generate）
npx prisma db push   # 初始化 SQLite 数据库（首次）
npm run dev          # 开发模式，访问 http://localhost:3000
```

不配置任何 API Key 也能运行：AI 对话与图像分析将使用内置演示数据。

## 配置 LLM（可选）

复制 `.env.example` 为 `.env`，按需填写：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `LLM_API_KEY` | 文本模型 Key（问诊对话、报告生成） | 空 → 演示模式 |
| `LLM_BASE_URL` | OpenAI 兼容端点 | `https://api.deepseek.com` |
| `LLM_MODEL` | 文本模型名 | `deepseek-chat` |
| `VISION_API_KEY` | 多模态模型 Key（舌诊/面诊） | 空 → 演示模式 |
| `VISION_BASE_URL` | 多模态端点 | 阿里云百炼兼容端点 |
| `VISION_MODEL` | 多模态模型名 | `qwen-vl-max` |
| `DATABASE_URL` | SQLite 连接串 | `file:./dev.db` |

任何 OpenAI 兼容服务均可接入（Kimi、智谱、通义等），示例见 `.env.example`。

## 常用命令

```bash
npm run dev     # 开发
npm run build   # 生产构建
npm start       # 生产运行
npm test        # 规则引擎单元测试（vitest）
```

## 目录结构

```
app/                页面与 API 路由
  api/diagnose/     规则引擎体质判定接口
  api/chat/         AI 问诊（选择式 JSON 协议）与症状/证候提取接口
  api/vision/       舌象/面象图像分析接口（返回体征与证候提示）
  api/report/       综合报告生成与历史查询接口（结构化：体质+证候+方案）
lib/tcm/            知识库
  constitutions.ts  九种体质（CCMQ）
  questions.ts      CCMQ-60 量表
  signs.ts          63 个体征词条 → 体质 + 证候双重权重映射
  patterns.ts       18 个证候（主症/兼症/舌脉/病机含经典引文/治则/关联方案）
  formulas.ts       27 首经典方剂（出处/组成剂量/煎服法/加减/禁忌/中成药）
  diet-therapy.ts   25 个食疗方（食材/做法/服法/宜忌）
lib/engine/         规则引擎（纯函数：体质计分 + 证候评分 + 方案组装）
lib/llm/            LLM 客户端抽象（含 mock 降级）
components/         ScoreBars / ReportSections（报告分区渲染，新旧格式兼容）
prisma/             数据模型（Report 表）
tests/              规则引擎单元测试
```

## 判定逻辑说明

**体质层（CCMQ 标准）**

1. 问卷渠道严格按 CCMQ 计分：条目 5 级计分（平和质负性条目反向计分）→
   亚量表原始分 → 转化分 `(原始分-条目数)/(条目数×4)×100` →
   按标准阈值判定（偏颇体质 ≥40 为"是"，30~39 为"倾向是"；
   平和质需自身 ≥60 且其余八种均 <30/<40）。
2. 对话、舌诊、面诊渠道通过体征知识库折算为各体质提示分。
3. 综合报告对各渠道按权重（问卷 3、舌/面 1.5、对话 1）加权平均，得出最终体质倾向。

**证候层（本次升级新增）**

1. 对话/舌面诊渠道命中的体征（`signKeys`）按 **主症 3 分 / 舌脉 2 分 / 兼症 1 分**
   加权汇总（`scorePatterns`），以各证候理论满分归一；
   排序时**有主症级命中的证候优先**（辨证立证须有主症支持），并输出命中明细（可解释）。
2. `buildTreatmentPlan` 从知识库直接组装主证的完整调理方案
   （方剂 + 食疗 + 保健），全程无 LLM 依赖。
3. LLM 仅撰写"辨证分析"论述段（病机推演、兼证关系）；无 Key 时由知识库模板生成。

## 合规说明

- 方药区固定警示条：经典方剂须在执业中医师辨证指导下使用，切勿自行抓药。
- 孕妇、哺乳期、儿童、慢性病患者提示先经医师面诊。
- 急重症（剧烈胸痛、高热不退、出血、意识异常等）警示立即就医。

## 服务器部署

腾讯云（或其他 Linux 服务器）部署详见 [DEPLOY.md](DEPLOY.md)： clone 后执行 `bash deploy.sh` 即可一键部署/更新。
