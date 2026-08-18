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
// 本设备生成的报告（多人共用部署时的简易隔离：
// 历史列表只展示本设备生成的报告；访问令牌是详情页的持有证明）
// ------------------------------------------------------------------

const MY_REPORTS_KEY = "tcm.myReports.v1";

/** 本设备持有的报告引用（旧数据可能只有 id 没有 token） */
export interface MyReportRef {
  id: string;
  token?: string;
}

export function addMyReport(ref: MyReportRef): void {
  try {
    const list = getMyReports().filter((r) => r.id !== ref.id);
    list.unshift(ref);
    localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // localStorage 不可用时忽略
  }
}

export function getMyReports(): MyReportRef[] {
  try {
    const raw = localStorage.getItem(MY_REPORTS_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // 兼容旧格式（纯 id 字符串数组）
    return arr
      .map((x): MyReportRef | null =>
        typeof x === "string"
          ? { id: x }
          : x && typeof x === "object" && typeof (x as MyReportRef).id === "string"
            ? { id: (x as MyReportRef).id, token: (x as MyReportRef).token }
            : null
      )
      .filter((r): r is MyReportRef => r !== null);
  } catch {
    return [];
  }
}

export function getMyReportIds(): string[] {
  return getMyReports().map((r) => r.id);
}

export function getMyReportToken(id: string): string | undefined {
  return getMyReports().find((r) => r.id === id)?.token;
}

export const CHANNEL_LABELS: Record<string, string> = {
  intake: "主诉与四诊",
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};
