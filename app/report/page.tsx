"use client";

import { useEffect, useState } from "react";
import {
  loadChannelResults,
  clearChannelResults,
  CHANNEL_LABELS,
  type ChannelResult,
} from "@/lib/session";
import { CONSTITUTIONS, type ConstitutionId } from "@/lib/tcm/constitutions";
import ScoreBars from "@/components/ScoreBars";

interface ReportResult {
  id: string;
  combined: { id: ConstitutionId; name: string; score: number }[];
  primary: { id: ConstitutionId; name: string };
  secondary: { id: ConstitutionId; name: string; score: number }[];
  summary: string;
  error?: string;
}

interface HistoryItem {
  id: string;
  createdAt: string;
  sources: string[];
  primaryName: string;
}

export default function ReportPage() {
  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setChannels(loadChannelResults());
    void fetch("/api/report")
      .then((r) => r.json())
      .then((d: HistoryItem[]) => setHistory(d))
      .catch(() => undefined);
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels: channels.map((c) => ({
            channel: c.channel,
            scores: c.scores,
            weight: c.weight,
          })),
          channelNotes: Object.fromEntries(channels.map((c) => [c.channel, c.note])),
          inputSummary: Object.fromEntries(channels.map((c) => [c.channel, c.note])),
        }),
      });
      const data = (await res.json()) as ReportResult;
      if (!res.ok) throw new Error(data.error ?? "报告生成失败");
      setReport(data);
      clearChannelResults();
      setChannels([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "报告生成失败");
    } finally {
      setLoading(false);
    }
  }

  const advice = report ? CONSTITUTIONS[report.primary.id].advice : null;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">综合报告</h1>

      {report ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-rice-dark bg-white p-6">
            <h2 className="mb-1 text-xl font-bold">
              综合判定：<span className="text-cinnabar">{report.primary.name}</span>
            </h2>
            {report.secondary.length > 0 && (
              <p className="mb-3 text-sm text-ink-light">
                兼夹：{report.secondary.map((s) => s.name).join("、")}
              </p>
            )}
            <ScoreBars
              items={report.combined.map((c) => ({
                name: c.name,
                score: c.score,
                highlight: c.id === report.primary.id,
              }))}
            />
          </section>

          <section className="rounded-xl border border-rice-dark bg-white p-6">
            <h2 className="mb-2 font-semibold">辨证分析</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-light">
              {report.summary}
            </p>
          </section>

          {advice && (
            <section className="rounded-xl border border-rice-dark bg-white p-6">
              <h2 className="mb-3 font-semibold">调摄要点</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["饮食调摄", advice.diet],
                    ["起居调摄", advice.daily],
                    ["运动调摄", advice.exercise],
                    ["穴位保健", advice.acupoint],
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
          )}

          <p className="rounded-lg bg-rice-dark/60 p-4 text-center text-sm text-ink-light">
            本报告为体质辨识参考，不构成医疗诊断；方药须在执业中医师指导下使用。
          </p>
          <button
            onClick={() => setReport(null)}
            className="rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light hover:bg-rice"
          >
            返回
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-rice-dark bg-white p-6">
            <h2 className="mb-3 font-semibold">本次已完成的采集渠道</h2>
            {channels.length === 0 ? (
              <p className="text-sm text-ink-light">
                尚未完成任何诊断渠道。请先前往
                <a href="/questionnaire" className="mx-1 text-cinnabar underline">问卷问诊</a>/
                <a href="/chat" className="mx-1 text-cinnabar underline">对话问诊</a>/
                <a href="/imaging" className="mx-1 text-cinnabar underline">舌面诊</a>
                完成至少一项采集。
              </p>
            ) : (
              <ul className="space-y-2">
                {channels.map((c) => (
                  <li key={c.channel} className="rounded-lg bg-rice/60 p-3 text-sm">
                    <span className="mr-2 font-medium text-cinnabar">
                      {CHANNEL_LABELS[c.channel]}
                    </span>
                    <span className="text-ink-light">{c.note}</span>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              onClick={() => void handleGenerate()}
              disabled={channels.length === 0 || loading}
              className="mt-4 rounded-lg bg-cinnabar px-6 py-2 text-white disabled:opacity-40"
            >
              {loading ? "生成中…" : "生成综合报告"}
            </button>
          </section>

          <section className="rounded-xl border border-rice-dark bg-white p-6">
            <h2 className="mb-3 font-semibold">历史报告</h2>
            {history.length === 0 ? (
              <p className="text-sm text-ink-light">暂无历史报告。</p>
            ) : (
              <ul className="divide-y divide-rice-dark">
                {history.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`/report/${h.id}`}
                      className="flex items-center justify-between py-3 text-sm hover:text-cinnabar"
                    >
                      <span>
                        <span className="mr-2 font-medium">{h.primaryName}</span>
                        <span className="text-xs text-ink-light">
                          {h.sources.map((s) => CHANNEL_LABELS[s] ?? s).join(" + ")}
                        </span>
                      </span>
                      <span className="text-xs text-ink-light">
                        {new Date(h.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
