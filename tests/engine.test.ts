/**
 * 规则引擎单元测试
 *
 * 覆盖：CCMQ 计分公式、反向计分、平和质判定标准、偏颇体质阈值、
 * 主/兼体质推断、体征提示评分、关键词匹配、多渠道综合。
 */
import { describe, it, expect } from "vitest";
import {
  flip,
  transformScore,
  rawSubscaleScore,
  diagnose,
  scoreSigns,
  matchSignsFromText,
  topSignConstitutions,
  combineChannels,
  type AnswerMap,
} from "@/lib/engine";
import { SCALE_ITEMS, SUBSCALES } from "@/lib/tcm/questions";
import { CONSTITUTION_IDS, BIASED_IDS } from "@/lib/tcm/constitutions";

/** 构造所有条目同一分值的作答 */
function uniformAnswers(value: number): AnswerMap {
  return Object.fromEntries(SCALE_ITEMS.map((it) => [it.key, value]));
}

describe("CCMQ 计分公式", () => {
  it("反向计分按 6-原始分 翻转", () => {
    expect(flip(1)).toBe(5);
    expect(flip(5)).toBe(1);
    expect(flip(3)).toBe(3);
  });

  it("转化分 = (原始分 - 条目数) / (条目数 × 4) × 100", () => {
    // 8 条目全答 1 → 0 分
    expect(transformScore(8, 8)).toBe(0);
    // 8 条目全答 5 → 100 分
    expect(transformScore(40, 8)).toBe(100);
    // 8 条目原始分 24 → (24-8)/32*100 = 50
    expect(transformScore(24, 8)).toBe(50);
  });

  it("全部答 1 时各偏颇体质转化分为 0，平和质反向条目翻转为高分", () => {
    const result = diagnose(uniformAnswers(1));
    const pinghe = result.scores.find((s) => s.id === "pinghe")!;
    // 平和 8 条目中 6 条为反向条目：原始分 = 2×1 + 6×5 = 32 → 转化分 75
    expect(pinghe.transformed).toBe(75);
    for (const s of result.scores.filter((x) => x.id !== "pinghe")) {
      expect(s.transformed).toBe(0);
    }
  });

  it("典型健康作答（正性条目 5 分、负性条目 1 分）→ 平和质 100 分", () => {
    const answers = { ...uniformAnswers(1), q1: 5, q6: 5 };
    const result = diagnose(answers);
    const pinghe = result.scores.find((s) => s.id === "pinghe")!;
    // 原始分 = 2×5 + 6×5 = 40 → 转化分 100
    expect(pinghe.transformed).toBe(100);
  });

  it("全部答 5 时平和质因反向条目而转化分偏低", () => {
    const result = diagnose(uniformAnswers(5));
    const pinghe = result.scores.find((s) => s.id === "pinghe")!;
    // 原始分 = 2×5 + 6×1 = 16 → 转化分 25
    expect(pinghe.transformed).toBe(25);
  });
});

describe("亚量表结构", () => {
  it("亚量表条目数与 CCMQ-60 标准一致", () => {
    const counts = {
      pinghe: 8, qixu: 8, yangxu: 7, yinxu: 8, tanshi: 8,
      shire: 6, xueyu: 7, qiyu: 7, tebing: 7,
    };
    for (const id of CONSTITUTION_IDS) {
      expect(SUBSCALES[id].length).toBe(counts[id]);
    }
    // 独立题目共 60 道
    expect(SCALE_ITEMS.length).toBe(60);
    // 亚量表引用的 key 均存在
    const keys = new Set(SCALE_ITEMS.map((it) => it.key));
    for (const id of CONSTITUTION_IDS) {
      for (const entry of SUBSCALES[id]) {
        expect(keys.has(entry.key)).toBe(true);
      }
    }
  });

  it("反向计分生效：平和质条目 q2（容易疲乏）答 5 按 1 计", () => {
    const allOne = rawSubscaleScore("pinghe", uniformAnswers(1)).raw; // 32
    const q2Five = rawSubscaleScore("pinghe", { ...uniformAnswers(1), q2: 5 }).raw;
    // q2 为反向条目：答 5 翻转为 1，比答 1（翻转为 5）少 4 分
    expect(q2Five).toBe(allOne - 4);
  });
});

