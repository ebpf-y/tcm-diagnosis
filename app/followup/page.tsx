"use client";

import { useEffect, useMemo, useState } from "react";
import { SIGNS } from "@/lib/tcm/signs";
import { CHIEF_COMPLAINT_OPTIONS } from "@/lib/tcm/intake";
import { TREND_LABELS, type FollowUpTrend } from "@/lib/engine/followup";
import type { PatternHit } from "@/lib/engine";
import ScoreBars from "@/components/ScoreBars";

interface HistoryItem {
  id: string;
  createdAt: string;
  sources: string[];
  primaryName: string;
  patternName: string | null;
}

interface FollowUpResult {
  id: string;
  before: PatternHit[];
  after: PatternHit[];
  trend: FollowUpTrend;
  trendText: string;
}

/** 趋势提示配色：好转绿色系 / 平稳中性 / 有变化朱砂色警示 */
const TREND_STYLES: Record<FollowUpTrend, string> = {
  improved: "border-green-300 bg-green-50 text-green-700",
  stable: "border-rice-dark bg-rice/60 text-ink",
  worse: "border-cinnabar/40 bg-cinnabar/5 text-cinnabar",
};

const SIGN_LABELS = new Map(SIGNS.map((s) => [s.key, s.label]));
const signLabel = (key: string) => SIGN_LABELS.get(key) ?? key;

/** 新出现的不适：主诉词条（排除 red 急重症词条，急重症应直接提示就医） */
const NEW_COMPLAINT_OPTIONS = CHIEF_COMPLAINT_OPTIONS.filter((o) => !o.red);

