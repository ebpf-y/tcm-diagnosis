"use client";

import { useState } from "react";
import { SCALE_ITEMS, SCALE_OPTIONS } from "@/lib/tcm/questions";
import { saveChannelResult } from "@/lib/session";
import ScoreBars from "@/components/ScoreBars";

interface ScoreItem {
  id: string;
  name: string;
  transformed: number;
  verdict: string;
}
interface DiagnoseResponse {
  scores: ScoreItem[];
  primary: ScoreItem;
  secondary: ScoreItem[];
  isBalanced: boolean;
  error?: string;
}

export default function QuestionnairePage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const answered = Object.keys(answers).length;
  const total = SCALE_ITEMS.length;

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as DiagnoseResponse;
      if (!res.ok) throw new Error(data.error ?? "判定失败");
      setResult(data);
      // 暂存渠道结果，供综合报告使用
      saveChannelResult({
        channel: "questionnaire",
        scores: Object.fromEntries(data.scores.map((s) => [s.id, s.transformed])),
        weight: 3,
        note: `量表判定：${data.primary.name}（${data.primary.verdict}）${
          data.secondary.length > 0
            ? "，兼见 " + data.secondary.map((s) => `${s.name}（${s.verdict}）`).join("、")
            : ""
        }`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const sorted = [...result.scores].sort((a, b) => b.transformed - a.transformed);
    return (
      <div className="rounded-xl border border-rice-dark bg-white p-6">
        <h1 className="mb-1 text-2xl font-bold">
          您的体质判定：
          <span className="text-cinnabar">{result.primary.name}</span>
          <span className="ml-2 text-base font-normal text-ink-light">
            （{result.primary.verdict}）
          </span>
        </h1>
        {result.secondary.length > 0 && (
          <p className="mb-4 text-sm text-ink-light">
            兼夹倾向：{result.secondary.map((s) => `${s.name}（${s.verdict}）`).join("、")}
          </p>
        )}
        <h2 className="mb-2 mt-6 font-semibold">九种体质转化分</h2>
        <ScoreBars
          items={sorted.map((s) => ({
            name: s.name,
            score: s.transformed,
            highlight: s.id === result.primary.id,
            extra: s.verdict !== "否" ? s.verdict : "",
          }))}
        />
        <div className="mt-8 flex gap-3">
          <a
            href="/report"
            className="rounded-lg bg-cinnabar px-5 py-2 text-white hover:bg-cinnabar-light"
          >
            前往生成综合报告 →
          </a>
          <button
            onClick={() => setResult(null)}
            className="rounded-lg border border-rice-dark px-5 py-2 text-ink-light hover:bg-rice"
          >
            重新填写
          </button>
        </div>
        <p className="mt-6 text-xs text-ink-light/70">
          本结果仅供参考，不构成医疗建议。判定依据：《中医体质分类与判定》（CCMQ 计分规则）。
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">中医体质量表（CCMQ-60）</h1>
      <p className="mb-4 text-sm text-ink-light">
        请根据近一年的身体感受作答，共 {total} 题。已完成 {answered}/{total}
      </p>
      <div className="h-2 rounded-full bg-rice-dark">
        <div
          className="h-2 rounded-full bg-cinnabar transition-all"
          style={{ width: `${(answered / total) * 100}%` }}
        />
      </div>
      <div className="mt-6 space-y-4">
        {SCALE_ITEMS.map((item, idx) => (
          <div key={item.key} className="rounded-lg border border-rice-dark bg-white p-4">
            <p className="mb-3 text-sm font-medium">
              {idx + 1}. {item.text}
            </p>
            <div className="flex flex-wrap gap-2">
              {SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers((prev) => ({ ...prev, [item.key]: opt.value }))}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    answers[item.key] === opt.value
                      ? "border-cinnabar bg-cinnabar text-white"
                      : "border-rice-dark text-ink-light hover:border-cinnabar hover:text-cinnabar"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={answered < total || loading}
        className="mt-6 w-full rounded-lg bg-cinnabar py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "判定中…"
          : answered < total
            ? `还有 ${total - answered} 题未作答`
            : "提交并判定体质"}
      </button>
    </div>
  );
}