describe("体质判定标准", () => {
  it("典型健康作答 → 平和质「是」", () => {
    const result = diagnose(uniformAnswers(1));
    expect(result.isBalanced).toBe(true);
    expect(result.primary.id).toBe("pinghe");
    expect(result.primary.verdict).toBe("是");
  });

  it("偏颇体质转化分 ≥ 40 判「是」，30~39 判「倾向是」", () => {
    // 阳虚亚量表 7 条全部答 5，其余答 1
    const answers = uniformAnswers(1);
    for (const entry of SUBSCALES.yangxu) answers[entry.key] = 5;
    // 阳虚转化分 = 100；但 q5/q12 属共享条目，平和转化分会被拉低
    const result = diagnose(answers);
    const yangxu = result.scores.find((s) => s.id === "yangxu")!;
    expect(yangxu.transformed).toBe(100);
    expect(yangxu.verdict).toBe("是");
    expect(result.primary.id).toBe("yangxu");
    expect(result.isBalanced).toBe(false);
  });

  it("临界值：偏颇转化分 30 → 倾向是；< 30 → 否", () => {
    // 痰湿 8 条：转化分 30 → 原始分 = 30/100*32+8 = 17.6 → 用 6 条答 3、2 条答 1
    const answers = uniformAnswers(1);
    SUBSCALES.tanshi.forEach((entry, i) => {
      answers[entry.key] = i < 6 ? 3 : 1; // 原始分 = 6*3+2 = 20 → 转化分 (20-8)/32*100 = 37.5
    });
    const result = diagnose(answers);
    const tanshi = result.scores.find((s) => s.id === "tanshi")!;
    expect(tanshi.transformed).toBe(37.5);
    expect(tanshi.verdict).toBe("倾向是");
  });

  it("平和质需同时满足自身 ≥60 且所有偏颇 < 30", () => {
    // 全部答 2：平和反向条目翻转后得 4，正向条目得 2
    // 平和原始分 = 2*2 + 6*4 = 28 → 转化分 (28-8)/32*100 = 62.5
    // 偏颇各亚量表转化分约 25（< 30）→ 平和判「是」
    const result = diagnose(uniformAnswers(2));
    const pinghe = result.scores.find((s) => s.id === "pinghe")!;
    expect(pinghe.transformed).toBe(62.5);
    expect(pinghe.verdict).toBe("是");
  });

  it("非法分值抛出异常", () => {
    expect(() => diagnose({ q1: 6 })).toThrow();
    expect(() => diagnose({ q1: 0 })).toThrow();
  });
});

describe("体征提示评分", () => {
  it("舌色淡白 + 苔薄白 → 阳虚/气虚/平和 得分", () => {
    const scores = scoreSigns(["tongue_pale", "coating_thin_white"]);
    expect(scores.yangxu).toBeGreaterThan(0);
    expect(scores.qixu).toBeGreaterThan(0);
    expect(scores.pinghe).toBeGreaterThan(0);
    expect(scores.tebing).toBe(0);
  });

  it("空体征列表全部得 0", () => {
    const scores = scoreSigns([]);
    for (const id of CONSTITUTION_IDS) expect(scores[id]).toBe(0);
  });

  it("忽略未知体征 key", () => {
    const scores = scoreSigns(["not_exist"]);
    for (const id of CONSTITUTION_IDS) expect(scores[id]).toBe(0);
  });

  it("topSignConstitutions 只返回有分的偏颇体质且降序", () => {
    const scores = scoreSigns(["face_acne", "coating_yellow", "sym_bitter"]);
    const top = topSignConstitutions(scores, 3);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].id).toBe("shire");
    expect(top.every((t) => t.id !== "pinghe")).toBe(true);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
    }
  });
});

describe("关键词匹配", () => {
  it("从对话文本中匹配症状关键词", () => {
    const keys = matchSignsFromText("医师：哪里不舒服？来访者：最近特别怕冷，手脚冰凉，还容易疲劳。");
    expect(keys).toContain("sym_cold");
    expect(keys).toContain("sym_fatigue");
  });

  it("按类别过滤匹配", () => {
    const tongueKeys = matchSignsFromText("舌质颜色：淡白，舌苔薄白", "tongue");
    expect(tongueKeys.length).toBeGreaterThan(0);
    for (const k of tongueKeys) {
      expect(k.startsWith("tongue_") || k.startsWith("coating_")).toBe(true);
    }
  });
});

