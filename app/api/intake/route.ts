import { NextResponse } from "next/server";
import {
  intakeToSigns,
  intakeSummary,
  scoreSigns,
  scorePatterns,
  topSignConstitutions,
} from "@/lib/engine";
import { CHIEF_COMPLAINT_OPTIONS, type IntakeForm } from "@/lib/tcm/intake";

export const runtime = "nodejs";

/**
 * POST /api/intake
 * 入参：IntakeForm（主诉与四诊信息采集表单）
 * 出参：{ signKeys, scores, top, patterns, note, redFlags }
 * - signKeys：表单转换出的体征 key（证候辨证输入）
 * - note：主诉+病程+脉象摘要文本（渠道备注 / 主诉注入用）
 * - redFlags：命中的急重症词条（前端应提示立即就医）
 */
export async function POST(req: Request) {
  try {
    const intake = (await req.json()) as IntakeForm;
    if (!intake || !Array.isArray(intake.chiefComplaints)) {
      return NextResponse.json({ error: "表单格式不正确" }, { status: 400 });
    }

    const redFlags = CHIEF_COMPLAINT_OPTIONS.filter(
      (o) => o.red && intake.chiefComplaints.includes(o.key)
    ).map((o) => o.label);

    const signKeys = intakeToSigns(intake);
    const scores = scoreSigns(signKeys);
    const top = topSignConstitutions(scores);
    const patterns = scorePatterns(signKeys, {
      availableCategories: ["symptom", "pulse", "listening"],
    }).slice(0, 3);
    const note = intakeSummary(intake) || "已完成主诉与四诊信息采集";

    return NextResponse.json({ signKeys, scores, top, patterns, note, redFlags });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "采集信息处理失败" },
      { status: 500 }
    );
  }
}
