"use client";

import { useState } from "react";
import { removeMyReport } from "@/lib/session";

/**
 * 报告删除按钮（隐私合规：使用者可随时删除自己的报告数据）。
 * 须持访问令牌（与详情页同一持有证明）；删除后清理本机记录并返回报告列表。
 */
export default function ReportDeleteButton({
  reportId,
  token,
}: {
  reportId: string;
  token?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/report/${reportId}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "删除失败");
      removeMyReport(reportId);
      window.location.href = "/report";
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="inline-block">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light/70 hover:border-red-400 hover:text-red-600"
        >
          删除本报告
        </button>
      ) : (
        <span className="inline-flex items-center gap-2">
          <span className="text-xs text-red-600">确认删除？报告与全部复诊记录将一并删除，不可恢复。</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs text-white disabled:opacity-40"
          >
            {busy ? "删除中…" : "确认删除"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-rice-dark px-4 py-2 text-xs text-ink-light"
          >
            取消
          </button>
        </span>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
