"use client";

import { useMemo, useState } from "react";
import { saveChannelResult } from "@/lib/session";
import {
  CHIEF_COMPLAINT_OPTIONS,
  COURSE_OPTIONS,
  AGGRAVATING_OPTIONS,
  RELIEVING_OPTIONS,
  HISTORY_OPTIONS,
  PULSE_OPTIONS,
  PULSE_ADVANCED_OPTIONS,
  LISTENING_OPTIONS,
  GENDER_OPTIONS,
  AGE_GROUP_OPTIONS,
  type IntakeForm,
  type PulseForm,
  type ListeningForm,
  type FemaleForm,
  type MaleForm,
} from "@/lib/tcm/intake";

interface IntakeResponse {
  signKeys: string[];
  scores: Record<string, number>;
  top: { id: string; name: string; score: number }[];
  patterns: { id: string; name: string; score: number }[];
  note: string;
  redFlags: string[];
  error?: string;
}

/** 通用多选/单选按钮组 */
function OptionGroup({
  options,
  selected,
  onToggle,
  multi = true,
}: {
  options: readonly string[] | readonly { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const key = typeof o === "string" ? o : o.key;
        const label = typeof o === "string" ? o : o.label;
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-cinnabar bg-cinnabar text-white"
                : "border-rice-dark text-ink-light hover:border-cinnabar hover:text-cinnabar"
            }`}
            aria-pressed={active}
            data-multi={multi}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-rice-dark bg-white p-6">
      <h2 className="mb-1 font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-xs text-ink-light">{hint}</p>}
      {children}
    </section>
  );
}

export default function IntakePage() {
  const [gender, setGender] = useState<IntakeForm["gender"]>("");
  const [ageGroup, setAgeGroup] = useState<IntakeForm["ageGroup"]>("");
  const [chief, setChief] = useState<string[]>([]);
  const [customComplaint, setCustomComplaint] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [course, setCourse] = useState<IntakeForm["course"]>("");
  const [aggravating, setAggravating] = useState<string[]>([]);
  const [relieving, setRelieving] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState("");
  const [femaleSkipped, setFemaleSkipped] = useState(false);
  const [female, setFemale] = useState<FemaleForm>({ cycle: "", flow: "", pain: false, leukorrhea: false });
  const [maleSkipped, setMaleSkipped] = useState(false);
  const [male, setMale] = useState<MaleForm>({ emission: false, premature: false, nightUrine: false });
  const [pulse, setPulse] = useState<PulseForm>({ rate: null, strength: "", depth: "", width: "", rhythm: "" });
  const [pulseSkipped, setPulseSkipped] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [listening, setListening] = useState<ListeningForm>({ voice: "", cough: "", breath: "" });
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /** 选中的急重症词条 */
  const redFlags = useMemo(
    () => CHIEF_COMPLAINT_OPTIONS.filter((o) => o.red && chief.includes(o.key)).map((o) => o.label),
    [chief]
  );

  async function handleSubmit() {
    setLoading(true);
    setError("");
    const form: IntakeForm = {
      gender,
      ageGroup,
      chiefComplaints: chief.filter((k) => !CHIEF_COMPLAINT_OPTIONS.find((o) => o.key === k)?.red),
      customComplaint: customComplaint.trim() || undefined,
      course,
      aggravating,
      relieving,
      history: history.filter((h) => h !== "none"),
      medications: medications.trim() || undefined,
      female: gender === "female" && !femaleSkipped ? female : null,
      male: gender === "male" && !maleSkipped ? male : null,
      pulse: pulseSkipped ? { rate: null, strength: "", depth: "", width: "", rhythm: "" } : pulse,
      listening,
    };
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as IntakeResponse;
      if (!res.ok) throw new Error(data.error ?? "提交失败");
      setResult(data);
      saveChannelResult({
        channel: "intake",
        scores: data.scores,
        weight: 2,
        note: data.note,
        signKeys: data.signKeys,
        demographics: { gender, ageGroup },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    gender !== "" && ageGroup !== "" && (chief.length > 0 || customComplaint.trim().length > 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">主诉与四诊信息</h1>
      <p className="mb-4 text-sm text-ink-light">
        诊疗第一步：请按真实感受点选，信息将用于后续问诊与综合辨证。
      </p>

      {/* 急重症拦截：固定顶部红色警示 */}
      {redFlags.length > 0 && (
        <div className="sticky top-0 z-10 mb-4 rounded-lg border-2 border-red-600 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-lg">
          您选择的「{redFlags.join("、")}」属于急重症表现，建议立即就医，本系统不适用于急重症的自助辨证。
        </div>
      )}

      {result ? (
        <div className="rounded-xl border border-rice-dark bg-white p-6">
          <h2 className="mb-2 font-semibold">采集完成</h2>
          <p className="mb-3 text-sm text-ink-light">{result.note}</p>
          {result.patterns.length > 0 && (
            <p className="mb-2 text-sm">
              初步证候提示：
              {result.patterns.map((p, i) => (
                <span
                  key={p.id}
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                    i === 0 ? "bg-cinnabar text-white" : "bg-rice text-cinnabar"
                  }`}
                >
                  {p.name} {p.score.toFixed(0)} 分
                </span>
              ))}
            </p>
          )}
          {result.top.length > 0 && (
            <p className="text-sm">
              体质提示：
              {result.top.map((t) => (
                <span key={t.id} className="ml-1 rounded-full bg-rice px-2 py-0.5 text-xs text-cinnabar">
                  {t.name} {t.score.toFixed(0)} 分
                </span>
              ))}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <a href="/chat" className="rounded-lg bg-cinnabar px-5 py-2 text-sm text-white hover:bg-cinnabar-light">
              下一步：AI 对话问诊 →
            </a>
            <button
              onClick={() => setResult(null)}
              className="rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light hover:bg-rice"
            >
              重新填写
            </button>
          </div>
          <p className="mt-4 text-xs text-ink-light/70">
            初步提示仅供辨证参考，最终结果以综合报告为准；不构成疾病诊断。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="〇、基本信息" hint="性别与年龄段影响辨证与用药参考（必填）">
            <p className="mb-1 text-xs font-medium text-ink-light">性别</p>
            <OptionGroup
              options={GENDER_OPTIONS}
              selected={gender ? [gender] : []}
              onToggle={(k) => setGender(k as IntakeForm["gender"])}
              multi={false}
            />
            <p className="mb-1 mt-4 text-xs font-medium text-ink-light">年龄段</p>
            <OptionGroup
              options={AGE_GROUP_OPTIONS}
              selected={ageGroup ? [ageGroup] : []}
              onToggle={(k) => setAgeGroup(k as IntakeForm["ageGroup"])}
              multi={false}
            />
            {ageGroup === "<18" && (
              <p className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-800">
                儿童脏腑娇嫩、形气未充，辨证与用药建议当面就诊，本系统结果仅供参考。
              </p>
            )}
          </Section>

          <Section title="一、主诉" hint="最困扰您的症状（可多选）">
            <OptionGroup options={CHIEF_COMPLAINT_OPTIONS} selected={chief} onToggle={(k) => setChief((l) => toggle(l, k))} />
            <div className="mt-3">
              {customOpen ? (
                <input
                  value={customComplaint}
                  onChange={(e) => setCustomComplaint(e.target.value)}
                  placeholder="其他症状，请简要描述…"
                  autoFocus
                  className="w-full rounded-lg border border-rice-dark px-4 py-2 text-sm outline-none focus:border-cinnabar"
                />
              ) : (
                <button onClick={() => setCustomOpen(true)} className="text-xs text-ink-light/70 underline hover:text-cinnabar">
                  以上没有？自行补充…
                </button>
              )}
            </div>
            <p className="mb-1 mt-4 text-xs font-medium text-ink-light">病程（症状持续多久了）</p>
            <OptionGroup
              options={COURSE_OPTIONS}
              selected={course ? [course] : []}
              onToggle={(k) => setCourse(k as IntakeForm["course"])}
              multi={false}
            />
          </Section>

          <Section title="二、现病史" hint="什么情况下加重、什么情况下缓解（可多选，无则不选）">
            <p className="mb-1 text-xs font-medium text-ink-light">加重因素</p>
            <OptionGroup options={AGGRAVATING_OPTIONS} selected={aggravating} onToggle={(k) => setAggravating((l) => toggle(l, k))} />
            <p className="mb-1 mt-4 text-xs font-medium text-ink-light">缓解因素</p>
            <OptionGroup options={RELIEVING_OPTIONS} selected={relieving} onToggle={(k) => setRelieving((l) => toggle(l, k))} />
          </Section>

          <Section title="三、既往史与用药">
            <p className="mb-1 text-xs font-medium text-ink-light">慢性病史（多选）</p>
            <OptionGroup options={HISTORY_OPTIONS} selected={history} onToggle={(k) => setHistory((l) => toggle(l, k))} />
            <p className="mb-1 mt-4 text-xs font-medium text-ink-light">长期服药（选填）</p>
            <input
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="如：降压药、降糖药…，无则留空"
              className="w-full rounded-lg border border-rice-dark px-4 py-2 text-sm outline-none focus:border-cinnabar"
            />
          </Section>

          {gender === "female" && (
          <Section title="四、女性专问" hint="不方便回答可跳过">
            {femaleSkipped ? (
              <button onClick={() => setFemaleSkipped(false)} className="text-xs text-cinnabar underline">
                已跳过，点击重新填写
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">经期是否规律</p>
                  <OptionGroup options={["规律", "不规律"]} selected={female.cycle ? [female.cycle] : []} onToggle={(k) => setFemale((f) => ({ ...f, cycle: k as FemaleForm["cycle"] }))} multi={false} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">经量</p>
                  <OptionGroup options={["正常", "量少色淡", "量多"]} selected={female.flow ? [female.flow] : []} onToggle={(k) => setFemale((f) => ({ ...f, flow: k as FemaleForm["flow"] }))} multi={false} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">其他</p>
                  <OptionGroup
                    options={["痛经、经血有块", "带下异常"]}
                    selected={[female.pain ? "痛经、经血有块" : "", female.leukorrhea ? "带下异常" : ""].filter(Boolean)}
                    onToggle={(k) =>
                      setFemale((f) => (k === "痛经、经血有块" ? { ...f, pain: !f.pain } : { ...f, leukorrhea: !f.leukorrhea }))
                    }
                  />
                </div>
                <button onClick={() => setFemaleSkipped(true)} className="text-xs text-ink-light/70 underline hover:text-cinnabar">
                  跳过本项
                </button>
              </div>
            )}
          </Section>
          )}

          {gender === "male" && (
          <Section title="四、男性专问" hint="不方便回答可跳过">
            {maleSkipped ? (
              <button onClick={() => setMaleSkipped(false)} className="text-xs text-cinnabar underline">
                已跳过，点击重新填写
              </button>
            ) : (
              <div className="space-y-3">
                <OptionGroup
                  options={["遗精", "早泄", "夜尿频多"]}
                  selected={[
                    male.emission ? "遗精" : "",
                    male.premature ? "早泄" : "",
                    male.nightUrine ? "夜尿频多" : "",
                  ].filter(Boolean)}
                  onToggle={(k) =>
                    setMale((m) =>
                      k === "遗精"
                        ? { ...m, emission: !m.emission }
                        : k === "早泄"
                          ? { ...m, premature: !m.premature }
                          : { ...m, nightUrine: !m.nightUrine }
                    )
                  }
                />
                <p className="text-xs text-ink-light/70">无上述情况可不选。</p>
                <button onClick={() => setMaleSkipped(true)} className="text-xs text-ink-light/70 underline hover:text-cinnabar">
                  跳过本项
                </button>
              </div>
            )}
          </Section>
          )}

          <Section
            title="五、切诊（脉诊自测）"
            hint="静坐 5 分钟后，用食指、中指、无名指按压对侧手腕桡动脉（拇指侧腕横纹上方），测 1 分钟。自测仅供辨证参考，精确脉诊需医师当面切脉。"
          >
            {pulseSkipped ? (
              <button onClick={() => setPulseSkipped(false)} className="text-xs text-cinnabar underline">
                已跳过，点击重新填写
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-ink-light">脉率（次/分）</p>
                  <input
                    type="number"
                    min={30}
                    max={180}
                    value={pulse.rate ?? ""}
                    onChange={(e) => setPulse((p) => ({ ...p, rate: e.target.value === "" ? null : Number(e.target.value) }))}
                    placeholder="如 72"
                    className="w-28 rounded-lg border border-rice-dark px-3 py-1.5 text-sm outline-none focus:border-cinnabar"
                  />
                  <span className="text-xs text-ink-light/70">参考：&lt;60 偏慢，60~90 正常，&gt;90 偏快</span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">搏动力度</p>
                  <OptionGroup options={PULSE_OPTIONS.strength} selected={pulse.strength ? [pulse.strength] : []} onToggle={(k) => setPulse((p) => ({ ...p, strength: k as PulseForm["strength"] }))} multi={false} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">位置深浅</p>
                  <OptionGroup options={PULSE_OPTIONS.depth} selected={pulse.depth ? [pulse.depth] : []} onToggle={(k) => setPulse((p) => ({ ...p, depth: k as PulseForm["depth"] }))} multi={false} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">脉道粗细</p>
                  <OptionGroup options={PULSE_OPTIONS.width} selected={pulse.width ? [pulse.width] : []} onToggle={(k) => setPulse((p) => ({ ...p, width: k as PulseForm["width"] }))} multi={false} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">节律</p>
                  <OptionGroup options={PULSE_OPTIONS.rhythm} selected={pulse.rhythm ? [pulse.rhythm] : []} onToggle={(k) => setPulse((p) => ({ ...p, rhythm: k as PulseForm["rhythm"] }))} multi={false} />
                </div>

                {/* 进阶自测（默认收起） */}
                <div className="rounded-lg border border-rice-dark">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="w-full px-3 py-2 text-left text-xs text-ink-light hover:text-cinnabar"
                  >
                    {advancedOpen ? "▾" : "▸"} 进阶自测（可选，误差较大仅供参考）
                  </button>
                  {advancedOpen && (
                    <div className="space-y-3 border-t border-rice-dark p-3">
                      <div>
                        <p className="mb-1 text-xs font-medium text-ink-light">双手对比：哪只手搏动更有力？</p>
                        <OptionGroup
                          options={PULSE_ADVANCED_OPTIONS.strongerHand}
                          selected={pulse.strongerHand ? [pulse.strongerHand] : []}
                          onToggle={(k) => setPulse((p) => ({ ...p, strongerHand: k as PulseForm["strongerHand"] }))}
                          multi={false}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-ink-light">
                          三部对比：寸（掌侧近腕横纹）、关（腕横纹处）、尺（近肘侧）三部中，哪一部搏动最弱？
                        </p>
                        <OptionGroup
                          options={PULSE_ADVANCED_OPTIONS.weakestPosition}
                          selected={pulse.weakestPosition ? [pulse.weakestPosition] : []}
                          onToggle={(k) => setPulse((p) => ({ ...p, weakestPosition: k as PulseForm["weakestPosition"] }))}
                          multi={false}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setPulseSkipped(true)} className="text-xs text-ink-light/70 underline hover:text-cinnabar">
                  不方便测量？跳过本项
                </button>
              </div>
            )}
          </Section>

          <Section title="六、闻诊自评">
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-ink-light">语声</p>
                <OptionGroup options={LISTENING_OPTIONS.voice} selected={listening.voice ? [listening.voice] : []} onToggle={(k) => setListening((l) => ({ ...l, voice: k as ListeningForm["voice"] }))} multi={false} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-ink-light">是否咳嗽</p>
                <OptionGroup options={LISTENING_OPTIONS.cough} selected={listening.cough ? [listening.cough] : []} onToggle={(k) => setListening((l) => ({ ...l, cough: k as ListeningForm["cough"] }))} multi={false} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-ink-light">口气</p>
                <OptionGroup options={LISTENING_OPTIONS.breath} selected={listening.breath ? [listening.breath] : []} onToggle={(k) => setListening((l) => ({ ...l, breath: k as ListeningForm["breath"] }))} multi={false} />
              </div>
            </div>
          </Section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || loading}
            className="w-full rounded-lg bg-cinnabar py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "提交中…" : canSubmit ? "提交采集信息" : "请先填写基本信息与主诉"}
          </button>
        </div>
      )}
    </div>
  );
}
