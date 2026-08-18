"use client";

import { useEffect, useState } from "react";
import {
  loadChannelResults,
  clearChannelResults,
  addMyReportId,
  getMyReportIds,
  CHANNEL_LABELS,
  type ChannelResult,
} from "@/lib/session";
import type { ConstitutionId } from "@/lib/tcm/constitutions";
import ReportSections, { type ReportViewData } from "@/components/ReportSections";

interface ReportResult extends ReportViewData {
  id: string;
  analysis: string;
  error?: string;
}

interface HistoryItem {
  id: string;
  createdAt: string;
  sources: string[];
  primaryName: string;
  patternName: string | null;
}

export default function ReportPage() {
  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setChannels(loadChannelResults());
    // 历史列表只加载本设备生成的报告（多人共用部署时的隔离）
    const ids = getMyReportIds();
    if (ids.length === 0) return;
    void fetch(`/api/report?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d: HistoryItem[]) => setHistory(d))
      .catch(() => undefined);
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      // 汇总各渠道命中的体征（证候辨证输入）；同时按渠道带来源提交，
      // 服务端据此做四诊合参（互证加成 + 覆盖率感知归一 + 冲突检测）
      const signKeys = Array.from(new Set(channels.flatMap((c) => c.signKeys ?? [])));
      const demographics = channels.find((c) => c.channel === "intake")?.demographics;
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels: channels.map((c) => ({
            channel: c.channel,
            scores: c.scores,
            weight: c.weight,
            signKeys: c.signKeys ?? [],
            pulseMode: c.pulseMode,
          })),
          channelNotes: Object.fromEntries(channels.map((c) => [c.channel, c.note])),
          signKeys,
          demographics,
          inputSummary: Object.fromEntries(channels.map((c) => [c.channel, c.note])),
        }),
      });
      const data = (await res.json()) as ReportResult;
      if (!res.ok) throw new Error(data.error ?? "报告生成失败");
      addMyReportId(data.id);
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

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">综合报告</h1>

      {report ? (
        <div className="space-y-6">
          <ReportSections data={report} analysis={report.analysis} />
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
                    {c.signKeys && c.signKeys.length > 0 && (
                      <span className="ml-2 text-xs text-ink-light/70">
                        （体征线索 {c.signKeys.length} 项）
                      </span>
                    )}
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
            <h2 className="mb-3 font-semibold">历史报告（本设备）</h2>
            {history.length === 0 ? (
              <p className="text-sm text-ink-light">
                本设备暂无历史报告。生成的报告只记录在本设备的浏览器中，其他人看不到。
              </p>
            ) : (
              <ul className="divide-y divide-rice-dark">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                    <a
                      href={`/report/${h.id}`}
                      className="flex min-w-0 flex-1 items-center justify-between hover:text-cinnabar"
                    >
                      <span>
                        <span className="mr-2 font-medium">{h.primaryName}</span>
                        {h.patternName && (
                          <span className="mr-2 rounded-full bg-cinnabar/10 px-2 py-0.5 text-xs text-cinnabar">
                            {h.patternName}
                          </span>
                        )}
                        <span className="text-xs text-ink-light">
                          {h.sources.map((s) => CHANNEL_LABELS[s] ?? s).join(" + ")}
                        </span>
                      </span>
                      <span className="text-xs text-ink-light">
                        {new Date(h.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </a>
                    <a
                      href={`/followup?reportId=${h.id}`}
                      className="shrink-0 rounded-full border border-rice-dark px-2 py-0.5 text-xs text-ink-light hover:border-cinnabar hover:text-cinnabar"
                    >
                      复诊
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
