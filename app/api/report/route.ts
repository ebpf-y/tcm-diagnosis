import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { combineChannels, type ChannelInput } from "@/lib/engine";
import { CONSTITUTIONS } from "@/lib/tcm/constitutions";
import { chatComplete } from "@/lib/llm/client";
import { buildReportPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const CHANNEL_LABELS: Record<string, string> = {
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};

interface ReportRequest {
  channels?: ChannelInput[];
  /** 各渠道备注（用于报告生成与回看），如问卷结论、对话摘要、舌面象描述 */
  channelNotes?: Record<string, string>;
  inputSummary?: Record<string, unknown>;
}

/**
 * POST /api/report
 * 汇总多渠道评分 → 规则引擎综合判定 → LLM 生成通俗报告 → 入库
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportRequest;
    const channels = (body.channels ?? []).filter((c) => c && c.scores && c.weight > 0);
    if (channels.length === 0) {
      return NextResponse.json({ error: "至少需要一个渠道的评分结果" }, { status: 400 });
    }

    const combined = combineChannels(channels);
    // 主体质：偏颇体质中综合分最高者；若全部极低则视为平和
    const topBiased = combined.filter((c) => c.id !== "pinghe");
    const primary = topBiased[0];
    const isBalanced = primary.score < 15;
    const primaryConst = isBalanced ? CONSTITUTIONS.pinghe : CONSTITUTIONS[primary.id];
    const secondary = topBiased
      .filter((c) => c.id !== primary.id && c.score >= 20)
      .slice(0, 2);

    const channelNotes = Object.entries(body.channelNotes ?? {}).map(
      ([ch, note]) => `${CHANNEL_LABELS[ch] ?? ch}：${note}`
    );

    // 生成通俗报告：优先 LLM，无 Key 或失败时使用知识库模板兜底
    let summary = "";
    try {
      summary = await chatComplete([
        {
          role: "system",
          content: buildReportPrompt({
            primaryName: primaryConst.name,
            primaryScore: isBalanced ? combined.find((c) => c.id === "pinghe")?.score ?? 0 : primary.score,
            secondaryNames: secondary.map((s) => s.name),
            channelNotes: channelNotes.length > 0 ? channelNotes : ["仅完成部分渠道采集"],
            traits: primaryConst.traits,
            tendency: primaryConst.tendency,
          }),
        },
        { role: "user", content: "请生成报告。" },
      ]);
      if (summary.trim() === "{}") summary = "";
    } catch {
      summary = "";
    }
    if (!summary) {
      summary = buildFallbackSummary(primaryConst.name, primaryConst.traits, primaryConst.tendency, secondary.map((s) => s.name));
    }

    const resultJson = JSON.stringify({
      combined,
      primary: { id: primaryConst.id, name: primaryConst.name },
      secondary: secondary.map((s) => ({ id: s.id, name: s.name, score: s.score })),
      isBalanced,
      channelNotes: body.channelNotes ?? {},
    });

    const report = await prisma.report.create({
      data: {
        sources: JSON.stringify(channels.map((c) => c.channel)),
        resultJson,
        summary,
        inputSummary: JSON.stringify(body.inputSummary ?? {}),
      },
    });

    return NextResponse.json({ id: report.id, ...JSON.parse(resultJson), summary });
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
      const result = JSON.parse(r.resultJson) as { primary?: { name?: string } };
      return {
        id: r.id,
        createdAt: r.createdAt,
        sources: JSON.parse(r.sources) as string[],
        primaryName: result.primary?.name ?? "未知",
      };
    })
  );
}

function buildFallbackSummary(
  primaryName: string,
  traits: string[],
  tendency: string,
  secondaryNames: string[]
): string {
  return (
    `一、体质判定：主证为「${primaryName}」` +
    (secondaryNames.length > 0 ? `，兼夹${secondaryNames.join("、")}` : "") +
    `。\n\n二、证候分析：该体质典型表现为${traits.slice(0, 3).join("；")}。` +
    `结合各渠道采集信息，其病机要点如上所述；${tendency}\n\n` +
    `三、调摄要点：详见下方饮食、起居、运动、穴位四项方案，可从生活方式入手逐步纠正体质偏颇。` +
    `若症状持续或加重，应及时就诊；方药须在执业中医师指导下使用。`
  );
}
