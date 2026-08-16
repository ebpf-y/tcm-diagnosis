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
import { PATTERNS, PATTERN_IDS, type Pattern, type PatternId } from "@/lib/tcm/patterns";
import { FORMULAS, type Formula } from "@/lib/tcm/formulas";
import { FORMULA_TUNING, CONTRA_TAGS } from "@/lib/tcm/formula-tuning";
import { DIET_THERAPIES, type DietTherapy } from "@/lib/tcm/diet-therapy";
import { CHIEF_COMPLAINT_OPTIONS, AGE_GROUP_LABELS, HISTORY_OPTIONS, LIFESTYLE_OPTIONS, CHECKUP_OPTIONS, EXPERT_PULSE_OPTIONS, type IntakeForm } from "@/lib/tcm/intake";

/** 专家模式可录入的脉象体征 key 集合 */
const EXPERT_PULSE_KEYS = new Set<string>(EXPERT_PULSE_OPTIONS.map((o) => o.key));

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
    if (!sign?.weights) continue;
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

// ------------------------------------------------------------------
// 证候辨证评分（主症 3 分 / 舌脉 2 分 / 兼症 1 分加权，含命中明细）
// ------------------------------------------------------------------

/** 命中角色（由体征的证候权重推定） */
export type PatternHitRole = "主症" | "舌脉" | "兼症";

export interface PatternHitDetail {
  signKey: string;
  signLabel: string;
  /** 该体征对该证候的权重 */
  weight: number;
  role: PatternHitRole;
}

export interface PatternHit {
  id: PatternId;
  name: string;
  category: Pattern["category"];
  /** 原始加权分 */
  raw: number;
  /** 归一分 0~100：raw / 该证候理论满分 × 100 */
  score: number;
  /** 是否命中主症级体征（辨证立证的基本要求：主证须有主症支持） */
  hasChiefHit: boolean;
  /** 命中明细（可解释性） */
  hits: PatternHitDetail[];
  /** 支持该证候的采集渠道（scorePatterns 传入 sources 时填充） */
  sources: string[];
  /** 是否获得多渠道互证（≥2 个独立渠道命中，得分加成） */
  corroborated: boolean;
}

function roleOf(weight: number): PatternHitRole {
  if (weight >= 3) return "主症";
  if (weight === 2) return "舌脉";
  return "兼症";
}

/**
 * 每个证候的理论满分：所有映射到它的体征权重之和。
 * availableCategories 限定本次实际采集到的体征类别（覆盖率感知归一）：
 * 未采集渠道的类别不计入分母，避免渠道缺失导致系统性低分与偏序。
 */
function patternPotentials(
  availableCategories?: Sign["category"][]
): Record<PatternId, number> {
  const potentials = Object.fromEntries(PATTERN_IDS.map((id) => [id, 0])) as Record<
    PatternId,
    number
  >;
  for (const sign of SIGNS) {
    if (!sign.patterns) continue;
    if (availableCategories && !availableCategories.includes(sign.category)) continue;
    for (const [pid, w] of Object.entries(sign.patterns)) {
      potentials[pid as PatternId] += w ?? 0;
    }
  }
  return potentials;
}

/** 证候评分选项 */
export interface PatternScoreOptions {
  /** 渠道 → 该渠道命中的体征 key（互证加成依据） */
  sources?: Record<string, string[]>;
  /** 本次实际采集到的体征类别；缺省为全部类别（兼容旧行为） */
  availableCategories?: Sign["category"][];
  /**
   * 脉诊数据的采集模式：expert 时脉象体征忽略 weightScale 降权（专业录入
   * 可信度高）；amateur/缺省保持降权（业余自测脉形误差较大，只作参考）。
   */
  pulseMode?: "amateur" | "expert";
}

/** 多渠道互证加成系数（同一证候被 ≥2 个独立渠道支持时） */
const CORROBORATION_FACTOR = 1.2;

/**
 * 证候辨证评分：按体征的证候权重（主症 3 / 舌脉 2 / 兼症 1）加权汇总，
 * 以各证候理论满分归一（可按实际采集类别做覆盖率感知归一）。
 * 传入 sources 时启用多渠道互证：同一证候被 ≥2 个独立渠道命中，
 * 归一分 ×1.2（封顶 100），视为证据更强。排序规则：有主症级命中的
 * 证候在前（辨证立证须有主症支持），同级按归一分降序。
 */
