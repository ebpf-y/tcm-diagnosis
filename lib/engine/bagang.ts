/**
 * 八纲判定层：证候评分之上的一级归纳（纯函数，无 IO）
 *
 * 中医辨证首定八纲——表里定病位、寒热定病性、虚实定邪正盛衰，
 * 证候辨证在其约束下进行。本模块从体征 key 推导八纲结论：
 *
 * - 表里：表证体征（发热/无汗/鼻塞/咽痛/浮脉/紧脉）与半表半里体征
 *   （往来寒热）优先；均缺而里证体征充分 → 里证；
 * - 寒热：寒象体征与热象体征分别计数，按优势比判定偏寒/偏热/错杂；
 * - 虚实：虚象（气虚/血虚/阴虚/阳虚指征）与实象（实邪/郁火指征）计数。
 *
 * 另提供 calibrateByNature：寒热判定 decisive 时，对相反病性证候的
 * 归一分做温和降权（×0.85），防止寒证用户被虚火方反超、热证用户
 * 被温阳方反超——校正幅度刻意保守，且只作用于「结论性报告」这一出口。
 */

import type { PatternId } from "@/lib/tcm/patterns";
import type { PatternHit } from "./index";

/** 表证体征（邪在肌表） */
const BIAO_SIGNS = new Set([
  "sym_fever",
  "sym_no_sweat",
  "sym_runny_nose",
  "sym_sore_throat",
  "pulse_fu",
  "pulse_jin",
]);

/** 半表半里体征（少阳枢机） */
const SHAOYANG_SIGNS = new Set(["sym_alternating"]);

/** 里证体征（脏腑气血津液证候的代表性指征，仅用于「无表证时的里证推断」） */
const LI_SIGNS = new Set([
  "sym_appetite", "sym_bloating", "sym_diarrhea", "sym_constipation",
  "sym_stool_sticky", "sym_stuffiness", "sym_nausea", "sym_borborygmus",
  "sym_lowerback", "sym_palpitation", "sym_insomnia", "sym_hypochondriac",
  "sym_pain", "sym_phlegm", "sym_bitter", "sym_sticky_mouth",
  "sym_urine_yellow", "sym_urine_clear", "sym_urine_difficult",
  "sym_dawn_diarrhea", "sym_menses_light", "sym_dysmenorrhea",
  "tongue_red", "tongue_pale", "tongue_purple", "tongue_fat_teeth",
  "tongue_crack", "coating_yellow", "coating_thick_greasy", "coating_less",
]);

/** 寒象体征 */
const COLD_SIGNS = new Set([
  "sym_cold", "sym_no_thirst", "tongue_pale", "coating_thin_white",
  "pulse_chi", "pulse_jin", "pulse_chen",
]);

/** 热象体征 */
const HEAT_SIGNS = new Set([
  "sym_heat", "sym_night_sweat", "sym_fever", "sym_thirst_cold_drink",
  "sym_bitter", "sym_urine_yellow", "sym_stomach_burning",
  "tongue_red", "coating_yellow", "coating_less",
  "face_red", "pulse_shuo",
]);

/** 虚象体征（气血阴阳亏虚指征） */
const DEFICIENCY_SIGNS = new Set([
  "sym_fatigue", "sym_sweat", "sym_night_sweat", "sym_no_thirst",
  "sym_low_voice", "sym_short_breath", "sym_catch_cold", "sym_dizzy",
  "sym_palpitation", "sym_forgetful", "sym_numbness", "sym_eye_dry",
  "sym_lowerback", "sym_urine_clear", "sym_dawn_diarrhea",
  "sym_menses_light", "sym_cold",
  "tongue_pale", "tongue_crack", "coating_less",
  "face_pale", "face_yellow", "listen_low_voice",
  "pulse_chi", "pulse_ruo", "pulse_wei", "pulse_xu", "pulse_xi",
]);

/** 实象体征（六淫/痰湿/郁火/瘀血指征） */
const EXCESS_SIGNS = new Set([
  "sym_fever", "sym_no_sweat", "sym_thirst_cold_drink", "sym_bitter",
  "sym_sticky_mouth", "sym_stool_sticky", "sym_urine_yellow",
  "sym_headache", "sym_pain", "sym_hypochondriac", "sym_phlegm",
  "sym_head_heavy", "sym_stuffiness", "sym_nausea", "sym_borborygmus",
  "sym_mood", "sym_irritable", "sym_sighing", "sym_alternating",
  "face_red", "face_dark", "face_acne", "face_oily",
  "tongue_red", "tongue_purple", "coating_yellow", "coating_thick_greasy",
  "pulse_fu", "pulse_jin", "pulse_shuo", "pulse_hua", "pulse_shi",
  "pulse_hong", "pulse_se", "pulse_xian",
]);

export interface BagangVerdict {
  value: string;
  hits: string[];
}

export interface EightPrinciples {
  /** 表里（病位） */
  biaoli: BagangVerdict;
  /** 寒热（病性） */
  hanre: BagangVerdict & { cold: string[]; heat: string[] };
  /** 虚实（邪正盛衰） */
  xushi: BagangVerdict & { deficiency: string[]; excess: string[] };
  /** 一句话归纳（报告展示用） */
  summary: string;
}

