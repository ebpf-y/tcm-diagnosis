/**
 * 中医体质判定规则引擎（纯函数，无 IO 依赖，可单元测试）
 *
 * 算法遵循《中医体质分类与判定》标准（CCMQ 计分规则）：
 * 1. 条目计分：1~5 分，反向条目按 6-原始分 计
 * 2. 亚量表原始分 = 条目分之和
 * 3. 转化分 = (原始分 - 条目数) / (条目数 × 4) × 100，范围 0~100
 * 4. 判定：
 *    - 平和质：转化分 ≥ 60 且其余八种偏颇体质转化分均 < 30 → 是；
 *              转化分 ≥ 60 且其余均 < 40 → 基本是；否则 → 否
 *    - 偏颇体质：转化分 ≥ 40 → 是；30~39 → 倾向是；< 30 → 否
 */

import {
  CONSTITUTIONS,
  CONSTITUTION_IDS,
  BIASED_IDS,
  type ConstitutionId,
} from "@/lib/tcm/constitutions";
import { SUBSCALES } from "@/lib/tcm/questions";
import { SIGNS, type Sign } from "@/lib/tcm/signs";

/** 问卷作答：条目 key → 1~5 分 */
export type AnswerMap = Record<string, number>;

export type Verdict = "是" | "基本是" | "倾向是" | "否";

export interface ConstitutionScore {
  id: ConstitutionId;
  name: string;
  /** 原始分（反向条目已翻转） */
  raw: number;
  /** 条目数 */
  itemCount: number;
  /** 转化分 0~100，保留 1 位小数 */
  transformed: number;
  /** 判定结果 */
  verdict: Verdict;
}

export interface DiagnosisResult {
  scores: ConstitutionScore[];
  /** 主体质 */
  primary: ConstitutionScore;
  /** 兼夹体质（判定为"是"或"倾向是"的其余偏颇体质，按转化分降序） */
  secondary: ConstitutionScore[];
  /** 是否判定为平和质（含"基本是"） */
  isBalanced: boolean;
}

/** 反向计分翻转 */
export function flip(score: number): number {
  return 6 - score;
}

/** CCMQ 转化分公式 */
export function transformScore(raw: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  const value = ((raw - itemCount) / (itemCount * 4)) * 100;
  return Math.round(value * 10) / 10;
}

/** 计算单个亚量表原始分（缺失作答按 1 分计，保证算法确定性） */
export function rawSubscaleScore(id: ConstitutionId, answers: AnswerMap): { raw: number; itemCount: number } {
  const entries = SUBSCALES[id];
  let raw = 0;
  for (const entry of entries) {
    const value = answers[entry.key] ?? 1;
    if (value < 1 || value > 5) {
      throw new Error(`条目 ${entry.key} 作答分值非法：${value}（应为 1~5）`);
    }
    raw += entry.reverse ? flip(value) : value;
  }
  return { raw, itemCount: entries.length };
}

/** 第一步：计算九种体质转化分（此时 verdict 未填，由 determineVerdicts 完成） */
export function computeTransformedScores(answers: AnswerMap): Omit<ConstitutionScore, "verdict">[] {
  return CONSTITUTION_IDS.map((id) => {
    const { raw, itemCount } = rawSubscaleScore(id, answers);
    return {
      id,
      name: CONSTITUTIONS[id].name,
      raw,
      itemCount,
      transformed: transformScore(raw, itemCount),
    };
  });
}

/** 第二步：按判定标准给出各体质判定结论 */
export function determineVerdicts(
  scores: Omit<ConstitutionScore, "verdict">[]
): ConstitutionScore[] {
  const pinghe = scores.find((s) => s.id === "pinghe")!;
  const biased = scores.filter((s) => s.id !== "pinghe");
  const maxBiased = Math.max(...biased.map((s) => s.transformed));

  return scores.map((s) => {
    let verdict: Verdict;
    if (s.id === "pinghe") {
      if (s.transformed >= 60 && maxBiased < 30) verdict = "是";
      else if (s.transformed >= 60 && maxBiased < 40) verdict = "基本是";
      else verdict = "否";
    } else {
      if (s.transformed >= 40) verdict = "是";
      else if (s.transformed >= 30) verdict = "倾向是";
      else verdict = "否";
    }
    return { ...s, verdict };
  });
}

