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
