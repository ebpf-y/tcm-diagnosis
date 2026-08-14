import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  combineChannels,
  scorePatterns,
  buildTreatmentPlan,
  type ChannelInput,
  type PatternHit,
} from "@/lib/engine";
import { CONSTITUTIONS } from "@/lib/tcm/constitutions";
import { chatComplete } from "@/lib/llm/client";
import { buildAnalysisPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const CHANNEL_LABELS: Record<string, string> = {
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};

interface ReportRequest {
  channels?: ChannelInput[];
  /** 各渠道备注（用于报告生成与回看） */
  channelNotes?: Record<string, string>;
  /** 各渠道汇总的体征 key 列表（证候辨证的输入） */
  signKeys?: string[];
  /** 人口学信息（intake 渠道） */
  demographics?: { gender?: string; ageGroup?: string };
  inputSummary?: Record<string, unknown>;
}

/** 证候判定的最低符合度，低于此值不出具证候结论 */
const PATTERN_THRESHOLD = 20;

/**
 * POST /api/report
 * 汇总多渠道评分 → 规则引擎综合判定（体质 + 证候）→
 * 知识库直接组装调理方案 → LLM 仅撰写「辨证分析」论述段 → 入库
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportRequest;
    const channels = (body.channels ?? []).filter((c) => c && c.scores && c.weight > 0);
    const signKeys = body.signKeys ?? [];
    if (channels.length === 0 && signKeys.length === 0) {
      return NextResponse.json({ error: "至少需要一个渠道的采集结果" }, { status: 400 });
    }

    // ---- 体质综合判定（保留原逻辑） ----
    const combined = combineChannels(channels);
    const topBiased = combined.filter((c) => c.id !== "pinghe");
    const primary = topBiased[0];
    const isBalanced = !primary || primary.score < 15;
    const primaryConst = isBalanced ? CONSTITUTIONS.pinghe : CONSTITUTIONS[primary.id];
    const secondary = topBiased
      .filter((c) => c.id !== primary?.id && c.score >= 20)
      .slice(0, 2);

    // ---- 证候辨证（新增） ----
    const patternHits = scorePatterns(signKeys);
    const qualified = patternHits.filter((h) => h.score >= PATTERN_THRESHOLD);
    const primaryPattern: PatternHit | null = qualified[0] ?? patternHits[0] ?? null;
    const secondaryPatterns = (qualified.length > 0 ? qualified : patternHits)
      .filter((h) => h !== primaryPattern)
      .slice(0, 2);
    const plan = primaryPattern
      ? buildTreatmentPlan(primaryPattern.id, secondaryPatterns.map((s) => s.id))
      : null;

    const channelNotes = Object.entries(body.channelNotes ?? {}).map(
      ([ch, note]) => `${CHANNEL_LABELS[ch] ?? ch}：${note}`
    );

    // ---- 辨证分析论述段：LLM 优先，知识库模板兜底 ----
    let analysis = "";
    if (plan) {
      try {
        analysis = await chatComplete([
          {
            role: "system",
            content: buildAnalysisPrompt({
              patternName: plan.pattern.name,
              patternScore: primaryPattern!.score,
              secondaryPatternNames: secondaryPatterns.map((s) => s.name),
              pathogenesis: plan.pattern.pathogenesis,
              hitSummary: primaryPattern!.hits.map((h) => `${h.signLabel}（${h.role}）`),
              channelNotes: channelNotes.length > 0 ? channelNotes : ["仅完成部分渠道采集"],
              chiefComplaint: body.channelNotes?.intake,
              sequencingSummary: plan.sequencing
                .map((s) => `第${s.step}步 ${s.target}：${s.focus}`)
                .join("；"),
            }),
          },
          { role: "user", content: "请撰写辨证分析。" },
        ]);
        if (analysis.trim() === "{}") analysis = "";
      } catch {
        analysis = "";
      }
      if (!analysis) {
        analysis = buildFallbackAnalysis(plan.pattern.name, plan.pattern.pathogenesis, primaryPattern!, secondaryPatterns);
      }
    } else {
      analysis =
        "本次采集未获得足以定位证候的症状体征信息（辨证依据不足）。建议补充对话问诊或舌面诊后重新生成报告。";
    }

    const resultJson = JSON.stringify({
      // 体质部分（字段保持兼容旧版报告）
      combined,
      primary: { id: primaryConst.id, name: primaryConst.name },
      secondary: secondary.map((s) => ({ id: s.id, name: s.name, score: s.score })),
      isBalanced,
      channelNotes: body.channelNotes ?? {},
      // 证候部分（新增，旧报告无此字段，前端按旧格式兼容渲染）
      patterns: primaryPattern
        ? {
            primary: primaryPattern,
            secondary: secondaryPatterns,
            signKeys,
          }
        : null,
      plan,
      // 人口学信息（用于方药剂量警示）
      demographics: body.demographics ?? null,
    });

    const report = await prisma.report.create({
      data: {
        sources: JSON.stringify(channels.map((c) => c.channel)),
        resultJson,
        summary: analysis,
        inputSummary: JSON.stringify(body.inputSummary ?? {}),
      },
    });

    return NextResponse.json({ id: report.id, ...JSON.parse(resultJson), analysis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "报告生成失败" },
      { status: 500 }
    );
  }
}

/** GET /api/report —— 历史报告列表（最新在前） */
export async function GET() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(
    reports.map((r) => {
      const result = JSON.parse(r.resultJson) as {
        primary?: { name?: string };
        patterns?: { primary?: { name?: string } } | null;
      };
      return {
        id: r.id,
        createdAt: r.createdAt,
        sources: JSON.parse(r.sources) as string[],
        primaryName: result.primary?.name ?? "未知",
        patternName: result.patterns?.primary?.name ?? null,
      };
    })
  );
}

/** 无 LLM 时的辨证分析模板（直接从知识库拼装病机与命中关系） */
function buildFallbackAnalysis(
  patternName: string,
  pathogenesis: string,
  primaryHit: PatternHit,
  secondary: PatternHit[]
): string {
  const chiefHits = primaryHit.hits.filter((h) => h.role === "主症").map((h) => h.signLabel);
  const otherHits = primaryHit.hits.filter((h) => h.role !== "主症").map((h) => h.signLabel);
  return (
    `综合各渠道采集信息，辨证为「${patternName}」。` +
    (chiefHits.length > 0 ? `其中 ${chiefHits.join("、")} 为本证主症级依据；` : "") +
    (otherHits.length > 0 ? `${otherHits.join("、")} 为佐证。` : "") +
    `\n\n病机分析：${pathogenesis}` +
    (secondary.length > 0
      ? `\n\n兼证考虑：${secondary.map((s) => `${s.name}（符合度 ${s.score} 分）`).join("、")}，临床可兼顾调治。`
      : "")
  );
}