/** 完整判定：作答 → 转化分 → 结论 → 主/兼体质 */
export function diagnose(answers: AnswerMap): DiagnosisResult {
  const scores = determineVerdicts(computeTransformedScores(answers));
  const pinghe = scores.find((s) => s.id === "pinghe")!;
  const biased = scores
    .filter((s) => s.id !== "pinghe")
    .sort((a, b) => b.transformed - a.transformed);

  const isBalanced = pinghe.verdict === "是" || pinghe.verdict === "基本是";

  let primary: ConstitutionScore;
  let secondary: ConstitutionScore[];
  if (isBalanced) {
    primary = pinghe;
    secondary = biased.filter((s) => s.verdict === "倾向是");
  } else {
    // 偏颇体质：取判定为"是"中最高者；无"是"则取"倾向是"最高者；再退化为最高分
    const positive = biased.filter((s) => s.verdict === "是");
    const inclined = biased.filter((s) => s.verdict === "倾向是");
    primary = positive[0] ?? inclined[0] ?? biased[0];
    secondary = biased.filter((s) => s !== primary && s.verdict !== "否");
  }
  return { scores, primary, secondary, isBalanced };
}

// ------------------------------------------------------------------
// 体征提示评分（舌诊 / 面诊 / 对话 三渠道共用）
// ------------------------------------------------------------------

/** 根据体征 key 列表汇总各体质提示分（0~100，按该渠道可能最高分归一） */
export function scoreSigns(signKeys: string[]): Record<ConstitutionId, number> {
  const totals = Object.fromEntries(CONSTITUTION_IDS.map((id) => [id, 0])) as Record<
    ConstitutionId,
    number
  >;
  let maxPossible = 0;
  for (const key of signKeys) {
    const sign = SIGNS.find((s) => s.key === key);
    if (!sign) continue;
    for (const [id, w] of Object.entries(sign.weights)) {
      totals[id as ConstitutionId] += w ?? 0;
    }
    maxPossible += Math.max(...Object.values(sign.weights));
  }
  if (maxPossible === 0) return totals;
  const normalized = { ...totals };
  for (const id of CONSTITUTION_IDS) {
    normalized[id] = Math.round((totals[id] / maxPossible) * 1000) / 10;
  }
  return normalized;
}

/** 在自由文本（对话记录、图像分析描述）中按关键词匹配体征 */
export function matchSignsFromText(text: string, category?: Sign["category"]): string[] {
  const found: string[] = [];
  for (const sign of SIGNS) {
    if (category && sign.category !== category) continue;
    if (sign.keywords.some((kw) => text.includes(kw))) {
      found.push(sign.key);
    }
  }
  return found;
}

/** 取体征提示分最高的前 N 种偏颇体质（用于舌/面/对话渠道结论） */
export function topSignConstitutions(
  scores: Record<ConstitutionId, number>,
  n = 3
): { id: ConstitutionId; name: string; score: number }[] {
  return BIASED_IDS.map((id) => ({ id, name: CONSTITUTIONS[id].name, score: scores[id] }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ------------------------------------------------------------------
// 多渠道综合判定
// ------------------------------------------------------------------

export interface ChannelInput {
  /** 渠道标识：questionnaire / chat / tongue / face */
  channel: string;
  /** 问卷渠道直接给出转化分；其余渠道给出体征提示分 */
  scores: Partial<Record<ConstitutionId, number>>;
  /** 渠道权重（问卷权威性最高） */
  weight: number;
}

/** 综合各渠道得分（加权平均），返回 0~100 的综合倾向分排序 */
export function combineChannels(
  channels: ChannelInput[]
): { id: ConstitutionId; name: string; score: number }[] {
  const sums = Object.fromEntries(CONSTITUTION_IDS.map((id) => [id, 0])) as Record<
    ConstitutionId,
    number
  >;
  const weightSums = Object.fromEntries(CONSTITUTION_IDS.map((id) => [id, 0])) as Record<
    ConstitutionId,
    number
  >;
  for (const ch of channels) {
    for (const id of CONSTITUTION_IDS) {
      const v = ch.scores[id];
      if (v !== undefined) {
        sums[id] += v * ch.weight;
        weightSums[id] += ch.weight;
      }
    }
  }
  return CONSTITUTION_IDS.map((id) => ({
    id,
    name: CONSTITUTIONS[id].name,
    score:
      weightSums[id] > 0 ? Math.round((sums[id] / weightSums[id]) * 10) / 10 : 0,
  })).sort((a, b) => b.score - a.score);
}
