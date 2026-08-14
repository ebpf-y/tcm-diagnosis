"use client";

import { useState } from "react";
import { saveChannelResult } from "@/lib/session";

type Mode = "tongue" | "face";

interface VisionResponse {
  description: string;
  signKeys: string[];
  scores: Record<string, number>;
  top: { id: string; name: string; score: number }[];
  patterns?: { id: string; name: string; score: number }[];
  error?: string;
}

const MODE_CONFIG: Record<Mode, { title: string; hint: string; weight: number }> = {
  tongue: {
    title: "舌诊",
    hint: "请在光线充足处自然伸出舌头拍摄，避免食用染色食物（咖啡、火龙果等）后拍摄。",
    weight: 1.5,
  },
  face: {
    title: "面诊",
    hint: "请素颜、正对自然光拍摄面部，避免美颜滤镜，以保证分析准确。",
    weight: 1.5,
  },
};

/** 压缩图片到最长边 1024px 的 JPEG base64（控制上传体积） */
function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 1024;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("浏览器不支持图片处理"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(img.src);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = URL.createObjectURL(file);
  });
}

function UploadCard({ mode }: { mode: Mode }) {
  const cfg = MODE_CONFIG[mode];
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("仅支持 JPG / PNG / WebP 图片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片不能超过 10MB");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { base64, mimeType } = await compressImage(file);
      setPreview(`data:${mimeType};base64,${base64}`);
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType, mode }),
      });
      const data = (await res.json()) as VisionResponse;
      if (!res.ok) throw new Error(data.error ?? "分析失败");
      setResult(data);
      saveChannelResult({
        channel: mode,
        scores: data.scores,
        weight: cfg.weight,
        note: data.description.replace(/\n/g, "；"),
        signKeys: data.signKeys,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-rice-dark bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">{cfg.title}</h2>
      <p className="mb-4 text-xs text-ink-light">{cfg.hint}</p>

      <label className="flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-rice-dark bg-rice/50 text-sm text-ink-light hover:border-cinnabar">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={cfg.title} className="h-full w-full object-cover" />
        ) : (
          <span>{loading ? "分析中…" : "点击拍照 / 上传图片"}</span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="hidden"
          disabled={loading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold">分析结果</h3>
          <p className="whitespace-pre-wrap rounded-lg bg-rice/60 p-3 text-xs leading-relaxed text-ink-light">
            {result.description}
          </p>
          {result.patterns && result.patterns.length > 0 && (
            <p className="mt-2 text-sm">
              证候提示：
              {result.patterns.map((p, i) => (
                <span
                  key={p.id}
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                    i === 0 ? "bg-cinnabar text-white" : "bg-rice text-cinnabar"
                  }`}
                >
                  {p.name} {p.score.toFixed(0)} 分
                </span>
              ))}
            </p>
          )}
          {result.top.length > 0 && (
            <p className="mt-2 text-sm">
              体质提示：
              {result.top.map((t) => (
                <span key={t.id} className="ml-1 rounded-full bg-rice px-2 py-0.5 text-xs text-cinnabar">
                  {t.name} {t.score.toFixed(0)} 分
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImagingPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">舌诊 / 面诊</h1>
      <p className="mb-6 text-sm text-ink-light">
        照片仅用于即时分析，不会在服务器留存，数据库只保存分析得出的文字特征。
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <UploadCard mode="tongue" />
        <UploadCard mode="face" />
      </div>
      <a
        href="/report"
        className="mt-6 inline-block rounded-lg bg-cinnabar px-5 py-2 text-white hover:bg-cinnabar-light"
      >
        前往生成综合报告 →
      </a>
      <p className="mt-4 text-xs text-ink-light/70">分析结果仅供参考，不构成医疗建议。</p>
    </div>
  );
}
