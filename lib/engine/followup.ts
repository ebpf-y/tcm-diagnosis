/**
 * 复诊复评：证候趋势判定（纯函数规则，无 LLM 依赖）
 *
 * 以初诊主证的归一分变化为核心指标：
 * - 主证易位（复诊第一名不再是初诊主证）→ worse
 * - 主证归一分相对下降 ≥ 30% → improved（效不更方）
 * - 相对上升 ≥ 30% → worse
 * - 变化在 ±30% 以内 → stable（守方观察）
 *
 * 初诊主证归一分为 0（辨证依据不足）时无法计算相对变化：
 * 复诊仍为 0 判 stable，出现得分则判 worse（出现了新的证候线索）。
 */

export type FollowUpTrend = "improved" | "stable" | "worse";

/** 趋势判定阈值：相对变化 ±30%（含边界） */
export const TREND_THRESHOLD = 0.3;

/** 浮点比较容差，使「恰好 ±30%」按规则落入 improved / worse */
const EPSILON = 1e-9;

/**
 * 判定复诊趋势。
 * @param beforePrimaryScore 初诊主证归一分（0~100）
 * @param afterPrimaryScore  复诊时「同一证候」的归一分（未命中为 0）
 * @param primaryChanged     复诊排名第一的证候是否已易位
 */
export function judgeTrend(
  beforePrimaryScore: number,
  afterPrimaryScore: number,
  primaryChanged: boolean
): FollowUpTrend {
  if (primaryChanged) return "worse";
  if (beforePrimaryScore <= 0) {
    return afterPrimaryScore > 0 ? "worse" : "stable";
  }
  const ratio = afterPrimaryScore / beforePrimaryScore;
  if (ratio <= 1 - TREND_THRESHOLD + EPSILON) return "improved";
  if (ratio >= 1 + TREND_THRESHOLD - EPSILON) return "worse";
  return "stable";
}

/** 趋势对应的中文提示文案（医疗表述克制，保持「参考」定位） */
export const TREND_TEXTS: Record<FollowUpTrend, string> = {
  improved:
    "主证符合度明显下降，调理方向对路，「效不更方」，可按原方案继续并遵医师建议。",
  stable: "证候平稳，守方观察；若 2 周无改善，建议面诊。",
  worse: "证候有变化，建议重新完成综合采集生成新报告，或由医师面诊调整方案。",
};

/** 趋势标签（展示用） */
export const TREND_LABELS: Record<FollowUpTrend, string> = {
  improved: "好转",
  stable: "平稳",
  worse: "有变化",
};