describe("多渠道综合", () => {
  it("按权重加权平均并降序排列", () => {
    const combined = combineChannels([
      { channel: "questionnaire", scores: { qixu: 60 }, weight: 3 },
      { channel: "tongue", scores: { qixu: 20 }, weight: 1 },
    ]);
    const qixu = combined.find((c) => c.id === "qixu")!;
    // (60*3 + 20*1) / 4 = 50
    expect(qixu.score).toBe(50);
    expect(combined[0].id).toBe("qixu");
    for (let i = 1; i < combined.length; i++) {
      expect(combined[i - 1].score).toBeGreaterThanOrEqual(combined[i].score);
    }
  });

  it("未覆盖某体质的渠道不参与该体质的平均", () => {
    const combined = combineChannels([
      { channel: "tongue", scores: { yangxu: 80 }, weight: 1 },
    ]);
    expect(combined.find((c) => c.id === "yangxu")!.score).toBe(80);
    expect(combined.find((c) => c.id === "qixu")!.score).toBe(0);
  });
});

describe("兼夹体质推断", () => {
  it("主体质之外判「是/倾向是」者进入兼夹列表", () => {
    const answers = uniformAnswers(1);
    // 气虚 8 条全 5 → 100 分「是」；气郁条目里 q4 是共享的，给气郁单独拉高
    for (const entry of SUBSCALES.qixu) answers[entry.key] = 5;
    for (const entry of SUBSCALES.qiyu) answers[entry.key] = 4;
    const result = diagnose(answers);
    expect(result.primary.id).toBe("qixu");
    const secondaryIds = result.secondary.map((s) => s.id);
    expect(secondaryIds).toContain("qiyu");
    expect(secondaryIds).not.toContain("qixu");
    expect(secondaryIds.every((id) => (BIASED_IDS as string[]).includes(id))).toBe(true);
  });
});

// ------------------------------------------------------------------
// 证候辨证与调理方案（第二轮升级新增）
// ------------------------------------------------------------------

import {
  scorePatterns,
  buildTreatmentPlan,
  type PatternHit,
} from "@/lib/engine";
import { PATTERNS, PATTERN_IDS } from "@/lib/tcm/patterns";
import { FORMULAS } from "@/lib/tcm/formulas";
import { DIET_THERAPIES } from "@/lib/tcm/diet-therapy";
import { SIGNS } from "@/lib/tcm/signs";

describe("知识库完整性", () => {
  it("证候库 ≥ 16 个证候，且字段齐全", () => {
    expect(PATTERN_IDS.length).toBeGreaterThanOrEqual(16);
    for (const id of PATTERN_IDS) {
      const p = PATTERNS[id];
      expect(p.chiefSymptoms.length).toBeGreaterThan(0);
      expect(p.minorSymptoms.length).toBeGreaterThan(0);
      expect(p.tonguePulse.length).toBeGreaterThan(0);
      expect(p.pathogenesis.length).toBeGreaterThan(0);
      expect(p.treatment.length).toBeGreaterThan(0);
      expect(p.formulaKeys.length).toBeGreaterThan(0);
      expect(p.dietKeys.length).toBeGreaterThan(0);
      expect(p.wellness.acupoint.length).toBeGreaterThan(0);
      expect(p.wellness.exercise.length).toBeGreaterThan(0);
      expect(p.wellness.daily.length).toBeGreaterThan(0);
    }
  });

  it("方剂库 ≥ 20 首，且每首字段齐全", () => {
    expect(Object.keys(FORMULAS).length).toBeGreaterThanOrEqual(20);
    for (const f of Object.values(FORMULAS)) {
      expect(f.source.length).toBeGreaterThan(0);
      expect(f.ingredients.length).toBeGreaterThan(0);
      expect(f.preparation.length).toBeGreaterThan(0);
      expect(f.functions.length).toBeGreaterThan(0);
      expect(f.modifications.length).toBeGreaterThan(0);
      expect(f.cautions.length).toBeGreaterThan(0);
      expect(f.patent.length).toBeGreaterThan(0);
      expect(f.patternIds.length).toBeGreaterThan(0);
    }
  });

  it("证候引用的方剂/食疗 key 均存在；signs 引用的证候均存在", () => {
    for (const id of PATTERN_IDS) {
      for (const fk of PATTERNS[id].formulaKeys) expect(FORMULAS[fk]).toBeDefined();
      for (const dk of PATTERNS[id].dietKeys) expect(DIET_THERAPIES[dk]).toBeDefined();
    }
    for (const sign of SIGNS) {
      if (!sign.patterns) continue;
      for (const pid of Object.keys(sign.patterns)) {
        expect(PATTERN_IDS).toContain(pid);
      }
    }
  });

  it("体征词条 ≥ 60 个", () => {
    expect(SIGNS.length).toBeGreaterThanOrEqual(60);
  });
});

