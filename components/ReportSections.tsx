import { CONSTITUTIONS, type ConstitutionId } from "@/lib/tcm/constitutions";
import type { PatternHit, TreatmentPlan } from "@/lib/engine";
import ScoreBars from "@/components/ScoreBars";

/**
 * 报告分区渲染（纯展示组件，服务端/客户端页面共用）
 * 兼容两类数据：
 * - 新版结构化报告（含 patterns + plan）：分区渲染证候、方案
 * - 旧版报告（仅体质 + summary）：按旧格式渲染体质与调摄建议
 */

export interface ReportViewData {
  combined: { id: ConstitutionId; name: string; score: number }[];
  primary: { id: ConstitutionId; name: string };
  secondary: { id: ConstitutionId; name: string; score: number }[];
  isBalanced?: boolean;
  channelNotes: Record<string, string>;
  patterns?: { primary: PatternHit; secondary: PatternHit[]; signKeys: string[] } | null;
  plan?: TreatmentPlan | null;
  /** 人口学信息（新版报告；旧报告无此字段） */
  demographics?: { gender?: string; ageGroup?: string } | null;
}

const CHANNEL_LABELS: Record<string, string> = {
  intake: "主诉与四诊",
  questionnaire: "问卷问诊",
  chat: "AI 对话问诊",
  tongue: "舌诊",
  face: "面诊",
};

