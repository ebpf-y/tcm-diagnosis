import { NextResponse } from "next/server";
import { diagnose, type AnswerMap } from "@/lib/engine";

/**
 * POST /api/diagnose
 * 入参：{ answers: { q1: 1~5, ... } }
 * 出参：规则引擎体质判定结果
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { answers?: AnswerMap };
    if (!body.answers || typeof body.answers !== "object") {
      return NextResponse.json({ error: "缺少 answers 字段" }, { status: 400 });
    }
    const result = diagnose(body.answers);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "判定失败" },
      { status: 400 }
    );
  }
}
