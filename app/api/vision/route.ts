import { NextResponse } from "next/server";
import { analyzeImage, type VisionMode } from "@/lib/llm/client";
import {
  matchSignsFromText,
  scoreSigns,
  topSignConstitutions,
  scorePatterns,
  visionFindingsToSigns,
} from "@/lib/engine";
import { logUsage } from "@/lib/usage-log";

export const runtime = "nodejs";

/** 前端压缩后的图片上限（base64 字符数，约对应 2MB 原图） */
const MAX_BASE64_LEN = 3_000_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * POST /api/vision
 * 入参：{ image: base64字符串, mimeType, mode: "tongue" | "face" }
 * 出参：{ description, signKeys, scores, top }
 * 说明：照片只在内存中转发给多模态模型，不落盘、不入库，仅返回分析文本。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      image?: string;
      mimeType?: string;
      mode?: VisionMode;
    };
    if (!body.image || !body.mimeType || !body.mode) {
      return NextResponse.json({ error: "缺少 image / mimeType / mode 参数" }, { status: 400 });
    }
    if (body.mode !== "tongue" && body.mode !== "face") {
      return NextResponse.json({ error: "mode 仅支持 tongue / face" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(body.mimeType)) {
      return NextResponse.json({ error: "仅支持 JPG / PNG / WebP 图片" }, { status: 400 });
    }
    if (body.image.length > MAX_BASE64_LEN) {
      return NextResponse.json({ error: "图片过大，请压缩后重试（建议 2MB 以内）" }, { status: 400 });
    }

    const raw = await analyzeImage(body.image, body.mimeType, body.mode);
    // 结构化 JSON 优先：枚举字段确定性映射为体征；
    // 解析失败（模型未按协议输出）回退为自由文本关键词匹配
    let description = raw;
    let signKeys: string[];
    /** 图像质量门控：不合格照片不产体征（防止低质量图像参与辨证与互证） */
    let quality: "合格" | "不合格" | null = null;
    let qualityIssue = "";
    try {
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<
        string,
        unknown
      >;
      if (typeof json.description !== "string") throw new Error("缺少 description 字段");
      description = json.description;
      signKeys = visionFindingsToSigns(body.mode, json);
      if (json.quality === "不合格") {
        quality = "不合格";
        qualityIssue = typeof json.qualityIssue === "string" ? json.qualityIssue : "";
        signKeys = [];
      } else if (json.quality === "合格") {
        quality = "合格";
      }
    } catch {
      signKeys = matchSignsFromText(raw, body.mode === "tongue" ? "tongue" : "face");
    }
    const scores = scoreSigns(signKeys);
    const top = topSignConstitutions(scores);
    const patterns = scorePatterns(signKeys, {
      availableCategories: [body.mode === "tongue" ? "tongue" : "face"],
    }).slice(0, 3);
    void logUsage("vision.analyze", {
      mode: body.mode,
      quality: quality ?? "未知",
      signCount: signKeys.length,
    });

    return NextResponse.json({ description, signKeys, scores, top, patterns, quality, qualityIssue });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "图像分析失败" },
      { status: 500 }
    );
  }
}
