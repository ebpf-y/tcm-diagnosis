# 中医体质辨识 Web 应用

基于《中医体质分类与判定》标准（CCMQ-60 量表）的中医体质辨识工具。
通过 **问卷问诊、AI 对话问诊、舌诊拍照、面诊拍照** 四种方式采集信息，
由内置规则引擎综合判定九种体质（平和、气虚、阳虚、阴虚、痰湿、湿热、血瘀、气郁、特禀），
并生成饮食、起居、运动调养建议。

> 免责声明：本应用内容为体质辨识参考，不构成医疗诊断；方药须在执业中医师指导下使用。

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
  api/diagnose/     规则引擎判定接口
  api/chat/         AI 问诊（流式）与症状提取接口
  api/vision/       舌象/面象图像分析接口
  api/report/       综合报告生成与历史查询接口
lib/tcm/            知识库：九种体质、CCMQ-60 量表、舌面象体征映射
lib/engine/         规则引擎（纯函数）
lib/llm/            LLM 客户端抽象（含 mock 降级）
prisma/             数据模型（Report 表）
tests/              规则引擎单元测试
```

## 判定逻辑说明

1. 问卷渠道严格按 CCMQ 计分：条目 5 级计分（平和质负性条目反向计分）→
   亚量表原始分 → 转化分 `(原始分-条目数)/(条目数×4)×100` →
   按标准阈值判定（偏颇体质 ≥40 为"是"，30~39 为"倾向是"；
   平和质需自身 ≥60 且其余八种均 <30/<40）。
2. 对话、舌诊、面诊渠道通过体征知识库（`lib/tcm/signs.ts`）折算为各体质提示分。
3. 综合报告对各渠道按权重（问卷 3、舌/面 1.5、对话 1）加权平均，得出最终体质倾向。
