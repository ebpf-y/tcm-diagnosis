/**
 * 使用日志查看脚本（在服务器项目目录下执行）：
 *   node --env-file=.env scripts/usage-log.mjs
 *
 * 输出：事件总量、近 14 天每日分布、最近 30 条事件。
 * 日志只含计数与分类信息，不含主诉/症状/图像描述等敏感内容原文。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVENT_LABELS = {
  "report.create": "生成报告",
  "followup.create": "复诊复评",
  "vision.analyze": "舌面诊分析",
  "chat.extract": "对话提取",
  "intake.submit": "主诉采集提交",
};

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

const logs = await prisma.usageLog.findMany({
  orderBy: { createdAt: "desc" },
  take: 5000,
});

if (logs.length === 0) {
  console.log("暂无使用日志。");
  process.exit(0);
}

// 事件总量
const totals = new Map();
for (const l of logs) totals.set(l.event, (totals.get(l.event) ?? 0) + 1);
console.log("== 事件总量（最近 " + logs.length + " 条）==");
for (const [event, count] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${(EVENT_LABELS[event] ?? event).padEnd(8, "　")} ${count}`);
}

// 近 14 天每日分布
console.log("\n== 近 14 天每日事件数 ==");
const daily = new Map();
for (const l of logs) {
  const key = dayKey(l.createdAt);
  daily.set(key, (daily.get(key) ?? 0) + 1);
}
for (let i = 13; i >= 0; i--) {
  const key = dayKey(new Date(Date.now() - i * 86400_000));
  const count = daily.get(key) ?? 0;
  console.log(`  ${key}  ${"█".repeat(Math.min(count, 60))} ${count}`);
}

// 最近 30 条
console.log("\n== 最近 30 条事件 ==");
for (const l of logs.slice(0, 30)) {
  const time = l.createdAt.toLocaleString("zh-CN", { hour12: false });
  let meta = {};
  try {
    meta = JSON.parse(l.meta);
  } catch {
    // 忽略无法解析的 meta
  }
  const metaText = Object.entries(meta)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("+") : v}`)
    .join(" ");
  console.log(`  ${time}  ${(EVENT_LABELS[l.event] ?? l.event).padEnd(8, "　")} ${metaText}`);
}

await prisma.$disconnect();