export default function FollowUpPage() {
  // undefined=尚未解析 query；null=无 reportId（展示报告选择列表）
  const [reportId, setReportId] = useState<string | null | undefined>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [originalKeys, setOriginalKeys] = useState<string[]>([]);
  const [reportMeta, setReportMeta] = useState<{ createdAt: string; primaryName: string } | null>(
    null
  );
  const [noPatterns, setNoPatterns] = useState(false);
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 用 window.location.search 解析 query，避开 useSearchParams 的 Suspense 构建限制
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("reportId");
    setReportId(id);
    if (!id) {
      void fetch("/api/report")
        .then((r) => r.json())
        .then((d: HistoryItem[]) => setHistory(d))
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!reportId) return;
    void fetch(`/api/report/${reportId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "报告加载失败");
        return d as {
          createdAt: string;
          result: {
            primary?: { name?: string };
            patterns?: { primary?: PatternHit; signKeys?: string[] } | null;
          };
        };
      })
      .then((d) => {
        const keys = d.result.patterns?.signKeys;
        if (!keys || keys.length === 0) {
          setNoPatterns(true);
          return;
        }
        setOriginalKeys(keys);
        setReportMeta({
          createdAt: d.createdAt,
          primaryName: d.result.patterns?.primary?.name ?? d.result.primary?.name ?? "未知",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "报告加载失败"));
  }, [reportId]);

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  async function handleSubmit() {
    if (!reportId) return;
    setLoading(true);
    setError("");
    try {
      // 复诊体征 = 仍存在的原有体征 ∪ 新增主诉词条携带的体征
      const keys = new Set(kept);
      added.forEach((ck) => {
        const opt = NEW_COMPLAINT_OPTIONS.find((o) => o.key === ck);
        for (const sk of opt?.signs ?? []) keys.add(sk);
      });
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, signKeys: Array.from(keys) }),
      });
      const data = (await res.json()) as FollowUpResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "复诊复评失败");
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "复诊复评失败");
    } finally {
      setLoading(false);
    }
  }

  const hitItems = useMemo(
    () => (hits: PatternHit[], highlightId?: string) =>
      hits.map((h) => ({
        name: h.name,
        score: h.score,
        highlight: h.id === highlightId,
      })),
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-bold">复诊复评</h1>
        <p className="text-sm text-ink-light">
          对照初诊报告复核症状体征变化，评估证候趋势，供调理参考。
        </p>
      </div>

      {reportId === undefined ? null : reportId === null ? (
        /* —— 未指定报告：列出历史报告供选择 —— */
        <section className="rounded-xl border border-rice-dark bg-white p-6">
          <h2 className="mb-3 font-semibold">选择初诊报告</h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-light">
              暂无历史报告。请先前往
              <a href="/report" className="mx-1 text-cinnabar underline">
                综合报告
              </a>
              完成采集并生成报告。
            </p>
          ) : (
            <ul className="divide-y divide-rice-dark">
              {history.map((h) => (
                <li key={h.id}>
                  <a
                    href={`/followup?reportId=${h.id}`}
                    className="flex items-center justify-between py-3 text-sm hover:text-cinnabar"
                  >
                    <span>
                      <span className="mr-2 font-medium">{h.primaryName}</span>
                      {h.patternName && (
                        <span className="mr-2 rounded-full bg-cinnabar/10 px-2 py-0.5 text-xs text-cinnabar">
                          {h.patternName}
                        </span>
                      )}
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
      ) : result ? (
        /* —— 复评结果 —— */
        <>
          <section className={`rounded-xl border p-6 ${TREND_STYLES[result.trend]}`}>
            <p className="mb-1 text-lg font-bold">趋势：{TREND_LABELS[result.trend]}</p>
            <p className="text-sm">{result.trendText}</p>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-rice-dark bg-white p-6">
              <h2 className="mb-3 font-semibold">初诊证候</h2>
              {result.before.length === 0 ? (
                <p className="text-sm text-ink-light">初诊未获得证候评分。</p>
              ) : (
                <ScoreBars items={hitItems(result.before, result.before[0]?.id)} />
              )}
            </section>
            <section className="rounded-xl border border-rice-dark bg-white p-6">
              <h2 className="mb-3 font-semibold">复诊证候</h2>
              {result.after.length === 0 ? (
                <p className="text-sm text-ink-light">
                  本次未命中证候线索，原有症状体征可能已缓解。
                </p>
              ) : (
                <ScoreBars items={hitItems(result.after, result.after[0]?.id)} />
              )}
            </section>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/report"
              className="rounded-lg bg-cinnabar px-5 py-2 text-sm text-white hover:opacity-90"
            >
              重新生成综合报告
            </a>
            <a
              href={`/report/${reportId}`}
              className="rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light hover:bg-rice"
            >
              返回初诊报告
            </a>
          </div>

          <p className="text-xs text-ink-light/70">
            复诊复评仅供参考，不构成医疗建议；证候判断以医师面诊为准。
          </p>
        </>
      ) : noPatterns ? (
        <section className="rounded-xl border border-rice-dark bg-white p-6">
          <p className="text-sm text-ink-light">
            该报告未包含证候结论，无法进行复诊复评。建议重新完成综合采集生成新报告。
          </p>
          <a
            href="/report"
            className="mt-3 inline-block rounded-lg bg-cinnabar px-5 py-2 text-sm text-white"
          >
            前往综合报告
          </a>
        </section>
      ) : (
        /* —— 复评采集表单 —— */
        <>
          {reportMeta && (
            <p className="text-sm text-ink-light">
              初诊报告：{new Date(reportMeta.createdAt).toLocaleString("zh-CN")} · 主证
              <span className="mx-1 font-medium text-cinnabar">{reportMeta.primaryName}</span>
            </p>
          )}

          <section className="rounded-xl border border-rice-dark bg-white p-6">
            <h2 className="mb-1 font-semibold">以下症状体征目前仍存在吗？</h2>
            <p className="mb-3 text-xs text-ink-light">
              勾选仍然存在的项目；已缓解的保持不勾选即可。
              若初诊包含脉诊数据，请以与初诊相同的模式（业余/专业）复测，两次口径一致才有可比性。
            </p>
            {originalKeys.length === 0 ? (
              <p className="text-sm text-ink-light">正在加载初诊体征…</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {originalKeys.map((key) => (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-rice-dark px-3 py-2 text-sm hover:bg-rice/50">
                      <input
                        type="checkbox"
                        checked={kept.has(key)}
                        onChange={() => toggle(kept, key, setKept)}
                        className="accent-cinnabar"
                      />
                      {signLabel(key)}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-rice-dark bg-white p-6">
            <h2 className="mb-1 font-semibold">新出现的不适</h2>
            <p className="mb-3 text-xs text-ink-light">
              初诊后新出现的症状，可多选；没有则不选。
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {NEW_COMPLAINT_OPTIONS.map((o) => (
                <li key={o.key}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-rice-dark px-3 py-2 text-sm hover:bg-rice/50">
                    <input
                      type="checkbox"
                      checked={added.has(o.key)}
                      onChange={() => toggle(added, o.key, setAdded)}
                      className="accent-cinnabar"
                    />
                    {o.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={() => void handleSubmit()}
            disabled={loading || originalKeys.length === 0}
            className="rounded-lg bg-cinnabar px-6 py-2 text-white disabled:opacity-40"
          >
            {loading ? "评估中…" : "提交复评"}
          </button>

          <p className="text-xs text-ink-light/70">
            复诊复评仅供参考，不构成医疗建议；如出现剧烈胸痛、高热不退等急重表现，请立即就医。
          </p>
        </>
      )}
    </div>
  );
}
