import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scorePatterns, type PatternHit } from "@/lib/engine";
import { judgeTrend, TREND_TEXTS, type FollowUpTrend } from "@/lib/engine/followup";
import type { Sign } from "@/lib/tcm/signs";

export const runtime = "nodejs";

/**
 * 复诊复评与初诊保持同一评分口径：全类别参与归一，
 * 避免两次采集渠道不同导致分母不一致、分数不可比。
 */
const ALL_CATEGORIES: Sign["category"][] = [
  "symptom",
  "pulse",
  "listening",
  "tongue",
  "face",
];

/** 报告中存储的证候部分结构（见 /api/report 的 resultJson） */
interface StoredPatterns {
  primary: PatternHit;
  secondary: PatternHit[];
  signKeys: string[];
}

interface FollowUpResult {
  before: PatternHit[];
  after: PatternHit[];
  trend: FollowUpTrend;
  trendText: string;
}

/**
 * POST /api/followup
 * 入参 { reportId, signKeys }：signKeys 为复诊时仍存在的原有体征
 * 与新增症状体征的并集（由前端组装）。分别对初诊/复诊体征跑
 * scorePatterns（同一全类别口径），按规则判定趋势并入库。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { reportId?: unknown; signKeys?: unknown };

    if (typeof body.reportId !== "string" || body.reportId.length === 0) {
      return NextResponse.json({ error: "缺少 reportId" }, { status: 400 });
    }
    if (
      !Array.isArray(body.signKeys) ||
      !body.signKeys.every((k) => typeof k === "string")
    ) {
      return NextResponse.json(
        { error: "signKeys 必须是字符串数组" },
        { status: 400 }
      );
    }
    const signKeys = Array.from(new Set(body.signKeys as string[]));

    const report = await prisma.report.findUnique({ where: { id: body.reportId } });
    if (!report) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }
    const stored = JSON.parse(report.resultJson) as { patterns?: StoredPatterns | null };
    if (!stored.patterns?.primary) {
      return NextResponse.json(
        { error: "该报告未包含证候结论，无法进行复诊复评" },
        { status: 400 }
      );
    }

    // 初诊体征：以报告生成时的辨证输入为准，重新评分保证口径一致
    const beforeHits = scorePatterns(stored.patterns.signKeys, {
      availableCategories: ALL_CATEGORIES,
    });
    const afterHits = scorePatterns(signKeys, {
      availableCategories: ALL_CATEGORIES,
    });

    const beforePrimary = beforeHits[0] ?? null;
    const afterPrimary = afterHits[0] ?? null;
    const primaryChanged = Boolean(
      beforePrimary && afterPrimary && afterPrimary.id !== beforePrimary.id
    );
    // 复诊时初诊主证的归一分（未命中按 0 计，提示其已缓解）
    const afterPrimaryScore = beforePrimary
      ? (afterHits.find((h) => h.id === beforePrimary.id)?.score ?? 0)
      : 0;

    const trend = judgeTrend(beforePrimary?.score ?? 0, afterPrimaryScore, primaryChanged);
    const trendText = TREND_TEXTS[trend];

    const result: FollowUpResult = {
      before: beforeHits.slice(0, 3),
      after: afterHits.slice(0, 3),
      trend,
      trendText,
    };

    const followUp = await prisma.followUp.create({
      data: {
        reportId: report.id,
        signKeys: JSON.stringify(signKeys),
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json({ id: followUp.id, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "复诊复评失败" },
      { status: 500 }
    );
  }
}

/** GET /api/followup?reportId=xxx —— 该报告的复诊记录（最新在前） */
export async function GET(req: Request) {
  const reportId = new URL(req.url).searchParams.get("reportId");
  if (!reportId) {
    return NextResponse.json({ error: "缺少 reportId" }, { status: 400 });
  }
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }
  const followUps = await prisma.followUp.findMany({
    where: { reportId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(
    followUps.map((f) => {
      const result = JSON.parse(f.resultJson) as FollowUpResult;
      return {
        id: f.id,
        createdAt: f.createdAt,
        trend: result.trend,
        trendText: result.trendText,
        before: result.before,
        after: result.after,
      };
    })
  );
}
