import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CONSTITUTIONS, type ConstitutionId } from "@/lib/tcm/constitutions";
import ScoreBars from "@/components/ScoreBars";

export const dynamic = "force-dynamic";

interface StoredResult {
  combined: { id: ConstitutionId; name: string; score: number }[];
  primary: { id: ConstitutionId; name: string };
  secondary: { id: ConstitutionId; name: string; score: number }[];
  channelNotes: Record<string, string>;
}

const CHANNEL_LABELS: Record<string, string> = {
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) notFound();

  const result = JSON.parse(report.resultJson) as StoredResult;
  const sources = JSON.parse(report.sources) as string[];
  const constitution = CONSTITUTIONS[result.primary.id];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-bold">
          历史报告：<span className="text-cinnabar">{result.primary.name}</span>
        </h1>
        <p className="text-sm text-ink-light">
          {new Date(report.createdAt).toLocaleString("zh-CN")} ·{" "}
          {sources.map((s) => CHANNEL_LABELS[s] ?? s).join(" + ")}
        </p>
      </div>

      <section className="rounded-xl border border-rice-dark bg-white p-6">
        <h2 className="mb-3 font-semibold">九种体质综合倾向分</h2>
        <ScoreBars
          items={result.combined.map((c) => ({
            name: c.name,
            score: c.score,
            highlight: c.id === result.primary.id,
          }))}
        />
        {result.secondary.length > 0 && (
          <p className="mt-3 text-sm text-ink-light">
            兼夹：{result.secondary.map((s) => `${s.name}（${s.score} 分）`).join("、")}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-rice-dark bg-white p-6">
        <h2 className="mb-2 font-semibold">辨证分析</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-light">{report.summary}</p>
      </section>

      <section className="rounded-xl border border-rice-dark bg-white p-6">
        <h2 className="mb-3 font-semibold">调摄要点</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["饮食调摄", constitution.advice.diet],
              ["起居调摄", constitution.advice.daily],
              ["运动调摄", constitution.advice.exercise],
              ["穴位保健", constitution.advice.acupoint],
            ] as const
          ).map(([title, list]) => (
            <div key={title} className="rounded-lg bg-rice/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-cinnabar">{title}</h3>
              <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-light">
                {list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {Object.keys(result.channelNotes).length > 0 && (
        <section className="rounded-xl border border-rice-dark bg-white p-6">
          <h2 className="mb-2 font-semibold">采集记录</h2>
          <ul className="space-y-2 text-sm text-ink-light">
            {Object.entries(result.channelNotes).map(([ch, note]) => (
              <li key={ch}>
                <span className="font-medium text-ink">{CHANNEL_LABELS[ch] ?? ch}：</span>
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-lg bg-rice-dark/60 p-4 text-center text-sm text-ink-light">
        本报告为体质辨识参考，不构成医疗诊断；方药须在执业中医师指导下使用。
      </p>
      <a href="/report" className="inline-block rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light hover:bg-rice">
        ← 返回报告列表
      </a>
    </div>
  );
}