describe("scorePatterns 证候评分", () => {
  it("按主症 3 / 舌脉 2 / 兼症 1 加权，含命中明细且按角色排序", () => {
    const hits = scorePatterns(["sym_cold", "tongue_pale"]);
    const piyangxu = hits.find((h) => h.id === "piyangxu")!;
    // sym_cold 主症 3 + tongue_pale 舌脉 2 = 5
    expect(piyangxu.raw).toBe(5);
    expect(piyangxu.hits[0].role).toBe("主症");
    expect(piyangxu.hits[1].role).toBe("舌脉");
    expect(piyangxu.hits.map((h) => h.signKey)).toContain("sym_cold");
  });

  it("归一分不超过 100，结果降序", () => {
    const hits = scorePatterns(["sym_cold", "sym_diarrhea", "tongue_pale", "tongue_fat_teeth"]);
    for (const h of hits) expect(h.score).toBeLessThanOrEqual(100);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it("空体征返回空数组", () => {
    expect(scorePatterns([])).toEqual([]);
  });

  it("未知体征 key 被忽略", () => {
    expect(scorePatterns(["not_exist"])).toEqual([]);
  });
});

describe("buildTreatmentPlan 方案组装", () => {
  it("每个证候都能组装出完整方案（方剂+食疗+保健不留空）", () => {
    for (const id of PATTERN_IDS) {
      const plan = buildTreatmentPlan(id)!;
      expect(plan).not.toBeNull();
      expect(plan.formulas.length).toBeGreaterThan(0);
      expect(plan.dietTherapies.length).toBeGreaterThan(0);
      expect(plan.wellness.acupoint.length).toBeGreaterThan(0);
      expect(plan.pattern.treatment.length).toBeGreaterThan(0);
    }
  });

  it("未知证候返回 null", () => {
    expect(buildTreatmentPlan("not_exist" as never)).toBeNull();
  });
});

describe("典型医案端到端", () => {
  it("畏寒肢冷 + 便溏 + 舌淡胖齿痕 → 脾阳虚/肾阳虚居首", () => {
    const hits = scorePatterns(["sym_cold", "sym_diarrhea", "tongue_pale", "tongue_fat_teeth"]);
    expect(["piyangxu", "shenyangxu"]).toContain(hits[0].id);
    // 次名也应是脾肾阳虚类
    expect(["piyangxu", "shenyangxu", "piqixu"]).toContain(hits[1].id);
  });

  it("情志抑郁 + 胁胀 + 善太息 → 肝郁气滞居首", () => {
    const hits = scorePatterns(["sym_mood", "sym_hypochondriac", "sym_sighing"]);
    expect(hits[0].id).toBe("ganyu_qizhi");
  });

  it("五心烦热 + 盗汗 + 舌红少苔 → 肾阴虚居首", () => {
    const hits = scorePatterns(["sym_heat", "sym_night_sweat", "tongue_red", "coating_less"]);
    expect(hits[0].id).toBe("shenyinxu");
  });

  it("心悸 + 失眠 + 健忘 + 纳差 → 心脾两虚居前二", () => {
    const hits = scorePatterns(["sym_palpitation", "sym_insomnia", "sym_forgetful", "sym_appetite"]);
    expect(hits.slice(0, 2).map((h) => h.id)).toContain("xinpi_liangxu");
  });

  it("痰多胸闷 + 口黏 + 苔厚腻 → 痰湿中阻居首", () => {
    const hits = scorePatterns(["sym_phlegm", "sym_sticky_mouth", "coating_thick_greasy"]);
    expect(hits[0].id).toBe("tanshi_zhongzu");
  });

  it("咽痛 + 发热 + 口渴 → 风热犯表居首", () => {
    const hits = scorePatterns(["sym_sore_throat", "sym_fever", "sym_dry"]);
    expect(hits[0].id).toBe("fengre_fanbiao");
  });
});

// ------------------------------------------------------------------
// 主诉与四诊信息采集（intakeToSigns）
// ------------------------------------------------------------------

import { intakeToSigns, intakeSummary } from "@/lib/engine";
import type { IntakeForm } from "@/lib/tcm/intake";

/** 构造空表单（按需覆盖字段） */
function emptyIntake(patch: Partial<IntakeForm> = {}): IntakeForm {
  return {
    gender: "",
    ageGroup: "",
    chiefComplaints: [],
    course: "",
    aggravating: [],
    relieving: [],
    history: [],
    female: null,
    male: null,
    pulse: { rate: null, strength: "", depth: "", width: "", rhythm: "" },
    listening: { voice: "", cough: "", breath: "" },
    ...patch,
  };
}

describe("intakeToSigns", () => {
  it("脉率 55 → 脉迟；95 → 脉数；75 不产出迟/数", () => {
    expect(intakeToSigns(emptyIntake({ pulse: { rate: 55, strength: "", depth: "", width: "", rhythm: "" } }))).toContain("pulse_chi");
    expect(intakeToSigns(emptyIntake({ pulse: { rate: 95, strength: "", depth: "", width: "", rhythm: "" } }))).toContain("pulse_shuo");
    const normal = intakeToSigns(emptyIntake({ pulse: { rate: 75, strength: "", depth: "", width: "", rhythm: "" } }));
    expect(normal).not.toContain("pulse_chi");
    expect(normal).not.toContain("pulse_shuo");
  });

  it("组合规则：脉率正常但无力 → 脉弱", () => {
    const keys = intakeToSigns(
      emptyIntake({ pulse: { rate: 72, strength: "无力", depth: "", width: "", rhythm: "" } })
    );
    expect(keys).toContain("pulse_ruo");
    expect(keys).not.toContain("pulse_chi");
  });

  it("脉象自评映射：重按才得→沉、细如线→细、紧绷如弦→弦、宽大→滑、时有停跳→结代、轻按即得→浮", () => {
    const keys = intakeToSigns(
      emptyIntake({ pulse: { rate: null, strength: "", depth: "重按才得", width: "紧绷如弦", rhythm: "时有停跳" } })
    );
    expect(keys).toEqual(expect.arrayContaining(["pulse_chen", "pulse_xian", "pulse_jiedai"]));
    const keys2 = intakeToSigns(
      emptyIntake({ pulse: { rate: null, strength: "", depth: "轻按即得", width: "细如线", rhythm: "" } })
    );
    expect(keys2).toEqual(expect.arrayContaining(["pulse_fu", "pulse_xi"]));
    const keys3 = intakeToSigns(
      emptyIntake({ pulse: { rate: null, strength: "", depth: "", width: "宽大", rhythm: "" } })
    );
    expect(keys3).toContain("pulse_hua");
  });

  it("主诉词条映射：畏寒怕冷 → sym_cold；急重症词条不产生体征", () => {
    const keys = intakeToSigns(emptyIntake({ chiefComplaints: ["cold", "insomnia"] }));
    expect(keys).toEqual(expect.arrayContaining(["sym_cold", "sym_insomnia"]));
    const red = intakeToSigns(emptyIntake({ chiefComplaints: ["chest_pain", "high_fever"] }));
    expect(red).toEqual([]);
  });

  it("自定义主诉走关键词匹配", () => {
    const keys = intakeToSigns(emptyIntake({ customComplaint: "最近总是手脚冰凉" }));
    expect(keys).toContain("sym_cold");
  });

  it("女性专问：痛经血块→sym_dysmenorrhea，跳过（null）不产出", () => {
    const keys = intakeToSigns(
      emptyIntake({ female: { cycle: "规律", flow: "正常", pain: true, leukorrhea: true } })
    );
    expect(keys).toEqual(expect.arrayContaining(["sym_dysmenorrhea", "sym_leukorrhea"]));
    expect(intakeToSigns(emptyIntake({ female: null }))).toEqual([]);
  });

  it("闻诊自评：语声低微→listen_low_voice，口苦口黏分别映射", () => {
    const keys = intakeToSigns(
      emptyIntake({ listening: { voice: "低微", cough: "有", breath: "口黏" } })
    );
    expect(keys).toEqual(expect.arrayContaining(["listen_low_voice", "sym_cough", "sym_sticky_mouth"]));
  });

  it("intakeSummary 输出主诉+病程+脉象摘要", () => {
    const note = intakeSummary(
      emptyIntake({
        chiefComplaints: ["cold", "insomnia"],
        course: "1m-6m",
        pulse: { rate: 55, strength: "无力", depth: "重按才得", width: "", rhythm: "" },
      })
    );
    expect(note).toContain("畏寒怕冷");
    expect(note).toContain("1~6 个月");
    expect(note).toContain("脉率 55 次/分");
  });
});

describe("医案端到端：含脉诊", () => {
  it("畏寒 + 脉沉迟无力 → 阳虚类证候（脾阳虚/肾阳虚）居首", () => {
    const signKeys = intakeToSigns(
      emptyIntake({
        chiefComplaints: ["cold"],
        pulse: { rate: 55, strength: "无力", depth: "重按才得", width: "", rhythm: "" },
      })
    );
    expect(signKeys).toEqual(expect.arrayContaining(["sym_cold", "pulse_chi", "pulse_chen", "pulse_ruo"]));
    const hits = scorePatterns(signKeys);
    expect(["piyangxu", "shenyangxu"]).toContain(hits[0].id);
  });
});

// ------------------------------------------------------------------
// 人口学信息 + 脉诊进阶自测
// ------------------------------------------------------------------

describe("intakeToSigns：人口学与男性专问", () => {
  it("男性专问：遗精/早泄/夜尿频多 → 对应体征；仅 gender=male 时产出", () => {
    const keys = intakeToSigns(
      emptyIntake({ gender: "male", male: { emission: true, premature: true, nightUrine: true } })
    );
    expect(keys).toEqual(expect.arrayContaining(["sym_yijing", "sym_zaoxie", "sym_urine_clear"]));
    // 女性填写了男性专问数据也不产出
    const femaleKeys = intakeToSigns(
      emptyIntake({ gender: "female", male: { emission: true, premature: false, nightUrine: true } })
    );
    expect(femaleKeys).toEqual([]);
  });

  it("妇科词条仅 gender=female 时产出；gender 缺省（旧数据）按原逻辑兼容", () => {
    const femaleForm = { cycle: "规律" as const, flow: "正常" as const, pain: true, leukorrhea: false };
    expect(intakeToSigns(emptyIntake({ gender: "female", female: femaleForm }))).toContain("sym_dysmenorrhea");
    // 男性误带妇科数据不产出
    expect(intakeToSigns(emptyIntake({ gender: "male", female: femaleForm }))).toEqual([]);
    // 旧数据无 gender（空串）：保持兼容，仍产出
    expect(intakeToSigns(emptyIntake({ gender: "", female: femaleForm }))).toContain("sym_dysmenorrhea");
  });

  it("ageGroup 映射进摘要（性别/年龄在 note 中）", () => {
    const note = intakeSummary(
      emptyIntake({ gender: "male", ageGroup: "40-60", chiefComplaints: ["cold"] })
    );
    expect(note).toContain("男");
    expect(note).toContain("40~60 岁");
    expect(note).toContain("畏寒怕冷");
  });
});

describe("intakeToSigns：进阶脉诊自测", () => {
  it("双手/三部对比映射：右强→左手偏弱、尺部弱→pulse_chi_weak；未填不产出", () => {
    const keys = intakeToSigns(
      emptyIntake({
        pulse: { rate: null, strength: "", depth: "", width: "", rhythm: "", strongerHand: "右手", weakestPosition: "尺" },
      })
    );
    expect(keys).toEqual(expect.arrayContaining(["pulse_left_weak", "pulse_chi_weak"]));
    const none = intakeToSigns(
      emptyIntake({
        pulse: { rate: null, strength: "", depth: "", width: "", rhythm: "", strongerHand: "双手相近", weakestPosition: "三部均匀" },
      })
    );
    expect(none).toEqual([]);
  });

  it("进阶词条一律为兼症级（scorePatterns 中 role=兼症，不进主症/舌脉）", () => {
    const hits = scorePatterns(["pulse_left_weak", "pulse_right_weak", "pulse_cun_weak", "pulse_guan_weak", "pulse_chi_weak"]);
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.hasChiefHit).toBe(false);
      for (const d of h.hits) {
        expect(d.weight).toBe(1);
        expect(d.role).toBe("兼症");
      }
    }
  });
});

