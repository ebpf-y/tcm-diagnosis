/**
 * 舌象 / 面象 / 自述症状 → 体质提示 映射表
 *
 * 舌诊、面诊（多模态 LLM 输出结构化特征）与对话问诊（关键词提取）
 * 三路非量表渠道共用的"体征提示"知识库。
 * 每个体征给出对九种体质的加分权重（0~3），由规则引擎汇总归一。
 */

import type { ConstitutionId } from "./constitutions";

export interface Sign {
  /** 体征标识 */
  key: string;
  /** 体征名称（展示用） */
  label: string;
  /** 类别：舌象 / 面象 / 症状自述 */
  category: "tongue" | "face" | "symptom";
  /** 用于对话/图像文本匹配的关键词 */
  keywords: string[];
  /** 对各体质的提示权重 */
  weights: Partial<Record<ConstitutionId, number>>;
}

export const SIGNS: Sign[] = [
  // ---------- 舌象 ----------
  {
    key: "tongue_pale",
    label: "舌色淡白",
    category: "tongue",
    keywords: ["舌色淡白", "舌淡", "淡白舌"],
    weights: { yangxu: 3, qixu: 2 },
  },
  {
    key: "tongue_red",
    label: "舌色红",
    category: "tongue",
    keywords: ["舌色红", "舌红", "红舌"],
    weights: { yinxu: 2, shire: 2 },
  },
  {
    key: "tongue_purple",
    label: "舌质紫黯或有瘀点",
    category: "tongue",
    keywords: ["舌紫", "紫黯", "瘀点", "瘀斑舌", "舌质暗"],
    weights: { xueyu: 3 },
  },
  {
    key: "tongue_fat_teeth",
    label: "舌体胖大、边有齿痕",
    category: "tongue",
    keywords: ["齿痕", "胖大", "舌体胖"],
    weights: { tanshi: 2, yangxu: 2, qixu: 1 },
  },
  {
    key: "tongue_crack",
    label: "舌面有裂纹",
    category: "tongue",
    keywords: ["裂纹"],
    weights: { yinxu: 2 },
  },
  {
    key: "coating_thick_greasy",
    label: "舌苔厚腻",
    category: "tongue",
    keywords: ["苔厚腻", "苔厚", "厚腻"],
    weights: { tanshi: 3, shire: 1 },
  },
  {
    key: "coating_yellow",
    label: "舌苔黄",
    category: "tongue",
    keywords: ["苔黄", "黄苔"],
    weights: { shire: 3 },
  },
  {
    key: "coating_thin_white",
    label: "舌苔薄白",
    category: "tongue",
    keywords: ["薄白", "苔薄白"],
    weights: { pinghe: 2 },
  },
  {
    key: "coating_less",
    label: "少苔或无苔",
    category: "tongue",
    keywords: ["少苔", "无苔", "剥苔", "镜面舌"],
    weights: { yinxu: 3 },
  },
  // ---------- 面象 ----------
  {
    key: "face_pale",
    label: "面色苍白或㿠白",
    category: "face",
    keywords: ["面色苍白", "面色白", "㿠白", "面色淡白"],
    weights: { yangxu: 2, qixu: 2 },
  },
  {
    key: "face_red",
    label: "面色潮红或两颧发红",
    category: "face",
    keywords: ["面色潮红", "两颧红", "颧红", "面色红"],
    weights: { yinxu: 2, shire: 1 },
  },
  {
    key: "face_dark",
    label: "面色晦黯或有褐斑",
    category: "face",
    keywords: ["面色晦", "晦暗", "褐斑", "色斑", "面色暗"],
    weights: { xueyu: 3 },
  },
  {
    key: "face_oily",
    label: "面部油光",
    category: "face",
    keywords: ["油光", "油腻", "油脂多"],
    weights: { shire: 2, tanshi: 2 },
  },
  {
    key: "face_acne",
    label: "面部痤疮明显",
    category: "face",
    keywords: ["痤疮", "痘痘", "粉刺"],
    weights: { shire: 3 },
  },
  {
    key: "face_edema",
    label: "眼睑或面部浮肿",
    category: "face",
    keywords: ["浮肿", "眼睑肿", "水肿"],
    weights: { tanshi: 2, yangxu: 2 },
  },
  {
    key: "face_dark_circles",
    label: "黑眼圈明显",
    category: "face",
    keywords: ["黑眼圈"],
    weights: { xueyu: 2, yinxu: 1 },
  },
  {
    key: "face_lustrous",
    label: "面色红润有光泽",
    category: "face",
    keywords: ["面色红润", "有光泽", "面色润泽"],
    weights: { pinghe: 3 },
  },
  // ---------- 症状自述（对话问诊关键词提取用） ----------
  {
    key: "sym_fatigue",
    label: "疲乏无力",
    category: "symptom",
    keywords: ["疲乏", "疲劳", "乏力", "没力气", "容易累"],
    weights: { qixu: 3, yangxu: 1 },
  },
  {
    key: "sym_cold",
    label: "畏寒怕冷",
    category: "symptom",
    keywords: ["怕冷", "畏寒", "手脚凉", "手脚冰凉", "手脚发凉"],
    weights: { yangxu: 3 },
  },
  {
    key: "sym_heat",
    label: "五心烦热/潮热",
    category: "symptom",
    keywords: ["手脚心热", "手心热", "潮热", "烦热"],
    weights: { yinxu: 3 },
  },
  {
    key: "sym_dry",
    label: "口干咽燥",
    category: "symptom",
    keywords: ["口干", "咽干", "口燥", "想喝水"],
    weights: { yinxu: 2, shire: 1 },
  },
  {
    key: "sym_sweat",
    label: "自汗/易出汗",
    category: "symptom",
    keywords: ["自汗", "出虚汗", "容易出汗", "爱出汗"],
    weights: { qixu: 2, yangxu: 1 },
  },
  {
    key: "sym_phlegm",
    label: "痰多胸闷",
    category: "symptom",
    keywords: ["痰多", "有痰", "胸闷", "身体沉重", "困倦"],
    weights: { tanshi: 3 },
  },
  {
    key: "sym_bitter",
    label: "口苦口臭",
    category: "symptom",
    keywords: ["口苦", "口臭", "嘴里有异味", "异味"],
    weights: { shire: 3 },
  },
  {
    key: "sym_pain",
    label: "固定部位疼痛",
    category: "symptom",
    keywords: ["疼痛", "刺痛", "瘀斑"],
    weights: { xueyu: 2 },
  },
  {
    key: "sym_mood",
    label: "情绪低落/焦虑",
    category: "symptom",
    keywords: ["闷闷不乐", "抑郁", "焦虑", "紧张", "叹气", "心烦", "烦躁"],
    weights: { qiyu: 3 },
  },
  {
    key: "sym_allergy",
    label: "易过敏",
    category: "symptom",
    keywords: ["过敏", "打喷嚏", "荨麻疹", "鼻炎"],
    weights: { tebing: 3 },
  },
  {
    key: "sym_insomnia",
    label: "失眠多梦",
    category: "symptom",
    keywords: ["失眠", "睡不着", "多梦", "睡眠不好"],
    weights: { yinxu: 2, qiyu: 2, qixu: 1 },
  },
  {
    key: "sym_constipation",
    label: "大便干燥/便秘",
    category: "symptom",
    keywords: ["便秘", "大便干", "大便干燥"],
    weights: { yinxu: 2, shire: 1 },
  },
  {
    key: "sym_diarrhea",
    label: "吃凉易腹泻",
    category: "symptom",
    keywords: ["腹泻", "拉肚子", "便溏"],
    weights: { yangxu: 2, qixu: 1 },
  },
];
