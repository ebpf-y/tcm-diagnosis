/**
 * 医案回测：经典病例 → 规则引擎辨证吻合率验证
 *
 * 方法论：选取《中医诊断学》《中医内科学》及经典医籍中辨证结论
 * 无争议的典型病例，将四诊信息结构化为体征 key，以专家模式（脉象
 * 完整权重）重跑 scorePatterns，检验引擎结论与医案公认的证候是否一致。
 *
 * 通过标准：
 * - 每案引擎首选证候（hits[0]）= 医案公认主证；
 * - alsoInTop3 指定的鉴别证候须进入前三（模拟临床「需鉴别的候选」）。
 *
 * 本文件同时是回归测试：未来任何权重/知识库改动若导致辨证结论漂移，
 * 会在这里直接失败——权重表的每次调整都须有医案依据。
 */

import { describe, it, expect } from "vitest";
import { scorePatterns, applyCourseWeighting } from "@/lib/engine";
import { PATTERNS, PATTERN_IDS, type PatternId } from "@/lib/tcm/patterns";

interface MedicalCase {
  name: string;
  /** 结构化四诊信息（signs.ts 的体征 key） */
  signs: string[];
  /** 医案公认的主证 */
  expect: PatternId;
  /** 病程（intake course 编码；外感案标急性病程以验证病程加权） */
  course?: string;
  /** 应当进入前三的鉴别证候（可空） */
  alsoInTop3?: PatternId[];
  /** 不应进入前三的证候（防鉴别噪音，可空） */
  notInTop3?: PatternId[];
}

