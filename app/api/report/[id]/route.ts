import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessReport } from "@/lib/report-access";

export const runtime = "nodejs";

/** GET /api/report/[id]?token=xxx —— 报告详情（持令牌访问；旧报告无令牌兼容放行） */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }
  const token = new URL(req.url).searchParams.get("token");
  if (!canAccessReport(report, token)) {
    // 统一返回 404，避免通过 403 探测报告是否存在
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }
  return NextResponse.json({
    id: report.id,
    createdAt: report.createdAt,
    sources: JSON.parse(report.sources),
    result: JSON.parse(report.resultJson),
    summary: report.summary,
    inputSummary: JSON.parse(report.inputSummary),
  });
}
