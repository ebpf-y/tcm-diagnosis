/**
 * 报告访问令牌（持有证明）
 *
 * 背景：历史列表已按设备隔离，但报告详情链接 /report/[id] 对任何
 * 持有者开放。生成报告时下发随机令牌，详情/复诊接口校验令牌匹配；
 * 旧报告（无令牌字段）兼容放行，不做追溯封锁。
 */

import { randomBytes } from "crypto";

/** 生成访问令牌（URL 安全） */
export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * 校验报告访问权：
 * - 报告无令牌（历史数据）→ 放行；
 * - 有令牌 → 必须提供且一致，否则拒绝。
 */
export function canAccessReport(
  report: { accessToken?: string | null },
  token: string | null | undefined
): boolean {
  if (!report.accessToken) return true;
  return Boolean(token) && token === report.accessToken;
}
