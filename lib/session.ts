"use client";

/**
 * 前端渠道结果暂存（localStorage）：
 * 问卷 / 对话 / 舌诊 / 面诊 各自完成后把评分与备注写入本地，
 * 综合报告页汇总提交。照片不存储，仅存分析文本。
 */

export interface ChannelResult {
  channel: "intake" | "questionnaire" | "chat" | "tongue" | "face";
  /** 各体质得分（问卷为转化分，其余为体征提示分，均 0~100） */
  scores: Record<string, number>;
  /** 渠道权重 */
  weight: number;
  /** 渠道备注（结论文本 / 分析描述） */
  note: string;
  /** 该渠道命中的体征 key（证候辨证的输入） */
  signKeys?: string[];
  /** 人口学与健康背景信息（intake 渠道填写；用于禁忌交叉校验与调理建议） */
  demographics?: {
    gender: string;
    ageGroup: string;
    /** 慢性病史 key（intake.ts HISTORY_OPTIONS） */
    history?: string[];
    /** 长期服药自由文本 */
    medications?: string;
    /** 病程 */
    course?: string;
    /** 近期体检异常 key（intake.ts CHECKUP_OPTIONS） */
    checkup?: string[];
  };
  /** 脉诊采集模式（intake 渠道；expert 时脉象体征不参与降权） */
  pulseMode?: "amateur" | "expert";
}

const STORAGE_KEY = "tcm.channels.v1";

export function saveChannelResult(result: ChannelResult): void {
  const all = loadChannelResults();
  const idx = all.findIndex((r) => r.channel === result.channel);
  if (idx >= 0) all[idx] = result;
  else all.push(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadChannelResults(): ChannelResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChannelResult[]) : [];
  } catch {
    return [];
  }
}

export function clearChannelResults(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ------------------------------------------------------------------
// 本设备生成的报告 ID（多人共用部署时的简易隔离：
// 历史列表只展示本设备生成的报告，无账号体系下的最小隐私边界）
// ------------------------------------------------------------------

const MY_REPORTS_KEY = "tcm.myReports.v1";

export function addMyReportId(id: string): void {
  try {
    const ids = getMyReportIds().filter((x) => x !== id);
    ids.unshift(id);
    localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(ids.slice(0, 100)));
  } catch {
    // localStorage 不可用时忽略
  }
}

export function getMyReportIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_REPORTS_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const CHANNEL_LABELS: Record<string, string> = {
  intake: "主诉与四诊",
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};
