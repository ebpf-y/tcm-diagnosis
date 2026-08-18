import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { canAccessReport } from "@/lib/report-access";
import type { ConstitutionId } from "@/lib/tcm/constitutions";
import type { PatternHit, TreatmentPlan } from "@/lib/engine";
import ReportSections from "@/components/ReportSections";

export const dynamic = "force-dynamic";

/** 存储的报告结构（新版含 patterns/plan，旧版无——兼容渲染由组件处理） */
interface StoredResult {
  combined: { id: ConstitutionId; name: string; score: number }[] | null;
  primary: { id: ConstitutionId; name: string } | null;
  secondary: { id: ConstitutionId; name: string; score: number }[];
  isBalanced?: boolean;
  channelNotes: Record<string, string>;
  patterns?: { primary: PatternHit; secondary: PatternHit[]; signKeys: string[] } | null;
  plan?: TreatmentPlan | null;
  demographics?: { gender?: string; ageGroup?: string } | null;
}

const CHANNEL_LABELS: Record<string, string> = {
  intake: "主诉与四诊",
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) notFound();
  // 访问令牌校验（旧报告无令牌字段时兼容放行）；不匹配统一 404，避免探测
  if (!canAccessReport(report, searchParams.token ?? null)) notFound();

  const result = JSON.parse(report.resultJson) as StoredResult;
  const sources = JSON.parse(report.sources) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-bold">
          历史报告：
          <span className="text-cinnabar">{result.primary?.name ?? "体质未判定（未完成问卷）"}</span>
          {result.patterns?.primary && (
            <span className="ml-2 text-lg text-ink">／{result.patterns.primary.name}</span>
          )}
        </h1>
        <p className="text-sm text-ink-light">
          {new Date(report.createdAt).toLocaleString("zh-CN")} ·{" "}
          {sources.map((s) => CHANNEL_LABELS[s] ?? s).join(" + ")}
        </p>
      </div>

      <ReportSections data={result} analysis={report.summary} />

      <div className="flex gap-3">
        <a
          href="/report"
          className="inline-block rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light hover:bg-rice"
        >
          ← 返回报告列表
        </a>
        <a
          href={`/followup?reportId=${report.id}${searchParams.token ? `&token=${encodeURIComponent(searchParams.token)}` : ""}`}
          className="inline-block rounded-lg border border-cinnabar px-5 py-2 text-sm text-cinnabar hover:bg-cinnabar/5"
        >
          复诊复评 →
        </a>
      </div>
    </div>
  );
}
