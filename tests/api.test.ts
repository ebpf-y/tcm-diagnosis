/**
 * API 集成测试：路由层接线验证（引擎层以外的第二道回归门）
 *
 * 覆盖：报告生成（八纲/孕哺禁忌/脉象转诊提示接线）、历史列表隔离、
 * 删除 API（令牌校验）、复诊 PRO 入库。
 *
 * 使用独立测试数据库（prisma/test.db），beforeAll 时自动 prisma db push；
 * LLM/视觉 Key 置空走 mock 模式，不触网。
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";

process.env.DATABASE_URL = "file:./test.db";
process.env.LLM_API_KEY = "";
process.env.VISION_API_KEY = "";

// 路由 handler 在 beforeAll 中动态导入（须在 db push 之后、且 env 设置之后）
let reportPOST: (typeof import("@/app/api/report/route"))["POST"];
let reportGET: (typeof import("@/app/api/report/route"))["GET"];
let reportDetailGET: (typeof import("@/app/api/report/[id]/route"))["GET"];
let reportDELETE: (typeof import("@/app/api/report/[id]/route"))["DELETE"];
let followupPOST: (typeof import("@/app/api/followup/route"))["POST"];

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
  ({ POST: reportPOST, GET: reportGET } = await import("@/app/api/report/route"));
  ({ GET: reportDetailGET, DELETE: reportDELETE } = await import(
    "@/app/api/report/[id]/route"
  ));
  ({ POST: followupPOST } = await import("@/app/api/followup/route"));
});

describe("POST /api/report", () => {
  it("空渠道 + 空体征 → 400", async () => {
    const res = await reportPOST(jsonReq("http://t/api/report", {}));
    expect(res.status).toBe(400);
  });

  it("怀孕用户 + 结代脉：八纲/孕妇禁忌/心电图转诊接线正确", async () => {
    const res = await reportPOST(
      jsonReq("http://t/api/report", {
        channels: [
          {
            channel: "intake",
            scores: {},
            weight: 2,
            signKeys: ["sym_alternating", "pulse_jiedai"],
            pulseMode: "amateur",
          },
        ],
        channelNotes: { intake: "女；主诉：忽冷忽热；孕哺状态：怀孕中" },
        demographics: {
          gender: "female",
          ageGroup: "18-40",
          pregnancy: "怀孕中",
          course: "1w-1m",
          pro: { sleep: 2, overall: 2 },
        },
        signKeys: ["sym_alternating", "pulse_jiedai"],
      })
    );
    expect(res.status).toBe(200);
    const d = (await res.json()) as {
      id: string;
      accessToken: string;
      patterns: { primary: { id: string } } | null;
      bagang: { hanre: { value: string } } | null;
      contraWarnings: { formulaKey: string; conditions: string[] }[];
      advisories: string[];
      analysis: string;
      proBaseline: { sleep?: number } | null;
    };
    expect(d.patterns?.primary.id).toBe("shaoyang_shuli");
    expect(d.bagang).not.toBeNull();
    expect(d.proBaseline?.sleep).toBe(2); // 初诊 PRO 基线随报告存档
    expect(
      d.contraWarnings.some(
        (w) => w.formulaKey === "xiaochaihu" && w.conditions.includes("孕妇")
      )
    ).toBe(true);
    expect(d.advisories.some((a) => a.includes("心电图"))).toBe(true);
    expect(d.advisories.some((a) => a.includes("怀孕中"))).toBe(true);
    expect(d.analysis.length).toBeGreaterThan(0); // mock 模式回退模板
    // 供后续 DELETE 测试用例使用
    lastReport = d;
  });

  it("弱证据（单一体征）→ 不出证候结论（证据不足门槛）", async () => {
    const res = await reportPOST(
      jsonReq("http://t/api/report", {
        channels: [
          {
            channel: "intake",
            scores: {},
            weight: 2,
            signKeys: ["sym_cold"],
            pulseMode: "amateur",
          },
        ],
        signKeys: ["sym_cold"],
      })
    );
    expect(res.status).toBe(200);
    const d = (await res.json()) as {
      patterns: unknown;
      plan: unknown;
      formulaWithheld: boolean;
      analysis: string;
    };
    expect(d.patterns).toBeNull();
    expect(d.plan).toBeNull();
    expect(d.formulaWithheld).toBe(false);
    expect(d.analysis).toContain("依据不足");
    const del = await reportDELETE(new Request("http://t/api/report/x"), {
      params: { id: "nonexistent" },
    });
    expect(del.status).toBe(404);
  });
});

let lastReport: { id: string; accessToken: string } | null = null;

describe("GET /api/report（历史列表设备隔离）", () => {
  it("无 ids 参数 → 返回空列表（不泄露全库）", async () => {
    const res = await reportGET(new Request("http://t/api/report"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("DELETE /api/report/[id]", () => {
  it("错误令牌 404；正确令牌删除成功；删除后详情 404", async () => {
    expect(lastReport).not.toBeNull();
    const { id, accessToken } = lastReport!;
    const bad = await reportDELETE(
      new Request(`http://t/api/report/${id}?token=wrong`),
      { params: { id } }
    );
    expect(bad.status).toBe(404);
    const ok = await reportDELETE(
      new Request(`http://t/api/report/${id}?token=${accessToken}`),
      { params: { id } }
    );
    expect(ok.status).toBe(200);
    const gone = await reportDetailGET(
      new Request(`http://t/api/report/${id}?token=${accessToken}`),
      { params: { id } }
    );
    expect(gone.status).toBe(404);
  });
});

describe("POST /api/followup", () => {
  it("PRO 自评随复诊入库并回显", async () => {
    // 建一份临时报告作为初诊
    const res = await reportPOST(
      jsonReq("http://t/api/report", {
        channels: [
          {
            channel: "intake",
            scores: {},
            weight: 2,
            signKeys: ["sym_cold", "sym_diarrhea", "tongue_pale"],
            pulseMode: "amateur",
          },
        ],
        demographics: { gender: "female", ageGroup: "40-60" },
        signKeys: ["sym_cold", "sym_diarrhea", "tongue_pale"],
      })
    );
    const report = (await res.json()) as { id: string; accessToken: string };
    const fu = await followupPOST(
      jsonReq("http://t/api/followup", {
        reportId: report.id,
        token: report.accessToken,
        signKeys: ["sym_cold"],
        pro: { sleep: 4, energy: 3, overall: 2 },
      })
    );
    expect(fu.status).toBe(200);
    const d = (await fu.json()) as { trend: string; pro?: { sleep: number } };
    expect(["improved", "stable", "worse"]).toContain(d.trend);
    expect(d.pro?.sleep).toBe(4);
    // 清理
    await reportDELETE(
      new Request(`http://t/api/report/${report.id}?token=${report.accessToken}`),
      { params: { id: report.id } }
    );
  });

  it("非法 PRO 分值被丢弃（不入库）", async () => {
    const res = await reportPOST(
      jsonReq("http://t/api/report", {
        channels: [
          { channel: "intake", scores: {}, weight: 2, signKeys: ["sym_cold"], pulseMode: "amateur" },
        ],
        signKeys: ["sym_cold"],
      })
    );
    const report = (await res.json()) as { id: string; accessToken: string };
    const fu = await followupPOST(
      jsonReq("http://t/api/followup", {
        reportId: report.id,
        token: report.accessToken,
        signKeys: ["sym_cold"],
        pro: { sleep: 9, overall: 0 },
      })
    );
    const d = (await fu.json()) as { pro?: { sleep?: number; overall?: number } };
    expect(d.pro).toBeUndefined();
    await reportDELETE(
      new Request(`http://t/api/report/${report.id}?token=${report.accessToken}`),
      { params: { id: report.id } }
    );
  });
});
