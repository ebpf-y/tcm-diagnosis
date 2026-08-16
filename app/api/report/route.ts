import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  combineChannels,
  scorePatterns,
  buildTreatmentPlan,
  detectConflicts,
  checkContraindications,
  topSignConstitutions,
  buildCheckupAdvisories,
  CHANNEL_CATEGORIES,
  type ChannelInput,
  type PatternHit,
} from "@/lib/engine";
import type { Sign } from "@/lib/tcm/signs";
import { CONSTITUTIONS, type ConstitutionId } from "@/lib/tcm/constitutions";
import { chatComplete } from "@/lib/llm/client";
import { buildAnalysisPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const CHANNEL_LABELS: Record<string, string> = {
  intake: "主诉与四诊",
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};

interface ReportChannel extends ChannelInput {
  /** 该渠道命中的体征 key（带来源的四诊合参输入） */
  signKeys?: string[];
  /** 脉诊采集模式（intake 渠道；expert 时脉象体征不降权） */
  pulseMode?: "amateur" | "expert";
}

interface ReportRequest {
  channels?: ReportChannel[];
  /** 各渠道备注（用于报告生成与回看） */
  channelNotes?: Record<string, string>;
  /** 各渠道汇总的体征 key 列表（旧客户端的扁平输入，无来源信息） */
  signKeys?: string[];
  /** 人口学与健康背景（intake 渠道；用于禁忌交叉校验与调理建议） */
  demographics?: {
    gender?: string;
    ageGroup?: string;
    history?: string[];
    medications?: string;
    course?: string;
    checkup?: string[];
  };
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
    // 四诊合参输入：优先从各渠道带来的 signKeys 构建带来源的证据；
    // 旧客户端只传扁平 signKeys 时退化为无来源的并集（不启用互证/覆盖率归一）
    const sources: Record<string, string[]> = {};
    for (const c of channels) {
      if (Array.isArray(c.signKeys) && c.signKeys.length > 0) sources[c.channel] = c.signKeys;
    }
    const hasSourced = Object.keys(sources).length > 0;
    const signKeys = hasSourced
      ? Array.from(new Set(Object.values(sources).flat()))
      : (body.signKeys ?? []);
    if (channels.length === 0 && signKeys.length === 0) {
      return NextResponse.json({ error: "至少需要一个渠道的采集结果" }, { status: 400 });
    }

    // ---- 体质判定（CCMQ 问卷是唯一权威渠道；舌/面/对话只作一致性校验，不参与计分） ----
    const qChannels = channels.filter((c) => c.channel === "questionnaire");
    const combined = qChannels.length > 0 ? combineChannels(qChannels) : null;
    let primaryConst: { id: ConstitutionId; name: string } | null = null;
    let secondary: { id: ConstitutionId; name: string; score: number }[] = [];
    let isBalanced = false;
    if (combined) {
      const topBiased = combined.filter((c) => c.id !== "pinghe");
      const primary = topBiased[0];
      isBalanced = !primary || primary.score < 15;
      primaryConst = isBalanced ? CONSTITUTIONS.pinghe : CONSTITUTIONS[primary.id];
      secondary = topBiased
        .filter((c) => c.id !== primary?.id && c.score >= 20)
        .slice(0, 2);
    }

    // ---- 证候辨证（四诊合参：来源互证 + 覆盖率感知归一） ----
    const availableCategories: Sign["category"][] | undefined = hasSourced
      ? Array.from(
          new Set(
            channels.flatMap((c) => CHANNEL_CATEGORIES[c.channel] ?? [])
          )
        )
      : undefined;
    const patternHits = scorePatterns(signKeys, {
      sources: hasSourced ? sources : undefined,
      availableCategories,
      pulseMode: channels.find((c) => c.channel === "intake")?.pulseMode,
    });
    const qualified = patternHits.filter((h) => h.score >= PATTERN_THRESHOLD);
    const primaryPattern: PatternHit | null = qualified[0] ?? patternHits[0] ?? null;
    const secondaryPatterns = (qualified.length > 0 ? qualified : patternHits)
      .filter((h) => h !== primaryPattern)
      .slice(0, 2);
    const plan = primaryPattern
      ? buildTreatmentPlan(
          primaryPattern.id,
          secondaryPatterns.map((s) => s.id),
          signKeys,
          { chronic: body.demographics?.course === ">6m" }
        )
      : null;

    /**
     * 出方药的证据门槛（双阈值）：符合度 ≥40 且有主症级命中才出具方药参考；
     * 否则只出食疗/起居/穴位等非药物调理，避免低证据开方。
     */
    const FORMULA_EVIDENCE_THRESHOLD = 40;
    const formulaWithheld = plan
      ? !(primaryPattern!.score >= FORMULA_EVIDENCE_THRESHOLD && primaryPattern!.hasChiefHit)
      : false;

    // ---- 信息矛盾点（不默默平均，显式提示待澄清） ----
    const conflicts = detectConflicts({
      signKeys,
      isBalanced: combined ? isBalanced : undefined,
    });
    // 体质一致性校验：非问卷渠道的体质提示与问卷结论不一致时提示
    if (combined && primaryConst) {
      for (const c of channels.filter((x) => x.channel !== "questionnaire")) {
        const hint = topSignConstitutions(c.scores as Record<ConstitutionId, number>)[0];
        if (!hint || hint.score < 40) continue;
        if (isBalanced || hint.id !== primaryConst.id) {
          conflicts.push(
            `${CHANNEL_LABELS[c.channel] ?? c.channel}提示「${hint.name}」倾向（${hint.score} 分），与问卷判定的体质（${primaryConst.name}）不一致——体质判定以 CCMQ 问卷为准，舌面/对话渠道反映的多为当下状态，仅供参考。`
          );
        }
      }
    }

    // ---- 禁忌交叉校验（安全底线：病史/在服药/年龄/体征 × 方剂禁忌标签） ----
    const demo = body.demographics ?? {};
    const contraWarnings = plan
      ? checkContraindications({
          formulaKeys: plan.formulas.map((f) => f.formula.key),
          history: demo.history,
          medications: demo.medications,
          ageGroup: demo.ageGroup,
          signKeys,
        })
      : [];

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
              conflicts: conflicts.length > 0 ? conflicts : undefined,
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
      // 体质部分（combined/primary 在未做问卷时为 null，前端按提示渲染）
      combined,
      primary: primaryConst ? { id: primaryConst.id, name: primaryConst.name } : null,
      secondary: secondary.map((s) => ({ id: s.id, name: s.name, score: s.score })),
      isBalanced,
      questionnaireDone: qChannels.length > 0,
      channelNotes: body.channelNotes ?? {},
      // 证候部分（新增，旧报告无此字段，前端按旧格式兼容渲染）
      patterns: primaryPattern
        ? {
            primary: primaryPattern,
            secondary: secondaryPatterns,
            signKeys,
            /** 专家视图用：全部候选证候对比（前 6） */
            all: patternHits.slice(0, 6),
          }
        : null,
      plan,
      /** 证据不足时不出具方药（双阈值），前端据此只渲染非药物调理 */
      formulaWithheld,
      /** 禁忌交叉校验结果（安全警示） */
      contraWarnings,
      /** 专家模式报告（脉诊专业录入；渲染专家视图） */
      expertMode: channels.find((c) => c.channel === "intake")?.pulseMode === "expert",
      /** 体检指标健康提示（体病相关；不参与辨证） */
      advisories: buildCheckupAdvisories(body.demographics?.checkup ?? []),
      // 信息矛盾点（四诊合参冲突检测，新版报告字段）
      conflicts,
      // 人口学与健康背景（用于方药剂量与禁忌警示）
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