function intersect(signKeys: string[], set: Set<string>): string[] {
  return signKeys.filter((k) => set.has(k));
}

/** 优势比判定：一方 ≥2 且 ≥ 另一方 2 倍 → 该方胜；双方 ≥2 → 错杂/夹杂 */
function dominant(
  a: string[],
  b: string[],
  aWin: string,
  bWin: string,
  mixed: string,
  even: string
): { value: string; a: string[]; b: string[] } {
  if (a.length >= 2 && a.length >= b.length * 2) return { value: aWin, a, b };
  if (b.length >= 2 && b.length >= a.length * 2) return { value: bWin, a, b };
  if (a.length >= 2 && b.length >= 2) return { value: mixed, a, b };
  if (a.length > b.length) return { value: aWin, a, b };
  if (b.length > a.length) return { value: bWin, a, b };
  if (a.length === 1) return { value: aWin, a, b };
  return { value: even, a, b };
}

/** 由体征推导八纲结论（纯函数） */
export function deriveEightPrinciples(signKeys: string[]): EightPrinciples {
  const biao = intersect(signKeys, BIAO_SIGNS);
  const shaoyang = intersect(signKeys, SHAOYANG_SIGNS);
  const li = intersect(signKeys, LI_SIGNS);

  let biaoli: BagangVerdict;
  if (shaoyang.length > 0 && biao.length >= 2) {
    biaoli = { value: "表里同病（少阳兼表）", hits: [...shaoyang, ...biao] };
  } else if (shaoyang.length > 0) {
    biaoli = { value: "半表半里", hits: shaoyang };
  } else if (biao.length >= 2) {
    biaoli = { value: "表证", hits: biao };
  } else if (biao.length === 1 && li.length >= 2) {
    biaoli = { value: "表里同病", hits: [...biao, ...li] };
  } else if (biao.length === 1) {
    biaoli = { value: "表证（证据单薄）", hits: biao };
  } else if (li.length >= 2) {
    biaoli = { value: "里证", hits: li };
  } else {
    biaoli = { value: "证据不足", hits: [] };
  }

  const cold = intersect(signKeys, COLD_SIGNS);
  const heat = intersect(signKeys, HEAT_SIGNS);
  const han = dominant(cold, heat, "偏寒", "偏热", "寒热错杂", "寒热不显");

  const def = intersect(signKeys, DEFICIENCY_SIGNS);
  const exc = intersect(signKeys, EXCESS_SIGNS);
  const xs = dominant(def, exc, "偏虚", "偏实", "虚实夹杂", "虚实不显");

  const summary = `八纲归纳：${biaoli.value}、${han.value}、${xs.value}。`;

  return {
    biaoli,
    hanre: { value: han.value, cold: han.a, heat: han.b, hits: [...han.a, ...han.b] },
    xushi: { value: xs.value, deficiency: xs.a, excess: xs.b, hits: [...xs.a, ...xs.b] },
    summary,
  };
}

// ------------------------------------------------------------------
// 病性校正：寒热 decisive 时对相反病性证候温和降权
// ------------------------------------------------------------------

/** 证候病性归类（仅列寒热两端；未列者视为平性，不参与校正） */
export const PATTERN_NATURE: Partial<Record<PatternId, "寒" | "热" | "寒热错杂">> = {
  piyangxu: "寒",
  shenyangxu: "寒",
  fenghan_shubiao: "寒",
  fengshi_shubiao: "寒",
  shenyinxu: "热",
  ganhuo_shangyan: "热",
  shire_yunpi: "热",
  weiyinxu: "热",
  xinshen_bujiao: "热",
  fengre_fanbiao: "热",
  hanre_cuoza: "寒热错杂",
};

/** 校正系数（刻意保守：只压低 15%，避免翻转有主症支撑的判定） */
const NATURE_DAMP_FACTOR = 0.85;

/**
 * 寒热校正：八纲寒热判定 decisive（偏寒/偏热，非错杂）时，
 * 对相反病性证候的归一分 ×0.85 并重排序（返回新数组，不改原对象）。
 */
export function calibrateByNature(
  hits: PatternHit[],
  ep: EightPrinciples
): PatternHit[] {
  if (ep.hanre.value !== "偏寒" && ep.hanre.value !== "偏热") return hits;
  const opposed: Record<string, boolean> =
    ep.hanre.value === "偏寒" ? { 热: true } : { 寒: true };
  const calibrated = hits.map((h) => {
    const nature = PATTERN_NATURE[h.id];
    if (!nature || nature === "寒热错杂" || !opposed[nature]) return h;
    return {
      ...h,
      score: Math.round(h.score * NATURE_DAMP_FACTOR * 10) / 10,
      hits: h.hits,
    };
  });
  return calibrated.sort(
    (a, b) =>
      Number(b.hasChiefHit) - Number(a.hasChiefHit) || b.score - a.score || b.raw - a.raw
  );
}