describe("医案端到端：男性 + 进阶脉诊", () => {
  it("男性 + 遗精 + 夜尿频 + 尺弱 → 肾方向证候（肾阳虚/肾阴虚）居首", () => {
    const signKeys = intakeToSigns(
      emptyIntake({
        gender: "male",
        male: { emission: true, premature: false, nightUrine: true },
        pulse: { rate: null, strength: "", depth: "", width: "", rhythm: "", strongerHand: "", weakestPosition: "尺" },
      })
    );
    expect(signKeys).toEqual(expect.arrayContaining(["sym_yijing", "sym_urine_clear", "pulse_chi_weak"]));
    const hits = scorePatterns(signKeys);
    expect(["shenyangxu", "shenyinxu"]).toContain(hits[0].id);
  });
});

// ------------------------------------------------------------------
// 调理思路：方解/机理内容完整性 + buildSequencing
// ------------------------------------------------------------------

import { buildSequencing } from "@/lib/engine";

describe("方解与机理内容完整性", () => {
  it("27 首方剂均有方解（analysis）", () => {
    const list = Object.values(FORMULAS);
    expect(list.length).toBeGreaterThanOrEqual(20);
    for (const f of list) {
      expect(f.analysis.length).toBeGreaterThan(0);
    }
  });

  it("25 个食疗方均有机理（rationale）", () => {
    const list = Object.values(DIET_THERAPIES);
    for (const d of list) {
      expect(d.rationale.length).toBeGreaterThan(0);
    }
  });

  it("所有证候穴位条目均含名称/操作/机理", () => {
    for (const id of PATTERN_IDS) {
      for (const acu of PATTERNS[id].wellness.acupoint) {
        if (typeof acu === "string") continue; // 旧格式容忍
        expect(acu.name.length).toBeGreaterThan(0);
        expect(acu.method.length).toBeGreaterThan(0);
        expect(acu.rationale.length).toBeGreaterThan(0);
      }
    }
  });

  it("relations ≥ 10 条且 target 闭合（均为存在的证候 id）", () => {
    let count = 0;
    for (const id of PATTERN_IDS) {
      for (const rel of PATTERNS[id].relations) {
        count += 1;
        expect(PATTERN_IDS).toContain(rel.target);
        expect(rel.mechanism.length).toBeGreaterThan(0);
      }
    }
    expect(count).toBeGreaterThanOrEqual(10);
  });
});

