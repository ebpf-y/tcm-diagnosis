import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** GET /api/report/[id] —— 报告详情 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) {
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