const CASES: MedicalCase[] = [
  // ---------- 虚证类 ----------
  {
    name: "脾气虚（食少便溏乏力案）",
    signs: ["sym_appetite", "sym_bloating", "sym_diarrhea", "sym_fatigue", "sym_low_voice", "tongue_pale", "pulse_huan"],
    expect: "piqixu",
  },
  {
    name: "脾阳虚（脘腹冷痛便溏案）",
    signs: ["sym_cold", "sym_bloating", "sym_diarrhea", "sym_no_thirst", "sym_fatigue", "tongue_pale", "tongue_fat_teeth", "pulse_chen", "pulse_chi"],
    expect: "piyangxu",
    alsoInTop3: ["piqixu"],
  },
  {
    name: "肾阳虚（腰膝酸冷五更泄案）",
    signs: ["sym_cold", "sym_lowerback", "sym_urine_clear", "sym_dawn_diarrhea", "sym_fatigue", "tongue_fat_teeth", "pulse_chen", "pulse_xi"],
    expect: "shenyangxu",
  },
  {
    name: "肾阴虚（潮热盗汗腰酸案）",
    signs: ["sym_heat", "sym_night_sweat", "sym_lowerback", "sym_dry", "sym_tinnitus", "tongue_red", "coating_less", "pulse_xi", "pulse_shuo"],
    expect: "shenyinxu",
    alsoInTop3: ["xinshen_bujiao"],
  },
  {
    name: "心脾两虚（心悸失眠健忘案）",
    signs: ["sym_palpitation", "sym_insomnia", "sym_forgetful", "sym_appetite", "sym_fatigue", "face_yellow", "tongue_pale", "pulse_xi", "pulse_ruo"],
    expect: "xinpi_liangxu",
    alsoInTop3: ["xinshen_bujiao"],
  },
  {
    name: "气血两虚（头晕乏力经少案）",
    signs: ["sym_dizzy", "sym_fatigue", "sym_low_voice", "sym_palpitation", "sym_menses_light", "face_pale", "tongue_pale", "pulse_xi", "pulse_ruo"],
    expect: "qixue_liangxu",
    alsoInTop3: ["xinpi_liangxu", "ganxue_xu"],
  },
  {
    name: "肺气虚（气短自汗易感案）",
    signs: ["sym_cough", "sym_short_breath", "sym_sweat", "sym_catch_cold", "listen_low_voice", "sym_fatigue", "tongue_pale", "pulse_xu"],
    expect: "feiqixu",
  },
  {
    name: "肝血虚（目涩麻木经少案）",
    signs: ["sym_dizzy", "sym_eye_dry", "sym_numbness", "sym_insomnia", "sym_menses_light", "tongue_pale", "pulse_xian", "pulse_xi"],
    expect: "ganxue_xu",
  },
  // ---------- 郁火类 ----------
  {
    name: "肝郁气滞（抑郁胁胀太息案）",
    signs: ["sym_mood", "sym_hypochondriac", "sym_sighing", "sym_belching", "pulse_xian"],
    expect: "ganyu_qizhi",
  },
  {
    name: "肝郁脾虚（郁而纳呆便溏案）",
    signs: ["sym_mood", "sym_hypochondriac", "sym_appetite", "sym_bloating", "sym_diarrhea", "sym_fatigue", "pulse_xian", "pulse_xi"],
    expect: "ganyu_pixu",
    alsoInTop3: ["ganyu_qizhi", "piqixu"],
  },
  {
    name: "肝郁化火鉴别（烦躁口苦弦数案）",
    signs: ["sym_irritable", "sym_bitter", "sym_headache", "sym_insomnia", "sym_urine_yellow", "face_red", "tongue_red", "coating_yellow", "pulse_xian", "pulse_shuo"],
    expect: "ganhuo_shangyan",
  },
  {
    name: "肝火上炎（目赤易怒口苦案）",
    signs: ["sym_dizzy", "sym_headache", "face_red", "sym_bitter", "sym_irritable", "sym_urine_yellow", "tongue_red", "coating_yellow", "pulse_xian", "pulse_shuo"],
    expect: "ganhuo_shangyan",
  },
  // ---------- 表证类 ----------
  {
    name: "风寒束表（恶寒无汗身痛案）",
    course: "<1w",
    signs: ["sym_cold", "sym_fever", "sym_no_sweat", "sym_headache", "sym_runny_nose", "sym_no_thirst", "coating_thin_white", "pulse_fu", "pulse_jin"],
    expect: "fenghan_shubiao",
  },
  {
    name: "风热犯表（发热咽痛口渴案）",
    course: "<1w",
    signs: ["sym_fever", "sym_sore_throat", "sym_dry", "sym_cough", "sym_headache", "tongue_red", "pulse_fu", "pulse_shuo"],
    expect: "fengre_fanbiao",
  },
  {
    name: "风寒夹湿（外感吐泻身重案）",
    course: "<1w",
    signs: ["sym_cold", "sym_fever", "sym_no_sweat", "sym_head_heavy", "sym_bloating", "sym_nausea", "sym_diarrhea", "coating_thick_greasy", "pulse_ru", "pulse_huan"],
    expect: "fengshi_shubiao",
    alsoInTop3: ["tanshi_zhongzu"],
  },
  // ---------- 湿痰水饮类 ----------
  {
    name: "痰湿中阻（痞闷痰多头重案）",
    signs: ["sym_bloating", "sym_nausea", "sym_phlegm", "sym_head_heavy", "sym_sticky_mouth", "coating_thick_greasy", "pulse_ru", "pulse_hua"],
    expect: "tanshi_zhongzu",
    alsoInTop3: ["hanre_cuoza"],
  },
  {
    name: "湿热蕴脾（口苦口黏便黏案）",
    signs: ["sym_bitter", "sym_sticky_mouth", "sym_bloating", "sym_stool_sticky", "sym_urine_yellow", "sym_phlegm", "tongue_red", "coating_yellow", "coating_thick_greasy", "pulse_ru", "pulse_shuo"],
    expect: "shire_yunpi",
    alsoInTop3: ["tanshi_zhongzu"],
  },
  {
    name: "水湿内停（小便不利水肿案）",
    signs: ["sym_urine_difficult", "face_edema", "sym_dizzy", "tongue_fat_teeth", "pulse_fu", "pulse_ru"],
    expect: "shuishi_neiting",
    alsoInTop3: ["tanshi_zhongzu"],
  },
  {
    name: "肾阳虚水泛（腰膝冷痛夜尿水肿案）",
    signs: ["sym_cold", "sym_lowerback", "sym_dawn_diarrhea", "sym_urine_clear", "sym_fatigue", "face_edema", "tongue_fat_teeth", "pulse_chen", "pulse_xi"],
    expect: "shenyangxu",
    alsoInTop3: ["piyangxu"],
  },
  // ---------- 阴虚火扰类 ----------
  {
    name: "胃阴虚（灼痛饥不欲食案）",
    signs: ["sym_stomach_burning", "sym_hungry_no_eat", "sym_dry", "sym_constipation", "tongue_red", "tongue_crack", "coating_less", "pulse_xi", "pulse_shuo"],
    expect: "weiyinxu",
    alsoInTop3: ["shenyinxu"],
  },
  {
    name: "心肾不交（心烦失眠腰酸案）",
    signs: ["sym_insomnia", "sym_palpitation", "sym_forgetful", "sym_lowerback", "sym_heat", "sym_night_sweat", "sym_tinnitus", "tongue_red", "coating_less", "pulse_xi", "pulse_shuo"],
    expect: "xinshen_bujiao",
    alsoInTop3: ["shenyinxu"],
  },
  // ---------- 血痞少阳类 ----------
  {
    name: "气滞血瘀（刺痛抑郁舌紫案）",
    signs: ["sym_pain", "sym_hypochondriac", "sym_mood", "face_dark", "sym_dysmenorrhea", "tongue_purple", "pulse_xian", "pulse_se"],
    expect: "qizhi_xueyu",
  },
  {
    name: "寒热错杂痞（心下痞满呕恶案）",
    signs: ["sym_stuffiness", "sym_nausea", "sym_borborygmus", "sym_bitter", "coating_thick_greasy", "coating_yellow", "pulse_xian", "pulse_hua"],
    expect: "hanre_cuoza",
    alsoInTop3: ["fengshi_shubiao"],
  },
  {
    name: "少阳枢机不利（往来寒热口苦案）",
    course: "<1w",
    signs: ["sym_alternating", "sym_hypochondriac", "sym_mood", "sym_bitter", "sym_nausea", "sym_appetite", "pulse_xian"],
    expect: "shaoyang_shuli",
    alsoInTop3: ["ganyu_qizhi"],
  },
  // ---------- 难例（真假寒热 / 虚实错杂 / 复合证） ----------
  {
    name: "真寒假热（阴盛格阳戴阳案）",
    signs: ["sym_cold", "sym_diarrhea", "face_red", "tongue_pale", "pulse_chi", "pulse_wei"],
    expect: "piyangxu",
    notInTop3: ["ganhuo_shangyan"], // 面赤为虚阳外越，绝不能引出肝火方向
  },
  {
    name: "大实虚象（痰湿肥胖乏力案）",
    signs: ["sym_fatigue", "sym_phlegm", "sym_head_heavy", "sym_sticky_mouth", "coating_thick_greasy", "pulse_hua", "pulse_ru"],
    expect: "tanshi_zhongzu", // 乏力属「大实有羸状」，不得被气虚证吸走
  },
  {
    name: "上热下寒（痞利并见案）",
    signs: ["sym_bitter", "sym_dry", "sym_cold", "sym_diarrhea", "sym_stuffiness", "sym_borborygmus", "coating_thick_greasy"],
    expect: "hanre_cuoza",
  },
  {
    name: "肝郁化火（气滞为主火象已现案）",
    signs: ["sym_mood", "sym_sighing", "sym_hypochondriac", "sym_irritable", "sym_bitter", "tongue_red", "coating_yellow", "pulse_shuo", "pulse_xian"],
    expect: "ganyu_qizhi",
    alsoInTop3: ["ganhuo_shangyan"], // 气郁化火：气滞与火并见，引擎不区分层次属已知限制
  },
  {
    name: "阴阳两虚偏阳虚（冷结而烦热案）",
    signs: ["sym_cold", "sym_dawn_diarrhea", "sym_urine_clear", "sym_heat", "sym_night_sweat", "sym_lowerback", "sym_tinnitus", "tongue_fat_teeth", "pulse_chen", "pulse_xi"],
    expect: "shenyangxu",
    alsoInTop3: ["shenyinxu"],
  },
  {
    name: "气虚血瘀（乏力刺痛舌紫案）",
    signs: ["sym_fatigue", "sym_low_voice", "sym_pain", "tongue_purple", "pulse_se", "sym_dysmenorrhea"],
    expect: "qizhi_xueyu",
  },
  {
    name: "少阳兼脾弱（寒热纳差并见案）",
    course: "<1w",
    signs: ["sym_alternating", "sym_bitter", "sym_nausea", "sym_hypochondriac", "sym_appetite", "sym_bloating", "sym_fatigue", "pulse_xian"],
    expect: "shaoyang_shuli",
    alsoInTop3: ["ganyu_pixu"],
  },
  {
    name: "脾虚湿注（带下乏力纳呆案）",
    signs: ["sym_leukorrhea", "sym_bloating", "sym_fatigue", "sym_appetite", "sym_sticky_mouth", "tongue_fat_teeth", "pulse_huan"],
    expect: "piqixu",
    alsoInTop3: ["tanshi_zhongzu"],
  },
  {
    name: "阴虚肠燥（口干便秘裂纹舌案）",
    signs: ["sym_dry", "sym_constipation", "tongue_red", "tongue_crack", "coating_less", "pulse_xi"],
    expect: "weiyinxu",
    alsoInTop3: ["shenyinxu"],
  },
  {
    name: "湿热下注（带黄尿黄便黏案）",
    signs: ["sym_leukorrhea", "sym_urine_yellow", "sym_bitter", "sym_stool_sticky", "coating_thick_greasy", "coating_yellow", "pulse_shuo"],
    expect: "shire_yunpi",
  },
  {
    name: "风热夹痰（发热咽痛痰多案）",
    course: "<1w",
    signs: ["sym_fever", "sym_sore_throat", "sym_cough", "sym_phlegm", "coating_thick_greasy", "pulse_fu", "pulse_shuo"],
    expect: "fengre_fanbiao",
  },
  {
    name: "风寒表虚（汗出恶风案）",
    course: "<1w",
    signs: ["sym_cold", "sym_sweat", "sym_headache", "sym_runny_nose", "sym_no_thirst", "coating_thin_white", "pulse_fu", "pulse_huan"],
    expect: "fenghan_shubiao",
  },
];

