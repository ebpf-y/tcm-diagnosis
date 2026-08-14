"use client";

import { useEffect, useRef, useState } from "react";
import { saveChannelResult, loadChannelResults } from "@/lib/session";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** 选择式问诊每轮协议（与 /api/chat 一致） */
interface ChatTurn {
  reply: string;
  options: string[];
  done: boolean;
}

interface PatternTop {
  id: string;
  name: string;
  score: number;
}

interface ExtractResponse {
  summary: string;
  signKeys: string[];
  scores: Record<string, number>;
  top: { id: string; name: string; score: number }[];
  patterns?: PatternTop[];
  error?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [extract, setExtract] = useState<ExtractResponse | null>(null);
  const [extracting, setExtracting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, options]);

  // 进入页面自动发起首轮问诊；若已完成「主诉与四诊」采集，注入主诉供医师参考
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const intake = loadChannelResults().find((c) => c.channel === "intake");
    const seed: Msg[] = intake
      ? [{ role: "user", content: `我的主诉是：${intake.note}（此前已完成主诉与四诊信息采集，请围绕主诉深入问诊，不必重复询问已提供的信息）` }]
      : [];
    if (seed.length > 0) setMessages(seed);
    void ask(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 发起一轮问诊：history 为含用户最新作答的完整记录 */
  async function ask(history: Msg[]) {
    setLoading(true);
    setOptions([]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const turn = (await res.json()) as ChatTurn;
      setMessages([...history, { role: "assistant", content: turn.reply }]);
      setOptions(turn.options ?? []);
      setDone(turn.done === true);
    } catch (err) {
      setMessages([
        ...history,
        {
          role: "assistant",
          content: `（对话服务异常：${err instanceof Error ? err.message : "未知错误"}）`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /** 用户选择/输入一个回答 */
  function answer(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setCustomText("");
    setCustomOpen(false);
    void ask([...messages, { role: "user", content: trimmed }]);
  }

  async function handleExtract() {
    setExtracting(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, action: "extract" }),
      });
      const data = (await res.json()) as ExtractResponse;
      if (!res.ok) throw new Error(data.error ?? "提取失败");
      setExtract(data);
      saveChannelResult({
        channel: "chat",
        scores: data.scores,
        weight: 1,
        note: data.summary,
        signKeys: data.signKeys,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "提取失败");
    } finally {
      setExtracting(false);
    }
  }

  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-col">
      <h1 className="mb-1 text-2xl font-bold">AI 对话问诊</h1>
      <p className="mb-4 text-sm text-ink-light">
        AI 医师按"十问歌"思路逐轮问诊，点选选项作答即可，4~6 轮后生成辨证结论。
      </p>

      <div className="mb-4 h-[26rem] space-y-3 overflow-y-auto rounded-xl border border-rice-dark bg-white p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "bg-cinnabar text-white" : "bg-rice text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-rice px-4 py-2 text-sm text-ink-light">医师思考中…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 选项区 */}
      {!done && options.length > 0 && !loading && (
        <div className="mb-3 flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              className="rounded-full border border-cinnabar bg-white px-4 py-2 text-sm text-cinnabar transition hover:bg-cinnabar hover:text-white"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* 自定义回答兜底 */}
      {!done && !loading && (
        <div className="mb-3">
          {customOpen ? (
            <div className="flex gap-2">
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && answer(customText)}
                placeholder="请自行描述您的情况…"
                autoFocus
                className="flex-1 rounded-lg border border-rice-dark bg-white px-4 py-2 text-sm outline-none focus:border-cinnabar"
              />
              <button
                onClick={() => answer(customText)}
                disabled={!customText.trim()}
                className="rounded-lg bg-cinnabar px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                发送
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCustomOpen(true)}
              className="text-xs text-ink-light/70 underline hover:text-cinnabar"
            >
              以上都不是？自行描述…
            </button>
          )}
        </div>
      )}

      {/* 生成结论 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleExtract()}
          disabled={extracting || userTurns < 2}
          className="rounded-lg bg-cinnabar px-5 py-2 text-sm text-white disabled:opacity-40"
          title={userTurns < 2 ? "至少完成 2 轮对话后可用" : "提取症状并生成辨证结论"}
        >
          {extracting ? "分析中…" : "生成结论"}
        </button>
        {done && !extract && (
          <span className="text-xs text-ink-light">问诊已完成，可生成结论。</span>
        )}
      </div>

      {extract && (
        <div className="mt-6 rounded-xl border border-rice-dark bg-white p-6">
          <h2 className="mb-2 font-semibold">问诊小结</h2>
          <p className="mb-3 text-sm text-ink-light">{extract.summary}</p>
          {extract.patterns && extract.patterns.length > 0 && (
            <p className="mb-2 text-sm">
              证候判定：
              {extract.patterns.map((p, i) => (
                <span
                  key={p.id}
                  className={`mr-2 rounded-full px-3 py-1 ${
                    i === 0 ? "bg-cinnabar text-white" : "bg-rice text-cinnabar"
                  }`}
                >
                  {i === 0 ? "主证 " : "兼证 "}
                  {p.name} {p.score.toFixed(0)} 分
                </span>
              ))}
            </p>
          )}
          {extract.top.length > 0 && (
            <p className="text-sm">
              体质倾向：
              {extract.top.map((t) => (
                <span key={t.id} className="mr-2 rounded-full bg-rice px-3 py-1 text-cinnabar">
                  {t.name} {t.score.toFixed(0)} 分
                </span>
              ))}
            </p>
          )}
          {(!extract.patterns || extract.patterns.length === 0) && extract.top.length === 0 && (
            <p className="text-sm text-ink-light">未识别到明显偏颇倾向，建议结合问卷进一步确认。</p>
          )}
          <a
            href="/report"
            className="mt-4 inline-block rounded-lg bg-cinnabar px-5 py-2 text-sm text-white hover:bg-cinnabar-light"
          >
            前往生成综合报告 →
          </a>
        </div>
      )}
      <p className="mt-4 text-xs text-ink-light/70">
        问诊内容为中医辨证调理参考，不构成疾病诊断；如有不适请及时就医。
      </p>
    </div>
  );
}