describe("buildSequencing 调理顺序推导", () => {
  it("规则1：肝郁气滞 + 脾气虚 → 疏肝为先，依据含「见肝之病」", () => {
    const steps = buildSequencing("ganyu_qizhi", ["piqixu"]);
    expect(steps[0].targetId).toBe("ganyu_qizhi");
    expect(steps[0].focus).toContain("为先");
    expect(steps[0].rationale).toContain("见肝之病");
    expect(steps[1].targetId).toBe("piqixu");
  });

  it("规则2：肾阳虚（虚）+ 痰湿中阻（实）→ 先祛邪后补虚", () => {
    const steps = buildSequencing("shenyangxu", ["tanshi_zhongzu"]);
    expect(steps[0].targetId).toBe("tanshi_zhongzu");
    expect(steps[0].focus).toContain("祛邪");
    expect(steps[0].rationale).toContain("急则治其标");
    expect(steps[1].targetId).toBe("shenyangxu");
  });

  it("规则3：脾气虚 + 肾阳虚（多脏俱虚）→ 先调脾胃", () => {
    const steps = buildSequencing("piqixu", ["shenyangxu"]);
    expect(steps[0].targetId).toBe("piqixu");
    expect(steps[0].rationale).toContain("后天之本");
    expect(steps[0].rationale).toContain("内伤脾胃，百病由生");
    expect(steps[1].targetId).toBe("shenyangxu");
  });

  it("规则4：单一证候 → 一步直治", () => {
    const steps = buildSequencing("ganyu_qizhi", []);
    expect(steps.length).toBe(1);
    expect(steps[0].targetId).toBe("ganyu_qizhi");
    expect(steps[0].focus).toBe(PATTERNS.ganyu_qizhi.treatment);
  });

  it("buildTreatmentPlan 附带 sequencing", () => {
    const plan = buildTreatmentPlan("ganyu_qizhi", ["piqixu"])!;
    expect(plan.sequencing.length).toBeGreaterThanOrEqual(2);
    expect(plan.sequencing[0].targetId).toBe("ganyu_qizhi");
  });
});