const DISCLAIMER = "本报告为中医辨证调理参考，不构成疾病诊断；方药须在执业中医师指导下使用。";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-rice-dark bg-white p-6">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ReportSections({
  data,
  analysis,
}: {
  data: ReportViewData;
  analysis: string;
}) {
  const { plan, patterns } = data;
  return (
    <div className="space-y-6">
      {/* 体质判定（保留） */}
      <Section title="体质判定">
        <p className="mb-3 text-sm">
          主体质：<span className="font-bold text-cinnabar">{data.primary.name}</span>
          {data.secondary.length > 0 && (
            <span className="ml-3 text-ink-light">
              兼夹：{data.secondary.map((s) => `${s.name}（${s.score} 分）`).join("、")}
            </span>
          )}
        </p>
        <ScoreBars
          items={data.combined.map((c) => ({
            name: c.name,
            score: c.score,
            highlight: c.id === data.primary.id,
          }))}
        />
      </Section>

      {/* 证候判定（新版结构化报告） */}
      {patterns && plan && (
        <Section title="证候判定">
          <p className="mb-2 text-sm">
            主证：
            <span className="font-bold text-cinnabar">
              {patterns.primary.name}（符合度 {patterns.primary.score} 分）
            </span>
            {patterns.secondary.length > 0 && (
              <span className="ml-3 text-ink-light">
                兼证：{patterns.secondary.map((s) => `${s.name}（${s.score} 分）`).join("、")}
              </span>
            )}
          </p>
          <div className="rounded-lg bg-rice/60 p-3">
            <p className="mb-1 text-xs font-semibold text-ink-light">命中明细（可解释依据）：</p>
            <ul className="space-y-1 text-xs text-ink-light">
              {patterns.primary.hits.map((h) => (
                <li key={h.signKey}>
                  <span
                    className={`mr-1 rounded px-1.5 py-0.5 ${
                      h.role === "主症"
                        ? "bg-cinnabar/10 text-cinnabar"
                        : h.role === "舌脉"
                          ? "bg-ink/10 text-ink"
                          : "bg-rice-dark text-ink-light"
                    }`}
                  >
                    {h.role}
                  </span>
                  {h.signLabel}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-xs text-ink-light">
            辨证归类：{plan.pattern.category} ｜ 舌脉参考：{plan.pattern.tonguePulse.join("；")}
          </p>
        </Section>
      )}

      {/* 辨证分析 */}
      <Section title="辨证分析">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-light">{analysis}</p>
      </Section>

      {plan ? (
        <>
          {/* 治则治法 */}
          <Section title="治则治法">
            <p className="text-sm text-ink-light">
              <span className="font-semibold text-ink">{plan.pattern.treatment}</span>
              <span className="ml-2">——{plan.pattern.pathogenesis}</span>
            </p>
          </Section>

          {/* 调理思路（新版报告；旧报告无 sequencing 则不渲染） */}
          {plan.sequencing && plan.sequencing.length > 0 && (
            <Section title="调理思路">
              <p className="mb-3 text-sm text-ink-light">
                当前问题：主证「{patterns?.primary.name ?? plan.pattern.name}」
                {patterns && patterns.secondary.length > 0
                  ? `，兼见${patterns.secondary.map((s) => s.name).join("、")}，须分步调理、先后有序。`
                  : "，证情单一，直治其证即可。"}
              </p>
              <div className="space-y-3">
                {plan.sequencing.map((s) => (
                  <div key={s.step} className="flex gap-3 rounded-lg bg-rice/60 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cinnabar text-xs font-bold text-white">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {s.target}
                        <span className="ml-2 text-xs font-normal text-cinnabar">{s.focus}</span>
                      </p>
                      <p className="mt-1 border-l-2 border-cinnabar/40 pl-2 text-xs leading-relaxed text-ink-light">
                        {s.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 方药参考（配警示条） */}
          <Section title="方药参考">
            <p className="mb-4 rounded-lg border border-cinnabar/40 bg-cinnabar/5 p-3 text-sm font-medium text-cinnabar">
              以下为经典方剂参考，须在执业中医师辨证指导下使用，切勿自行抓药服用。
              孕妇、哺乳期、儿童及慢性病患者尤须先经医师面诊。
            </p>
            {(data.demographics?.ageGroup === "<18" || data.demographics?.ageGroup === ">60") && (
              <p className="mb-4 -mt-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-800">
                老年/儿童用药剂量须由医师酌减，不可直接按参考剂量使用。
              </p>
            )}
            <div className="space-y-4">
              {plan.formulas.map((f) => (
                <div key={f.key} className="rounded-lg bg-rice/60 p-4">
                  <p className="mb-1 text-sm font-semibold">
                    {f.name}
                    <span className="ml-2 text-xs font-normal text-ink-light">{f.source}</span>
                  </p>
                  <p className="mb-2 text-xs text-ink-light">功效：{f.functions}</p>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {f.ingredients.map((ing) => (
                      <span
                        key={ing.name}
                        className="rounded bg-white px-2 py-0.5 text-xs text-ink"
                        title={ing.note}
                      >
                        {ing.name} {ing.dose}
                        {ing.note ? `（${ing.note}）` : ""}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-1 text-xs leading-relaxed text-ink-light">
                    {f.analysis && <li>方解：{f.analysis}</li>}
                    <li>煎服法：{f.preparation}</li>
                    <li>加减要点：{f.modifications}</li>
                    <li className="text-cinnabar">禁忌：{f.cautions}</li>
                    <li>中成药参考：{f.patent}</li>
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* 食疗方案 */}
          <Section title="食疗方案">
            <div className="grid gap-4 md:grid-cols-2">
              {plan.dietTherapies.map((d) => (
                <div key={d.key} className="rounded-lg bg-rice/60 p-4">
                  <p className="mb-1 text-sm font-semibold text-cinnabar">{d.name}</p>
                  <ul className="space-y-1 text-xs leading-relaxed text-ink-light">
                    <li>食材：{d.ingredients.join("、")}</li>
                    <li>做法：{d.method}</li>
                    <li>服法：{d.usage}</li>
                    {d.rationale && <li>机理：{d.rationale}</li>}
                    <li>宜忌：{d.cautions}</li>
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* 日常保健 */}
          <Section title="日常保健">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-rice/60 p-4">
                <h3 className="mb-2 text-sm font-semibold text-cinnabar">穴位保健</h3>
                <ul className="space-y-2 text-xs leading-relaxed text-ink-light">
                  {plan.wellness.acupoint.map((item, i) =>
                    typeof item === "string" ? (
                      // 旧版报告兼容：纯文本穴位建议
                      <li key={i} className="list-disc">{item}</li>
                    ) : (
                      <li key={i}>
                        <span className="font-medium text-ink">{item.name}</span>
                        <span className="text-ink-light">（{item.method}）</span>
                        <br />
                        <span className="text-ink-light/90">机理：{item.rationale}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
              {(
                [
                  ["导引运动", plan.wellness.exercise],
                  ["起居宜忌", plan.wellness.daily],
                ] as const
              ).map(([title, list]) => (
                <div key={title} className="rounded-lg bg-rice/60 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-cinnabar">{title}</h3>
                  <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-light">
                    {list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        /* 旧版报告 / 无证候结论：按体质调摄建议渲染 */
        <Section title="调摄要点">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["饮食调摄", CONSTITUTIONS[data.primary.id].advice.diet],
                ["起居调摄", CONSTITUTIONS[data.primary.id].advice.daily],
                ["运动调摄", CONSTITUTIONS[data.primary.id].advice.exercise],
                ["穴位保健", CONSTITUTIONS[data.primary.id].advice.acupoint],
              ] as const
            ).map(([title, list]) => (
              <div key={title} className="rounded-lg bg-rice/60 p-4">
                <h3 className="mb-2 text-sm font-semibold text-cinnabar">{title}</h3>
                <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-light">
                  {list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 采集记录 */}
      {Object.keys(data.channelNotes).length > 0 && (
        <Section title="采集记录">
          <ul className="space-y-2 text-sm text-ink-light">
            {Object.entries(data.channelNotes).map(([ch, note]) => (
              <li key={ch}>
                <span className="font-medium text-ink">{CHANNEL_LABELS[ch] ?? ch}：</span>
                {note}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 就医提示与免责声明 */}
      <div className="rounded-xl border border-cinnabar/40 bg-cinnabar/5 p-4 text-sm leading-relaxed text-ink">
        <p className="mb-1 font-semibold text-cinnabar">就医提示</p>
        <p>
          若出现剧烈胸痛、高热不退、出血、意识异常等症状，请立即就医，切勿依赖本系统调理。
          孕妇、哺乳期、儿童、老年人及慢性病患者，调理前请先经执业中医师面诊。
        </p>
      </div>
      <p className="rounded-lg bg-rice-dark/60 p-4 text-center text-sm text-ink-light">
        {DISCLAIMER}
      </p>
    </div>
  );
}
