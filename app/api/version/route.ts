import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/version —— 版本信息（构建时烘焙；供部署后远程核验）
 * 返回 { version, buildTime }：git 部署为「短hash (提交日期)」，
 * tar 上传（无 .git）退化为构建时间标识。
 */
export async function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
  });
}