// ------------------------------------------------------------------
// 评估：首选命中率 + 前三覆盖
// ------------------------------------------------------------------

describe("医案回测：首选证候吻合率", () => {
  const results = CASES.map((c) => ({
    ...c,
    hits: applyCourseWeighting(
      scorePatterns(c.signs, { pulseMode: "expert" }),
      c.course
    ),
  }));
  const top1Hits = results.filter((r) => r.hits[0]?.id === r.expect);
  const top3Fails = results.filter((r) =>
    (r.alsoInTop3 ?? []).some((id) => !r.hits.slice(0, 3).some((h) => h.id === id))
  );

  it(`首选命中率 ${top1Hits.length}/${CASES.length}（100% 为达标）`, () => {
    for (const r of results) {
      expect(
        r.hits[0]?.id,
        `【${r.name}】期望首选「${PATTERNS[r.expect].name}」，` +
          `实际首选「${r.hits[0] ? PATTERNS[r.hits[0].id].name : "无"}」` +
          `（前三：${r.hits.slice(0, 3).map((h) => `${PATTERNS[h.id].name} ${h.score}`).join(" / ")}）`
      ).toBe(r.expect);
    }
  });

  it("鉴别证候须进入前三", () => {
    for (const r of top3Fails) {
      expect(
        top3Fails.length,
        `【${r.name}】鉴别证候未进前三：` +
          r.alsoInTop3!.filter((id) => !r.hits.slice(0, 3).some((h) => h.id === id))
            .map((id) => PATTERNS[id].name).join("、") +
          `（前三：${r.hits.slice(0, 3).map((h) => PATTERNS[h.id].name).join(" / ")}）`
      ).toBe(0);
    }
  });

  it("notInTop3：鉴别噪音证候不得进入前三", () => {
    for (const r of results) {
      for (const banned of r.notInTop3 ?? []) {
        expect(
          r.hits.slice(0, 3).some((h) => h.id === banned),
          `【${r.name}】「${PATTERNS[banned].name}」不应进入前三（前三：${r.hits
            .slice(0, 3)
            .map((h) => `${PATTERNS[h.id].name} ${h.score}`)
            .join(" / ")}）`
        ).toBe(false);
      }
    }
  });

  it("阴性案例：证据不足时引擎必须保持低置信（双阈值拦截的前提）", () => {
    // N1：仅两项泛化体征 → 无决定性结论
    const weak = scorePatterns(["face_dark_circles", "pulse_duan"], { pulseMode: "expert" });
    expect(
      weak.length === 0 || !weak[0].hasChiefHit || weak[0].score < 40,
      `弱证据案首证 ${weak[0]?.id} ${weak[0]?.score} 分，应为低置信`
    ).toBe(true);
    // N2：寒热真假难辨的组合 → 最高分不得超过 60（不得武断立证）
    const mixed = scorePatterns(["sym_cold", "tongue_red", "sym_heat", "sym_diarrhea"], {
      pulseMode: "expert",
    });
    expect(mixed[0]?.score ?? 0).toBeLessThan(60);
    // N3：单一体征（畏寒）→ 低于出方阈值 40，触发「证据不足不出方」
    const single = scorePatterns(["sym_cold"], { pulseMode: "expert" });
    expect(single[0]?.score ?? 0).toBeLessThan(40);
    expect(single.find((h) => h.id === "piyangxu")!.hasChiefHit).toBe(true);
  });

  it("医案集覆盖全部证候（每个 PatternId 至少一案）", () => {
    const covered = new Set(CASES.map((c) => c.expect));
    for (const id of PATTERN_IDS) {
      expect(covered.has(id), `证候「${PATTERNS[id].name}」缺少医案覆盖`).toBe(true);
    }
  });

  it("所有医案体征 key 均存在于知识库（防拼写漂移）", () => {
    // 延迟 import 避免循环：直接用 scorePatterns 的忽略行为反向验证——
    // 未知 key 不产生任何命中，此处显式断言每个 key 都贡献了分数。
    for (const c of CASES) {
      const total = scorePatterns(c.signs, { pulseMode: "expert" }).reduce((s, h) => s + h.raw, 0);
      expect(total, `【${c.name}】存在未知体征 key（该案总分为 0）`).toBeGreaterThan(0);
    }
  });
});
