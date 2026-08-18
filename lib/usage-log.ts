/**
 * 使用日志：记录各 API 的关键事件到 UsageLog 表，
 * 供部署方在服务器上查看使用情况（scripts/usage-log.mjs）。
 *
 * 原则：
 * - 只记计数与分类信息（渠道、数量、质量标记、事件名），
 *   不记录主诉、症状、图像描述等敏感内容原文；
 * - 写日志失败绝不阻断主流程（静默忽略）。
 */

import { prisma } from "@/lib/db";

export type UsageEvent =
  | "report.create"
  | "followup.create"
  | "vision.analyze"
  | "chat.extract"
  | "intake.submit";

export async function logUsage(event: UsageEvent, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    await prisma.usageLog.create({
      data: { event, meta: JSON.stringify(meta) },
    });
  } catch {
    // 日志失败不影响主流程
  }
}