export function scorePatterns(
  signKeys: string[],
  options: PatternScoreOptions = {}
): PatternHit[] {
  const raws = Object.fromEntries(PATTERN_IDS.map((id) => [id, 0])) as Record<PatternId, number>;
  const hitMap = new Map<PatternId, PatternHitDetail[]>();
  for (const key of signKeys) {
    const sign = SIGNS.find((s) => s.key === key);
    if (!sign?.patterns) continue;
    // 脉形自评等低可靠性体征按 weightScale 降权（专家模式录入的脉象不降权）；
    // 命中明细仍记原始权重
    const scale =
      options.pulseMode === "expert" && sign.category === "pulse" ? 1 : (sign.weightScale ?? 1);
    for (const [pid, w] of Object.entries(sign.patterns)) {
      const id = pid as PatternId;
      const weight = w ?? 0;
      if (weight <= 0) continue;
      raws[id] += weight * scale;
      const list = hitMap.get(id) ?? [];
      list.push({ signKey: sign.key, signLabel: sign.label, weight, role: roleOf(weight) });
      hitMap.set(id, list);
    }
  }
  const potentials = patternPotentials(options.availableCategories);
  // 体征 → 命中它的渠道列表（互证统计依据）
  const channelsByKey = new Map<string, string[]>();
  if (options.sources) {
    for (const [channel, keys] of Object.entries(options.sources)) {
      for (const k of keys) {
        const list = channelsByKey.get(k) ?? [];
        if (!list.includes(channel)) list.push(channel);
        channelsByKey.set(k, list);
      }
    }
  }
  return PATTERN_IDS.filter((id) => raws[id] > 0)
    .map((id) => {
      const hits = (hitMap.get(id) ?? []).sort((a, b) => b.weight - a.weight);
      const sources = Array.from(
        new Set(hits.flatMap((h) => channelsByKey.get(h.signKey) ?? []))
      );
      const corroborated = sources.length >= 2;
      const base = potentials[id] > 0 ? (raws[id] / potentials[id]) * 100 : 0;
      const boosted = corroborated ? base * CORROBORATION_FACTOR : base;
      return {
        id,
        name: PATTERNS[id].name,
        category: PATTERNS[id].category,
        raw: raws[id],
        score: Math.round(Math.min(100, boosted) * 10) / 10,
        hasChiefHit: hits.some((h) => h.role === "主症"),
        hits,
        sources,
        corroborated,
      };
    })
    .sort(
      (a, b) =>
        Number(b.hasChiefHit) - Number(a.hasChiefHit) || b.score - a.score || b.raw - a.raw
    );
}

// ------------------------------------------------------------------
// 调理方案组装（纯知识库拼装，无 LLM 依赖）
// ------------------------------------------------------------------

/** 带个体化信息的方剂条目 */
export interface FormulaEntry {
  formula: Formula;
  /** 选方理由（方内选方：命中 favorSigns 时生成） */
  reason?: string;
  /** 命中动态加减规则生成的个体化加减建议（供医师参考） */
  appliedMods: string[];
}

export interface TreatmentPlan {
  /** 证候完整信息（含病机、治则、舌脉等） */
  pattern: Pattern;
  /** 主证方剂（按 favorSigns 命中数排序，对证者在前） */
  formulas: FormulaEntry[];
  /**
   * 合方化裁建议：兼证不另立全方，择其要药合入主方加减（供医师参考）。
   */
  combinations: { patternId: PatternId; patternName: string; hint: string }[];
  /** @deprecated 旧版字段：兼证全方并列，新报告不再产出，仅为兼容历史报告保留 */
  secondaryPlans?: { patternId: PatternId; patternName: string; formulas: FormulaEntry[] }[];
  /** 关联食疗方 */
  dietTherapies: DietTherapy[];
  /** 保健方案（穴位/导引/起居） */
  wellness: Pattern["wellness"];
  /** 调理顺序（主证 + 兼证的分步调理思路） */
  sequencing: SequencingStep[];
  /** 慢性病程提示（病程 >6 个月时由引擎给出「久病入络」思路） */
  chronicNote?: string;
}

function signLabel(key: string): string {
  return SIGNS.find((s) => s.key === key)?.label ?? key;
}

/** 方剂 key 列表 → 带选方理由与动态加减的条目（对证优先排序） */
function toFormulaEntries(keys: string[], signKeys: string[]): FormulaEntry[] {
  return keys
    .map((k) => FORMULAS[k])
    .filter((f): f is Formula => Boolean(f))
    .map((formula) => {
      const tuning = FORMULA_TUNING[formula.key];
      const favorHits = (tuning?.favorSigns ?? []).filter((s) => signKeys.includes(s));
      const appliedMods = (tuning?.modRules ?? [])
        .filter((r) => r.signs.some((s) => signKeys.includes(s)))
        .map((r) => r.text);
      return { formula, favorHits, appliedMods };
    })
    .sort((a, b) => b.favorHits.length - a.favorHits.length)
    .map(({ formula, favorHits, appliedMods }) => ({
      formula,
      reason:
        favorHits.length > 0
          ? `命中「${favorHits.map(signLabel).join("、")}」，较同证其他方更为对证`
          : undefined,
      appliedMods,
    }));
}

