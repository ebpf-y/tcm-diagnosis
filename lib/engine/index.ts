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
import { DIET_THERAPIES, type DietTherapy } from "@/lib/tcm/diet-therapy";
import { CHIEF_COMPLAINT_OPTIONS, AGE_GROUP_LABELS, type IntakeForm } from "@/lib/tcm/intake";

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
}

function roleOf(weight: number): PatternHitRole {
  if (weight >= 3) return "主症";
  if (weight === 2) return "舌脉";
  return "兼症";
}

/** 每个证候的理论满分：所有映射到它的体征权重之和 */
function patternPotentials(): Record<PatternId, number> {
  const potentials = Object.fromEntries(PATTERN_IDS.map((id) => [id, 0])) as Record<
    PatternId,
    number
  >;
  for (const sign of SIGNS) {
    if (!sign.patterns) continue;
    for (const [pid, w] of Object.entries(sign.patterns)) {
      potentials[pid as PatternId] += w ?? 0;
    }
  }
  return potentials;
}

/**
 * 证候辨证评分：按体征的证候权重（主症 3 / 舌脉 2 / 兼症 1）加权汇总，
 * 以各证候理论满分归一。排序规则：有主症级命中的证候在前（辨证立证
 * 须有主症支持），同级按归一分降序。返回有命中的证候及命中明细。
 */
export function scorePatterns(signKeys: string[]): PatternHit[] {
  const raws = Object.fromEntries(PATTERN_IDS.map((id) => [id, 0])) as Record<PatternId, number>;
  const hitMap = new Map<PatternId, PatternHitDetail[]>();
  for (const key of signKeys) {
    const sign = SIGNS.find((s) => s.key === key);
    if (!sign?.patterns) continue;
    for (const [pid, w] of Object.entries(sign.patterns)) {
      const id = pid as PatternId;
      const weight = w ?? 0;
      if (weight <= 0) continue;
      raws[id] += weight;
      const list = hitMap.get(id) ?? [];
      list.push({ signKey: sign.key, signLabel: sign.label, weight, role: roleOf(weight) });
      hitMap.set(id, list);
    }
  }
  const potentials = patternPotentials();
  return PATTERN_IDS.filter((id) => raws[id] > 0)
    .map((id) => {
      const hits = (hitMap.get(id) ?? []).sort((a, b) => b.weight - a.weight);
      return {
        id,
        name: PATTERNS[id].name,
        category: PATTERNS[id].category,
        raw: raws[id],
        score:
          potentials[id] > 0 ? Math.round((raws[id] / potentials[id]) * 1000) / 10 : 0,
        hasChiefHit: hits.some((h) => h.role === "主症"),
        hits,
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

export interface TreatmentPlan {
  /** 证候完整信息（含病机、治则、舌脉等） */
  pattern: Pattern;
  /** 关联经典方剂 */
  formulas: Formula[];
  /** 关联食疗方 */
  dietTherapies: DietTherapy[];
  /** 保健方案（穴位/导引/起居） */
  wellness: Pattern["wellness"];
  /** 调理顺序（主证 + 兼证的分步调理思路） */
  sequencing: SequencingStep[];
}

/** 从知识库组装某证候的完整调理方案 */
export function buildTreatmentPlan(
  patternId: PatternId,
  secondaryIds: PatternId[] = []
): TreatmentPlan | null {
  const pattern = PATTERNS[patternId];
  if (!pattern) return null;
  return {
    pattern,
    formulas: pattern.formulaKeys
      .map((k) => FORMULAS[k])
      .filter((f): f is Formula => Boolean(f)),
    dietTherapies: pattern.dietKeys
      .map((k) => DIET_THERAPIES[k])
      .filter((d): d is DietTherapy => Boolean(d)),
    wellness: pattern.wellness,
    sequencing: buildSequencing(patternId, secondaryIds),
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

  // 脉诊自测
  const p = intake.pulse;
  if (typeof p.rate === "number" && Number.isFinite(p.rate)) {
    if (p.rate < 60) keys.add("pulse_chi");
    else if (p.rate > 90) keys.add("pulse_shuo");
  }
  if (p.strength === "无力") keys.add("pulse_ruo");
  if (p.depth === "轻按即得") keys.add("pulse_fu");
  if (p.depth === "重按才得") keys.add("pulse_chen");
  if (p.width === "细如线") keys.add("pulse_xi");
  if (p.width === "宽大") keys.add("pulse_hua");
  if (p.width === "紧绷如弦") keys.add("pulse_xian");
  if (p.rhythm === "时有停跳") keys.add("pulse_jiedai");

  // 进阶脉诊自测（未填不产出；一律兼症级）
  if (p.strongerHand === "右手") keys.add("pulse_left_weak"); // 右强于左 → 左手偏弱
  if (p.strongerHand === "左手") keys.add("pulse_right_weak"); // 左强于右 → 右手偏弱
  if (p.weakestPosition === "寸") keys.add("pulse_cun_weak");
  if (p.weakestPosition === "关") keys.add("pulse_guan_weak");
  if (p.weakestPosition === "尺") keys.add("pulse_chi_weak");

  // 闻诊自评
  const l = intake.listening;
  if (l.voice === "低微") keys.add("listen_low_voice");
  if (l.voice === "嘶哑") keys.add("listen_hoarse");
  if (l.cough === "有") keys.add("sym_cough");
  if (l.breath === "口干口苦") keys.add("sym_bitter");
  if (l.breath === "口黏") keys.add("sym_sticky_mouth");
  if (l.breath === "口气重") keys.add("listen_breath_heavy");

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
  return parts.join("；");
}
