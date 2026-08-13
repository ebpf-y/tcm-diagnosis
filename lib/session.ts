"use client";

/**
 * 前端渠道结果暂存（localStorage）：
 * 问卷 / 对话 / 舌诊 / 面诊 各自完成后把评分与备注写入本地，
 * 综合报告页汇总提交。照片不存储，仅存分析文本。
 */

export interface ChannelResult {
  channel: "questionnaire" | "chat" | "tongue" | "face";
  /** 各体质得分（问卷为转化分，其余为体征提示分，均 0~100） */
  scores: Record<string, number>;
  /** 渠道权重 */
  weight: number;
  /** 渠道备注（结论文本 / 分析描述） */
  note: string;
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

export const CHANNEL_LABELS: Record<string, string> = {
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};
