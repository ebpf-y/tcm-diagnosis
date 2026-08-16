/**
 * 复诊复评趋势判定（judgeTrend）单元测试
 *
 * 规则：以初诊主证归一分的相对变化 ±30% 为界（含边界）；
 * 主证易位直接判 worse；初诊主证分为 0 时无法算相对变化，
 * 复诊仍为 0 判 stable，出现得分判 worse。
 */
import { describe, it, expect } from "vitest";
import { judgeTrend, TREND_TEXTS, TREND_LABELS } from "@/lib/engine/followup";

describe("复诊趋势判定 judgeTrend", () => {
  it("主证归一分下降 ≥30% → improved", () => {
    expect(judgeTrend(100, 60, false)).toBe("improved");
    expect(judgeTrend(50, 20, false)).toBe("improved");
  });

  it("恰好下降 30%（边界）→ improved", () => {
    expect(judgeTrend(100, 70, false)).toBe("improved");
    expect(judgeTrend(10, 7, false)).toBe("improved");
  });

  it("变化在 ±30% 以内 → stable", () => {
    expect(judgeTrend(100, 100, false)).toBe("stable");
    expect(judgeTrend(100, 71, false)).toBe("stable");
    expect(judgeTrend(100, 129, false)).toBe("stable");
    expect(judgeTrend(50, 60, false)).toBe("stable");
  });

  it("上升 ≥30% → worse；恰好在边界上也判 worse", () => {
    expect(judgeTrend(100, 131, false)).toBe("worse");
    expect(judgeTrend(100, 130, false)).toBe("worse");
    expect(judgeTrend(10, 13, false)).toBe("worse");
  });

  it("主证易位 → worse（即使原主证分数下降）", () => {
    expect(judgeTrend(100, 50, true)).toBe("worse");
    expect(judgeTrend(100, 100, true)).toBe("worse");
  });

  it("初诊主证分为 0：复诊仍为 0 → stable，出现得分 → worse", () => {
    expect(judgeTrend(0, 0, false)).toBe("stable");
    expect(judgeTrend(0, 20, false)).toBe("worse");
  });

  it("复诊主证完全缓解（分数降至 0）→ improved", () => {
    expect(judgeTrend(60, 0, false)).toBe("improved");
  });

  it("趋势文案与标签齐备且为中文", () => {
    for (const trend of ["improved", "stable", "worse"] as const) {
      expect(TREND_TEXTS[trend].length).toBeGreaterThan(0);
      expect(TREND_LABELS[trend].length).toBeGreaterThan(0);
    }
  });
});
