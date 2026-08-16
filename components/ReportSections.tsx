import { CONSTITUTIONS, type ConstitutionId } from "@/lib/tcm/constitutions";
import type { ContraWarning, FormulaEntry, PatternHit, TreatmentPlan } from "@/lib/engine";
import type { Formula } from "@/lib/tcm/formulas";
import { FORMULA_ROLES, type FormulaRole } from "@/lib/tcm/formula-roles";
import { acupointLocations } from "@/lib/tcm/acupoints";
import ScoreBars from "@/components/ScoreBars";

/**
 * 报告分区渲染（纯展示组件，服务端/客户端页面共用）
 * 兼容两类数据：
 * - 新版结构化报告（含 patterns + plan）：分区渲染证候、方案
 * - 旧版报告（仅体质 + summary）：按旧格式渲染体质与调摄建议
 * 旧版 plan.formulas 为 Formula[]，新版为 FormulaEntry[]，渲染时归一化。
 */

/** 旧版报告的方剂条目兼容：归一化为 FormulaEntry */
function toEntry(f: FormulaEntry | Formula): FormulaEntry {
  return "formula" in f ? (f as FormulaEntry) : { formula: f as Formula, appliedMods: [] };
}

export interface ReportViewData {
  /** 体质综合分（仅 CCMQ 问卷渠道；未做问卷时为 null） */
  combined: { id: ConstitutionId; name: string; score: number }[] | null;
  /** 主体质（未做问卷时为 null） */
  primary: { id: ConstitutionId; name: string } | null;
  secondary: { id: ConstitutionId; name: string; score: number }[];
  isBalanced?: boolean;
  /** 是否已完成问卷问诊 */
  questionnaireDone?: boolean;
  channelNotes: Record<string, string>;
  patterns?: {
    primary: PatternHit;
    secondary: PatternHit[];
    signKeys: string[];
    /** 专家视图用：全部候选证候（前 6） */
    all?: PatternHit[];
  } | null;
  plan?: TreatmentPlan | null;
  /** 专家模式报告（脉诊专业录入） */
  expertMode?: boolean;
  /** 证据不足不出具方药（双阈值） */
  formulaWithheld?: boolean;
  /** 禁忌交叉校验警示 */
  contraWarnings?: ContraWarning[];
  /** 体检指标健康提示（体病相关） */
  advisories?: string[];
  /** 人口学与健康背景信息（新版报告；旧报告无此字段） */
  demographics?: {
    gender?: string;
    ageGroup?: string;
    history?: string[];
    medications?: string;
    course?: string;
    checkup?: string[];
  } | null;
  /** 信息矛盾点（四诊合参冲突检测；旧报告无此字段） */
  conflicts?: string[];
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

/** 单首方剂卡片（含选方理由、个体化加减与君臣佐使结构化方解） */
function FormulaCard({ entry }: { entry: FormulaEntry | Formula }) {
  const { formula: f, reason, appliedMods } = toEntry(entry);
  const roles = FORMULA_ROLES[f.key];
  /** 药味所属的配伍地位（用于药味上色；含括号异名的模糊匹配） */
  function roleOfHerb(ingName: string): FormulaRole["role"] | null {
    if (!roles) return null;
    const base = ingName.replace(/（.*）/, "");
    for (const r of roles) {
      if (r.herbs.some((h) => ingName.includes(h) || h.includes(base))) return r.role;
    }
    return null;
  }
  const chipClass: Record<FormulaRole["role"], string> = {
    君: "bg-cinnabar text-white",
    臣: "bg-cinnabar/20 text-cinnabar",
    佐: "bg-white text-ink",
    使: "bg-rice-dark/70 text-ink-light",
  };
  return (
    <div className="rounded-lg bg-rice/60 p-4">
      <p className="mb-1 text-sm font-semibold">
        {f.name}
        <span className="ml-2 text-xs font-normal text-ink-light">{f.source}</span>
        {reason && (
          <span className="ml-2 rounded-full bg-cinnabar px-2 py-0.5 text-xs font-normal text-white">
            对证推荐
          </span>
        )}
      </p>
      {f.sourceNote && (
        <p className="mb-1 text-[11px] text-ink-light/70">出处考据：{f.sourceNote}</p>
      )}
      {reason && <p className="mb-1 text-xs text-cinnabar">{reason}</p>}
      <p className="mb-2 text-xs text-ink-light">功效：{f.functions}</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {f.ingredients.map((ing) => {
          const role = roleOfHerb(ing.name);
          return (
            <span
              key={ing.name}
              className={`rounded px-2 py-0.5 text-xs ${role ? chipClass[role] : "bg-white text-ink"}`}
              title={ing.note ? `${role ? `${role}药｜` : ""}${ing.note}` : role ? `${role}药` : undefined}
            >
              {ing.name} {ing.dose}
              {ing.note ? `（${ing.note}）` : ""}
            </span>
          );
        })}
      </div>
      {roles && (
        <div className="mb-2 space-y-1 rounded-lg bg-white/70 p-3">
          {roles.map((r) => (
            <p key={r.role} className="text-xs leading-relaxed">
              <span
                className={`mr-2 inline-block w-6 rounded text-center font-semibold ${
                  r.role === "君"
                    ? "bg-cinnabar text-white"
                    : r.role === "臣"
                      ? "bg-cinnabar/20 text-cinnabar"
                      : r.role === "佐"
                        ? "bg-rice-dark text-ink"
                        : "bg-rice text-ink-light"
                }`}
              >
                {r.role}
              </span>
              <span className="font-medium text-ink">{r.herbs.join("、")}</span>
              <span className="text-ink-light">——{r.rationale}</span>
            </p>
          ))}
        </div>
      )}
      <ul className="space-y-1 text-xs leading-relaxed text-ink-light">
        {f.analysis && <li>方解：{f.analysis}</li>}
        <li>煎服法：{f.preparation}</li>
        <li>加减要点：{f.modifications}</li>
        {appliedMods.length > 0 && (
          <li className="text-cinnabar">
            个体化加减（据本次命中症状，供医师参考）：{appliedMods.join("；")}
          </li>
        )}
        <li className="text-cinnabar">禁忌：{f.cautions}</li>
        <li>中成药参考：{f.patent}</li>
      </ul>
    </div>
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
      {/* 体质判定（仅 CCMQ 问卷；未做问卷时提示） */}
      <Section title="体质判定（长期倾向，以 CCMQ 问卷为准）">
        {data.primary ? (
          <>
            <p className="mb-3 text-sm">
              主体质：<span className="font-bold text-cinnabar">{data.primary.name}</span>
              {data.secondary.length > 0 && (
                <span className="ml-3 text-ink-light">
                  兼夹：{data.secondary.map((s) => `${s.name}（${s.score} 分）`).join("、")}
                </span>
              )}
            </p>
            {data.combined && (
              <ScoreBars
                items={data.combined.map((c) => ({
                  name: c.name,
                  score: c.score,
                  highlight: c.id === data.primary!.id,
                }))}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-ink-light">
            尚未完成问卷问诊（CCMQ 标准量表），无法判定体质。舌面诊与对话反映的是当下状态，
            不能替代体质判定——
            <a href="/questionnaire" className="text-cinnabar underline">前往完成问卷问诊</a>。
          </p>
        )}
      </Section>

      {/* 证候判定（新版结构化报告） */}
      {patterns && plan && (
        <Section title="证候判定（当下状态，四诊合参）">
          <p className="mb-2 text-sm">
            主证：
            <span className="font-bold text-cinnabar">
              {patterns.primary.name}（符合度 {patterns.primary.score} 分）
            </span>
            {patterns.primary.corroborated && (
              <span className="ml-2 rounded-full bg-cinnabar/10 px-2 py-0.5 text-xs text-cinnabar">
                多渠道互证（{patterns.primary.sources.length} 个渠道）
              </span>
            )}
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

      {/* 专家视图（脉诊专业录入的报告；候选证候对比） */}
      {data.expertMode && patterns && (
        <Section title="专家视图（候选证候对比）">
          <p className="mb-3 text-xs text-ink-light">
            脉诊专业录入已按完整权重计入评分。以下列出全部候选证候供鉴别参考；方剂卡片中的
            「对证推荐」与「个体化加减」为选方辅助。处方责任在医师。
          </p>
          <ScoreBars
            items={(patterns.all ?? [patterns.primary, ...patterns.secondary]).map((h) => ({
              name:
                h.name +
                (h.hasChiefHit ? "（有主症）" : "（无主症）") +
                (h.corroborated ? "·互证" : ""),
              score: h.score,
              highlight: h.id === patterns.primary.id,
            }))}
          />
        </Section>
      )}

      {/* 信息矛盾点（四诊合参冲突检测；新版报告字段） */}
      {data.conflicts && data.conflicts.length > 0 && (
        <Section title="信息矛盾点（待澄清）">
          <p className="mb-2 text-xs text-ink-light">
            各渠道采集到的信息存在以下不一致之处，辨证时已按规则取舍，建议补充采集或由医师面诊核实：
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-light">
            {data.conflicts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Section>
      )}

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
              {plan.chronicNote && (
                <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                  {plan.chronicNote}
                </p>
              )}
            </Section>
          )}

          {/* 方药参考（配警示条；证据不足时不出具） */}
          <Section title="方药参考">
            {data.formulaWithheld ? (
              <p className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                本次辨证符合度 {patterns?.primary.score} 分，证据强度不足以出具方药参考——
                中医讲「有是证用是方」，证候不明确时不贸然出方。建议补充舌诊/面诊/对话问诊后
                重新生成报告，或由执业中医师面诊开方。当前可先参考下方的食疗与日常保健方案。
              </p>
            ) : (
              <>
                <p className="mb-4 rounded-lg border border-cinnabar/40 bg-cinnabar/5 p-3 text-sm font-medium text-cinnabar">
                  以下为经典方剂参考，须在执业中医师辨证指导下使用，切勿自行抓药服用。
                  孕妇、哺乳期、儿童及慢性病患者尤须先经医师面诊。
                </p>
                {(data.demographics?.ageGroup === "<18" || data.demographics?.ageGroup === ">60") && (
                  <p className="mb-4 -mt-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-800">
                    老年/儿童用药剂量须由医师酌减，不可直接按参考剂量使用。
                  </p>
                )}
                {data.contraWarnings && data.contraWarnings.length > 0 && (
                  <div className="mb-4 -mt-2 rounded-lg border-2 border-red-500 bg-red-50 p-3">
                    <p className="mb-1 text-sm font-semibold text-red-700">
                      禁忌警示（已据您填写的病史/在服药物/年龄/当前症状自动核对）
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-red-700">
                      {data.contraWarnings.map((w) => (
                        <li key={w.formulaKey}>
                          「{w.formulaName}」与您的{w.conditions.join("、")}情况相关：{w.cautions}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-4">
                  {plan.formulas.map((f) => (
                    <FormulaCard key={toEntry(f).formula.key} entry={f} />
                  ))}
                </div>
                {/* 合方化裁建议（新版：兼证择要合入主方，不另立全方） */}
                {(plan.combinations ?? []).length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold text-ink-light">合方化裁建议（供医师参考）</h3>
                    <p className="mb-2 text-xs text-ink-light">
                      兼证不另立全方，临证择其要药合入主方加减化裁：
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-light">
                      {(plan.combinations ?? []).map((c) => (
                        <li key={c.patternId}>
                          兼「{c.patternName}」：{c.hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* 兼证参考方（旧版报告字段，仅历史数据渲染） */}
                {(plan.secondaryPlans ?? []).length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-semibold text-ink-light">兼证参考方</h3>
                    {(plan.secondaryPlans ?? []).map((sp) => (
                      <div key={sp.patternId} className="space-y-2">
                        <p className="text-xs text-ink-light">
                          兼证「{sp.patternName}」（结合调理思路分步或合方使用）：
                        </p>
                        {sp.formulas.map((f) => (
                          <FormulaCard key={toEntry(f).formula.key} entry={f} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
                        <span
                          className={`mr-1 rounded px-1 py-0.5 text-[10px] ${
                            i === 0 ? "bg-cinnabar text-white" : "bg-rice-dark text-ink-light"
                          }`}
                        >
                          {i === 0 ? "主穴" : "配穴"}
                        </span>
                        <span className="font-medium text-ink">{item.name}</span>
                        <span className="text-ink-light">（{item.method}）</span>
                        <br />
                        {acupointLocations(item.name).map((a) =>
                          a.location ? (
                            <span key={a.name} className="block text-ink-light/90">
                              定位·{a.name}：{a.location}
                            </span>
                          ) : null
                        )}
                        <span className="text-ink-light/90">机理：{item.rationale}</span>
                      </li>
                    )
                  )}
                </ul>
                <p className="mt-2 border-t border-rice-dark pt-2 text-[11px] text-ink-light/70">
                  一般以 2 周为一疗程，症状改善后可酌减频次；艾灸注意防烫伤，点刺放血须由专业人员操作。
                </p>
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
        /* 旧版报告 / 无证候结论：按体质调摄建议渲染（无体质判定时不渲染） */
        data.primary && (
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
        )
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

      {/* 健康提示（体检指标，体病相关；新版报告字段） */}
      {data.advisories && data.advisories.length > 0 && (
        <Section title="健康提示（近期体检指标）">
          <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-ink-light">
            {data.advisories.map((a, i) => (
              <li key={i}>{a}</li>
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