/**
 * 从知识库组装某证候的完整调理方案。
 * signKeys 用于个体化：同证多方时按 favorSigns 选方排序并生成理由，
 * 命中动态加减规则时生成针对该用户的加减建议。
 */
export function buildTreatmentPlan(
  patternId: PatternId,
  secondaryIds: PatternId[] = [],
  signKeys: string[] = [],
  options: { chronic?: boolean } = {}
): TreatmentPlan | null {
  const pattern = PATTERNS[patternId];
  if (!pattern) return null;
  return {
    pattern,
    formulas: toFormulaEntries(pattern.formulaKeys, signKeys),
    combinations: secondaryIds.map((sid) => ({
      patternId: sid,
      patternName: PATTERNS[sid].name,
      hint: PATTERNS[sid].combineHint,
    })),
    dietTherapies: pattern.dietKeys
      .map((k) => DIET_THERAPIES[k])
      .filter((d): d is DietTherapy => Boolean(d)),
    wellness: pattern.wellness,
    sequencing: buildSequencing(patternId, secondaryIds),
    chronicNote: options.chronic
      ? "病程超过 6 个月，病久入络（叶天士「久病入络」），调治中可佐活血通络之品（如丹参、川芎）；久病虚证难图速效，须守方缓图、循序渐进，具体请医师酌参。"
      : undefined,
  };
}

// ------------------------------------------------------------------
// 调理顺序推导（纯知识库规则，无 LLM 依赖）
// ------------------------------------------------------------------

export interface SequencingStep {
  step: number;
  /** 目标证候 ID */
  targetId: PatternId;
  /** 目标证候名 */
  target: string;
  /** 调理方向 */
  focus: string;
  /** 依据说明（含经典引文） */
  rationale: string;
}

/** 虚证类证候 */
const DEFICIENCY_PATTERNS: PatternId[] = [
  "piqixu",
  "piyangxu",
  "shenyangxu",
  "shenyinxu",
  "xinpi_liangxu",
  "qixue_liangxu",
  "ganxue_xu",
  "feiqixu",
  "weiyinxu",
  "xinshen_bujiao", // 本虚标实，以肾阴亏虚为本，归入虚证
];

/** 实邪类证候（痰湿/湿热/气滞/血瘀/实火/外邪） */
const EXCESS_PATTERNS: PatternId[] = [
  "tanshi_zhongzu",
  "shire_yunpi",
  "ganyu_qizhi",
  "qizhi_xueyu",
  "ganhuo_shangyan",
  "fenghan_shubiao",
  "fengre_fanbiao",
];

/** 查找主证指向某兼证的已知传变/兼夹关系（仅正向：本源在主证一方） */
function findRelation(
  a: PatternId,
  b: PatternId
): { sourceId: PatternId; targetId: PatternId; mechanism: string; classic?: string } | null {
  const fwd = PATTERNS[a].relations.find((r) => r.target === b);
  if (fwd) return { sourceId: a, targetId: b, mechanism: fwd.mechanism, classic: fwd.classic };
  return null;
}

function stepOf(
  step: number,
  targetId: PatternId,
  focus: string,
  rationale: string
): SequencingStep {
  return { step, targetId, target: PATTERNS[targetId].name, focus, rationale };
}

/**
 * 推导主证 + 兼证的调理顺序。规则优先级：
 * 1. 主证与兼证存在已知传变/兼夹关系（relations）→ 按关系定先后，治其本源为先；
 * 2. 虚实夹杂 → 「急则治其标，缓则治其本」，先祛邪（佐扶正）后补虚；
 * 3. 多脏俱虚 → 先调脾胃（后天之本）后及他脏；
 * 4. 单一证候 → 直治其证，一步即可。
 */
