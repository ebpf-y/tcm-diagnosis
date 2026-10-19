import { execSync } from "node:child_process";

/**
 * 构建时烘焙版本信息（部署核验用）：
 * - git 部署：短 hash + 提交日期（如 6d512fc (2026-10-19)）
 * - tar 本地上传（服务器无 .git）：退化为构建时间戳
 * 经 NEXT_PUBLIC_* 内联进产物，footer 与 /api/version 展示。
 */
function buildVersion() {
  try {
    const hash = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const date = execSync("git log -1 --format=%cd --date=short", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return `${hash} (${date})`;
  } catch {
    return null;
  }
}

const BUILD_TIME = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion() ?? `local (${BUILD_TIME})`,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
  },
};

export default nextConfig;