export function buildSequencing(
  primaryId: PatternId,
  secondaryIds: PatternId[] = []
): SequencingStep[] {
  const primary = PATTERNS[primaryId];
  if (!primary) return [];

  // 规则 4：单一证候
  if (secondaryIds.length === 0) {
    return [
      stepOf(
        1,
        primaryId,
        primary.treatment,
        `证情单一，直治其证即可，治以${primary.treatment}。`
      ),
    ];
  }

  // 规则 1：已知传变/兼夹关系（取首个命中的关系定先后）
  for (const secId of secondaryIds) {
    const rel = findRelation(primaryId, secId);
    if (!rel) continue;
    const first = PATTERNS[rel.sourceId];
    const second = PATTERNS[rel.targetId];
    const steps: SequencingStep[] = [
      stepOf(
        1,
        rel.sourceId,
        `${first.treatment}为先`,
        `${rel.mechanism}。${rel.classic ? `经典依据：${rel.classic}。` : ""}故先治其本（${first.name}），治以${first.treatment}。`
      ),
      stepOf(
        2,
        rel.targetId,
        `佐以${second.treatment}`,
        `待其本得治，再图${second.name}，治以${second.treatment}，使先后有序、标本兼顾。`
      ),
    ];
    // 其余兼证依次殿后
    let n = 2;
    for (const other of secondaryIds) {
      if (other === secId) continue;
      n += 1;
      steps.push(
        stepOf(n, other, PATTERNS[other].treatment, `兼证${PATTERNS[other].name}随后兼顾调治。`)
      );
    }
    return steps;
  }

  // 规则 2：虚实夹杂 → 先祛邪后补虚
  const primaryIsExcess = EXCESS_PATTERNS.includes(primaryId);
  const excessSecondary = secondaryIds.find((id) => EXCESS_PATTERNS.includes(id));
  const defSecondary = secondaryIds.find((id) => DEFICIENCY_PATTERNS.includes(id));
  const biaoben =
    "《素问·标本病传论》论病有标本、治有缓急，所谓「急则治其标，缓则治其本」。";
  if (!primaryIsExcess && excessSecondary !== undefined) {
    // 主虚兼实：先祛邪（佐扶正），后补虚
    const excess = PATTERNS[excessSecondary];
    const steps: SequencingStep[] = [
      stepOf(
        1,
        excessSecondary,
        `先祛邪（${excess.treatment}），佐以扶正`,
        `主证${primary.name}属虚，兼证${excess.name}为实邪；虚实夹杂，${biaoben}邪盛之际先祛其邪，以免闭门留寇、虚不受补。`
      ),
      stepOf(
        2,
        primaryId,
        `缓图其本（${primary.treatment}）`,
        `邪去之后正气易复，再行${primary.treatment}以固其本。`
      ),
    ];
    let n = 2;
    for (const other of secondaryIds) {
      if (other === excessSecondary) continue;
      n += 1;
      steps.push(
        stepOf(n, other, PATTERNS[other].treatment, `兼证${PATTERNS[other].name}随后兼顾调治。`)
      );
    }
    return steps;
  }
  if (primaryIsExcess && defSecondary !== undefined) {
    // 主实兼虚：祛邪为主，佐以扶正
    const def = PATTERNS[defSecondary];
    const steps: SequencingStep[] = [
      stepOf(
        1,
        primaryId,
        `祛邪为主（${primary.treatment}），佐以扶正`,
        `主证${primary.name}属实，兼证${def.name}属虚；${biaoben}邪去则正安，祛邪同时佐以扶正，防攻伐伤正。`
      ),
      stepOf(
        2,
        defSecondary,
        `继以${def.treatment}`,
        `邪去正伤，继以${def.treatment}培补，使正气来复。`
      ),
    ];
    let n = 2;
    for (const other of secondaryIds) {
      if (other === defSecondary) continue;
      n += 1;
      steps.push(
        stepOf(n, other, PATTERNS[other].treatment, `兼证${PATTERNS[other].name}随后兼顾调治。`)
      );
    }
    return steps;
  }

  // 规则 3：多脏俱虚 → 先调脾胃
  const steps: SequencingStep[] = [
    stepOf(
      1,
      primaryId,
      `先调脾胃（${primary.treatment}）`,
      `脾胃为后天之本、气血生化之源。多脏俱虚之候，先健运中焦使化源充足，再及他脏。李东垣《脾胃论》云：「内伤脾胃，百病由生。」`
    ),
  ];
  let n = 1;
  for (const other of secondaryIds) {
    n += 1;
    steps.push(
      stepOf(
        n,
        other,
        PATTERNS[other].treatment,
        `脾胃得健、化源充足后，再治${PATTERNS[other].name}（${PATTERNS[other].treatment}），后天养先天。`
      )
    );
  }
  return steps;
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

// ------------------------------------------------------------------
// 主诉与四诊信息采集（/intake）→ 体征转换
// ------------------------------------------------------------------

/**
 * 将结构化采集表单转换为体征 key 列表。
 *
 * 脉率映射规则：
 * - rate < 60 → pulse_chi（迟脉，主寒/阳虚）
 * - rate > 90 → pulse_shuo（数脉，主热/阴虚）
 * - 60~90 不产出迟/数；与力度/深浅/粗细/节律自评独立组合
 *   （如脉率正常但无力 → pulse_ruo 弱脉，主气虚/阳虚/气血两虚）
 */
export function intakeToSigns(intake: IntakeForm): string[] {
  const keys = new Set<string>();

  // 主诉：选项直接携带体征 key；自定义文本走关键词匹配
  for (const ck of intake.chiefComplaints) {
    const opt = CHIEF_COMPLAINT_OPTIONS.find((o) => o.key === ck);
    for (const sk of opt?.signs ?? []) keys.add(sk);
  }
  if (intake.customComplaint) {
    for (const sk of matchSignsFromText(intake.customComplaint, "symptom")) keys.add(sk);
  }

  // 女性专问（仅性别为女时产出；旧数据无 gender 字段时按原逻辑兼容）
  if (intake.female && intake.gender !== "male") {
    if (intake.female.flow === "量少色淡") keys.add("sym_menses_light");
    if (intake.female.pain) keys.add("sym_dysmenorrhea");
    if (intake.female.leukorrhea) keys.add("sym_leukorrhea");
    if (intake.female.cycle === "不规律") keys.add("sym_mood"); // 月经失调多与情志相关
  }

  // 男性专问（仅性别为男时产出）
  if (intake.male && intake.gender === "male") {
    if (intake.male.emission) keys.add("sym_yijing");
    if (intake.male.premature) keys.add("sym_zaoxie");
    if (intake.male.nightUrine) keys.add("sym_urine_clear");
  }

  // 脉诊（业余/专家双模式）
  const p = intake.pulse;
  if (p.mode === "expert") {
    // 专家模式：脉象直接录入（19 脉）+ 三部九候矩阵
    // 脉率为客观计数，同样产出迟/数
    if (typeof p.rate === "number" && Number.isFinite(p.rate)) {
      if (p.rate < 60) keys.add("pulse_chi");
      else if (p.rate > 90) keys.add("pulse_shuo");
    }
    for (const k of p.pulse28 ?? []) {
      if (EXPERT_PULSE_KEYS.has(k)) keys.add(k);
    }
    const weakQualities = new Set(["pulse_ruo", "pulse_wei", "pulse_kou", "pulse_xu"]);
    const sideWeakCount: Record<string, number> = { 左: 0, 右: 0 };
    for (const pos of p.positions ?? []) {
      if (!pos.qualities.some((q) => weakQualities.has(q))) continue;
      if (pos.position === "寸") keys.add("pulse_cun_weak");
      if (pos.position === "关") keys.add("pulse_guan_weak");
      if (pos.position === "尺") keys.add("pulse_chi_weak");
      sideWeakCount[pos.side] += 1;
    }
    // 一侧两部以上偏弱 → 该手整体偏弱
    if (sideWeakCount["左"] >= 2) keys.add("pulse_left_weak");
    if (sideWeakCount["右"] >= 2) keys.add("pulse_right_weak");
  } else {
    // 业余模式（含无 mode 的旧数据）：质量控制先行
    // 测量 <30 秒或复测差异 >10 次/分 → 脉率不可信，不产迟/数体征
    const rateReliable =
      typeof p.rate === "number" &&
      Number.isFinite(p.rate) &&
      (p.measuredSeconds == null || p.measuredSeconds >= 30) &&
      (p.retestRate == null || Math.abs(p.retestRate - p.rate) <= 10);
    if (rateReliable && p.rate !== null) {
      if (p.rate < 60) keys.add("pulse_chi");
      else if (p.rate > 90) keys.add("pulse_shuo");
    }
    // 节律（有无停跳）较易自判，始终产出
    if (p.rhythm === "时有停跳") keys.add("pulse_jiedai");
    // 脉形粗判：自评"不确定"时不产体征（宁可少采，不可错采）
    if (p.confidence !== "不确定") {
      if (p.strength === "无力") keys.add("pulse_ruo");
      if (p.depth === "轻按即得") keys.add("pulse_fu");
      if (p.depth === "重按才得") keys.add("pulse_chen");
      if (p.width === "细如线") keys.add("pulse_xi");
      if (p.width === "宽大") keys.add("pulse_hua");
      if (p.width === "紧绷如弦") keys.add("pulse_xian");

      // 进阶脉诊自测（未填不产出；一律兼症级）
      if (p.strongerHand === "右手") keys.add("pulse_left_weak"); // 右强于左 → 左手偏弱
      if (p.strongerHand === "左手") keys.add("pulse_right_weak"); // 左强于右 → 右手偏弱
      if (p.weakestPosition === "寸") keys.add("pulse_cun_weak");
      if (p.weakestPosition === "关") keys.add("pulse_guan_weak");
      if (p.weakestPosition === "尺") keys.add("pulse_chi_weak");
    }
  }

  // 闻诊自评
  const l = intake.listening;
  if (l.voice === "低微") keys.add("listen_low_voice");
  if (l.voice === "嘶哑") keys.add("listen_hoarse");
  if (l.cough === "有") keys.add("sym_cough");
  if (l.breath === "口干口苦") keys.add("sym_bitter");
  if (l.breath === "口黏") keys.add("sym_sticky_mouth");
  if (l.breath === "口气重") keys.add("listen_breath_heavy");

  // 生活方式（key 与 life_* 体征一致，直接映射，兼症级）
  for (const k of intake.lifestyle ?? []) {
    if (SIGNS.some((s) => s.key === k)) keys.add(k);
  }

  return Array.from(keys);
}

/** 生成采集摘要文本（渠道备注/主诉注入用） */
export function intakeSummary(intake: IntakeForm): string {
  const parts: string[] = [];
  // 人口学信息
  const demo: string[] = [];
  if (intake.gender) demo.push(intake.gender === "male" ? "男" : "女");
  if (intake.ageGroup) demo.push(AGE_GROUP_LABELS[intake.ageGroup] ?? intake.ageGroup);
  if (demo.length > 0) parts.push(demo.join("，"));
  const complaints = intake.chiefComplaints
    .map((ck) => CHIEF_COMPLAINT_OPTIONS.find((o) => o.key === ck)?.label)
    .filter(Boolean);
  if (complaints.length > 0) parts.push(`主诉：${complaints.join("、")}`);
  if (intake.customComplaint) parts.push(`补充：${intake.customComplaint}`);
  const courseLabel = intake.course
    ? { "<1w": "不到 1 周", "1w-1m": "1 周~1 个月", "1m-6m": "1~6 个月", ">6m": "6 个月以上" }[
        intake.course
      ]
    : "";
  if (courseLabel) parts.push(`病程：${courseLabel}`);
  const pulseParts: string[] = [];
  if (intake.pulse.rate) pulseParts.push(`脉率 ${intake.pulse.rate} 次/分`);
  for (const v of [intake.pulse.strength, intake.pulse.depth, intake.pulse.width, intake.pulse.rhythm]) {
    if (v) pulseParts.push(v);
  }
  if (intake.pulse.strongerHand && intake.pulse.strongerHand !== "双手相近") {
    pulseParts.push(`${intake.pulse.strongerHand}偏有力`);
  }
  if (intake.pulse.weakestPosition && intake.pulse.weakestPosition !== "三部均匀") {
    pulseParts.push(`${intake.pulse.weakestPosition}部偏弱`);
  }
  if (pulseParts.length > 0) parts.push(`脉象自测：${pulseParts.join("，")}`);
  // 既往史 / 用药 / 生活方式 / 体检（禁忌校验与健康提示的依据，写入渠道备注备查）
  const historyLabels = (intake.history ?? [])
    .map((h) => HISTORY_OPTIONS.find((o) => o.key === h)?.label)
    .filter(Boolean);
  if (historyLabels.length > 0) parts.push(`慢性病史：${historyLabels.join("、")}`);
  if (intake.medications) parts.push(`在服药物：${intake.medications}`);
  const lifestyleLabels = (intake.lifestyle ?? [])
    .map((k) => LIFESTYLE_OPTIONS.find((o) => o.key === k)?.label)
    .filter(Boolean);
  if (lifestyleLabels.length > 0) parts.push(`生活方式：${lifestyleLabels.join("、")}`);
  const checkupLabels = (intake.checkup ?? [])
    .map((k) => CHECKUP_OPTIONS.find((o) => o.key === k)?.label)
    .filter(Boolean);
  if (checkupLabels.length > 0) parts.push(`体检异常：${checkupLabels.join("、")}`);
  return parts.join("；");
}

// ------------------------------------------------------------------
// 四诊合参：渠道→体征类别映射、信息矛盾检测、舌面诊结构化映射
// ------------------------------------------------------------------

/** 渠道可产出的体征类别（覆盖率感知归一与互证统计的依据） */
export const CHANNEL_CATEGORIES: Record<string, Sign["category"][]> = {
  intake: ["symptom", "pulse", "listening"],
  chat: ["symptom"],
  tongue: ["tongue"],
  face: ["face"],
  questionnaire: [],
};

/**
 * 信息矛盾点检测（四诊合参的冲突处理：不做默默平均，显式提示待澄清）。
 * 规则分两类：体征之间的直接矛盾（如畏寒与舌红并见）、
 * 体质判定与舌面象的矛盾（问卷平和但舌象提示偏颇）。
 */
export function detectConflicts(input: {
  signKeys: string[];
  isBalanced?: boolean;
}): string[] {
  const has = (k: string) => input.signKeys.includes(k);
  const conflicts: string[] = [];
  const pairs: [string, string, string][] = [
    [
      "sym_cold",
      "tongue_red",
      "自述畏寒怕冷，但舌色偏红——寒热信息不一致，需甄别真寒假热或寒热错杂，建议补充问诊核实",
    ],
    [
      "sym_cold",
      "coating_less",
      "自述畏寒怕冷，但舌象少苔/无苔——一主寒一主阴虚内热，信息矛盾，建议复核舌照并结合脉诊",
    ],
    [
      "sym_constipation",
      "sym_diarrhea",
      "便秘与便溏并见——可能为不同时期的表述，建议补充说明当前主要的排便情况",
    ],
    [
      "sym_no_thirst",
      "sym_thirst_cold_drink",
      "口淡不渴与口渴喜冷饮并见——口渴信息自相矛盾，建议核实",
    ],
    [
      "coating_thin_white",
      "coating_thick_greasy",
      "舌苔薄白与厚腻并见——可能为图像识别误差或多次拍摄结果不一致，建议复核舌照",
    ],
    // 脉症从舍：客观脉率与自述症状相悖时提示（脉诊为四诊之眼目，尤宜斟酌）
    [
      "pulse_chi",
      "sym_heat",
      "脉率偏慢（迟脉主寒），而自述五心烦热——脉症不符，寒热真假须斟酌从舍，建议结合舌象与补充问诊甄别",
    ],
    [
      "pulse_shuo",
      "sym_cold",
      "脉率偏快（数脉主热），而自述畏寒怕冷——脉症不符，需甄别真热假寒或寒热错杂，建议结合舌象与补充问诊核实",
    ],
  ];
  for (const [a, b, msg] of pairs) {
    if (has(a) && has(b)) conflicts.push(msg);
  }
  if (input.isBalanced) {
    const bias = ["coating_thick_greasy", "tongue_purple", "tongue_pale", "coating_yellow"].filter(
      has
    );
    if (bias.length > 0) {
      conflicts.push(
        `体质问卷判定为平和质，但舌/面象提示${bias
          .map(signLabel)
          .join("、")}——问卷反映长期体质，舌面象反映当下状态，两者不一致时建议以医师面诊复核为准`
      );
    }
  }
  return conflicts;
}

/**
 * 舌面诊结构化输出 → 体征 key 的确定性映射。
 * 多模态模型按固定枚举字段输出（见 llm/client.ts 的 VISION_PROMPTS），
 * 本函数直接映射，取代自由文本关键词反推；调用方在解析失败时
 * 回退到 matchSignsFromText。
 */
export function visionFindingsToSigns(
  mode: "tongue" | "face",
  findings: Record<string, unknown>
): string[] {
  const keys = new Set<string>();
  const text = (v: unknown): string =>
    Array.isArray(v) ? v.map(String).join(" ") : typeof v === "string" ? v : "";

  if (mode === "tongue") {
    const color = text(findings["舌色"]);
    if (color.includes("淡白")) keys.add("tongue_pale");
    else if (color.includes("紫")) keys.add("tongue_purple");
    else if (color.includes("绛") || (color.includes("红") && !color.includes("淡红")))
      keys.add("tongue_red");
    const shape = text(findings["舌形"]);
    if (shape.includes("胖") || shape.includes("齿痕")) keys.add("tongue_fat_teeth");
    if (shape.includes("裂纹")) keys.add("tongue_crack");
    const coatColor = text(findings["苔色"]);
    const coatQuality = text(findings["苔质"]);
    if (coatColor.includes("黄")) keys.add("coating_yellow");
    // 厚/腻与薄白互斥：有厚或腻则不判薄白，避免自相矛盾
    if (coatQuality.includes("厚") || coatQuality.includes("腻")) {
      keys.add("coating_thick_greasy");
    } else if (coatQuality.includes("薄")) {
      keys.add("coating_thin_white");
    }
    if (/(剥|少苔|无苔)/.test(coatQuality)) keys.add("coating_less");
  } else {
    const color = text(findings["面色"]);
    if (/(晄白|㿠白|苍白|淡白)/.test(color)) keys.add("face_pale");
    else if (color.includes("潮红") || color.includes("颧红")) keys.add("face_red");
    else if (/(晦|黯|暗|青紫)/.test(color)) keys.add("face_dark");
    else if (color.includes("黄")) keys.add("face_yellow");
    else if (color.includes("红润")) keys.add("face_lustrous");
    const oil = text(findings["油脂"]);
    if (oil && !oil.includes("正常") && !oil.includes("少")) keys.add("face_oily");
    if (text(findings["痤疮"]).includes("有")) keys.add("face_acne");
    if (text(findings["浮肿"]).includes("有")) keys.add("face_edema");
    if (text(findings["黑眼圈"]).includes("有")) keys.add("face_dark_circles");
    const lip = text(findings["唇色"]);
    if (lip.includes("淡白")) keys.add("face_pale");
    else if (lip.includes("紫")) keys.add("face_dark");
    else if (lip.includes("红赤")) keys.add("face_red");
  }
  return Array.from(keys);
}

// ------------------------------------------------------------------
// 禁忌交叉校验（把方剂静态禁忌文本变为与用户条件的自动匹配）
// ------------------------------------------------------------------

export interface ContraWarning {
  formulaKey: string;
  formulaName: string;
  /** 命中的用户条件（中文标签） */
  conditions: string[];
  /** 原方禁忌说明（摘自知识库 cautions） */
  cautions: string;
}

/**
 * 禁忌交叉校验：由既往史、在服药物、年龄段、当前体征构建用户条件集，
 * 与各方剂的 CONTRA_TAGS 求交集，命中即出具警示。
 * 这是安全底线：禁忌不再只是印在卡片上的静态文字。
 */
export function checkContraindications(input: {
  formulaKeys: string[];
  /** 慢性病史 key（intake.ts HISTORY_OPTIONS） */
  history?: string[];
  /** 长期服药自由文本 */
  medications?: string;
  ageGroup?: string;
  signKeys?: string[];
}): ContraWarning[] {
  const conditions = new Set<string>();
  for (const h of input.history ?? []) {
    if (h === "hypertension") conditions.add("高血压");
    if (h === "heart") conditions.add("心脑血管疾病");
    if (h === "stomach") conditions.add("消化道溃疡");
  }
  const meds = input.medications ?? "";
  if (/华法林|阿司匹林|氯吡格雷|抗凝|抗血小板/.test(meds)) {
    conditions.add("正在服用抗凝/抗血小板药物");
  }
  if (/降压/.test(meds)) conditions.add("高血压");
  if (input.ageGroup === "<18") conditions.add("儿童");
  if (input.ageGroup === ">60") conditions.add("老年");
  const keys = input.signKeys ?? [];
  if (keys.includes("sym_fever")) conditions.add("感冒发热");
  if (keys.includes("sym_diarrhea")) conditions.add("便溏");
  if (keys.includes("sym_heat") || keys.includes("sym_night_sweat")) conditions.add("阴虚内热");

  const warnings: ContraWarning[] = [];
  for (const fk of input.formulaKeys) {
    const tags = CONTRA_TAGS[fk];
    const formula = FORMULAS[fk];
    if (!tags || !formula) continue;
    const hit = tags.filter((t) => conditions.has(t));
    if (hit.length > 0) {
      warnings.push({
        formulaKey: fk,
        formulaName: formula.name,
        conditions: hit,
        cautions: formula.cautions,
      });
    }
  }
  return warnings;
}

// ------------------------------------------------------------------
// 体检指标健康提示（「体病相关」：不参与辨证评分，只出具提示）
// ------------------------------------------------------------------

/** 体检异常 → 健康提示（方药调理不替代相应疾病的规范治疗） */
export function buildCheckupAdvisories(checkup: string[]): string[] {
  const map: Record<string, string> = {
    blood_lipid:
      "血脂异常：痰湿/湿热内盛状态与脂代谢异常常相伴（所谓「血浊」），在饮食运动调摄基础上建议定期复查血脂；调脂治疗请遵医嘱，本报告的方药食疗不能替代。",
    blood_sugar:
      "血糖偏高：建议定期监测空腹及餐后血糖；气阴两虚、痰湿体质与糖代谢异常相关，饮食有节、起居有常之外，降糖治疗请遵医嘱。",
    uric_acid:
      "尿酸偏高：湿热内蕴者多见，建议多饮水、低嘌呤饮食（少动物内脏、海鲜、浓汤、酒类），定期复查尿酸；痛风发作请就医。",
    overweight:
      "体重超标（BMI ≥ 24）：「肥人多痰湿」，建议结合导引运动循序渐进减重，每周减重以 0.5kg 左右为宜，切忌骤减。",
  };
  return checkup.map((k) => map[k]).filter((s): s is string => Boolean(s));
}
