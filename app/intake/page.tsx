"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveChannelResult } from "@/lib/session";
import {
  CHIEF_COMPLAINT_OPTIONS,
  COURSE_OPTIONS,
  AGGRAVATING_OPTIONS,
  RELIEVING_OPTIONS,
  HISTORY_OPTIONS,
  LIFESTYLE_OPTIONS,
  CHECKUP_OPTIONS,
  PULSE_OPTIONS,
  PULSE_ADVANCED_OPTIONS,
  EXPERT_PULSE_OPTIONS,
  LISTENING_OPTIONS,
  GENDER_OPTIONS,
  AGE_GROUP_OPTIONS,
  type IntakeForm,
  type PulseForm,
  type PositionPulse,
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
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [checkup, setCheckup] = useState<string[]>([]);
  const [femaleSkipped, setFemaleSkipped] = useState(false);
  const [female, setFemale] = useState<FemaleForm>({ cycle: "", flow: "", pain: false, leukorrhea: false });
  const [maleSkipped, setMaleSkipped] = useState(false);
  const [male, setMale] = useState<MaleForm>({ emission: false, premature: false, nightUrine: false });
  const [pulse, setPulse] = useState<PulseForm>({ rate: null, strength: "", depth: "", width: "", rhythm: "" });
  const [pulseMode, setPulseMode] = useState<"amateur" | "expert">("amateur");
  const [expertConfirmed, setExpertConfirmed] = useState(false);
  const [pulseSkipped, setPulseSkipped] = useState(false);
  // 业余向导：计时器状态
  const [timing, setTiming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 专家模式：三部九候编辑暂存
  const [posDraft, setPosDraft] = useState<PositionPulse>({ side: "左", position: "寸", depth: "中", qualities: [] });
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

  // 脉率计时器：开始/结束；结束时按实际秒数写入 measuredSeconds
  function startTimer() {
    if (timing) return;
    setTiming(true);
    setSecondsLeft(60);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      const left = Math.max(0, 60 - elapsed);
      setSecondsLeft(left);
      if (left === 0) stopTimer(60);
    }, 250);
  }
  function stopTimer(measured?: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTiming(false);
    const secs = measured ?? 60 - secondsLeft;
    setPulse((p) => ({ ...p, measuredSeconds: Math.max(1, secs) }));
  }
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  /** 计时计数 → 自动换算脉率 */
  function applyBeatCount(count: number) {
    const secs = pulse.measuredSeconds ?? 60;
    if (count > 0 && secs > 0) {
      setPulse((p) => ({ ...p, rate: Math.round((count * 60) / secs) }));
    }
  }

  /** 复测差异提示（>10 次/分则两次测量不可靠） */
  const retestMismatch =
    pulse.rate != null && pulse.retestRate != null && Math.abs(pulse.retestRate - pulse.rate) > 10;

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
      lifestyle,
      checkup,
      female: gender === "female" && !femaleSkipped ? female : null,
      male: gender === "male" && !maleSkipped ? male : null,
      pulse: pulseSkipped
        ? { rate: null, strength: "", depth: "", width: "", rhythm: "" }
        : { ...pulse, mode: pulseMode },
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
        demographics: { gender, ageGroup, history: form.history, medications: form.medications, course, checkup },
        pulseMode: pulseSkipped ? undefined : pulseMode,
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
            title="五、切诊（脉诊）"
            hint={
              pulseMode === "amateur"
                ? "跟着步骤来：先静坐，再计时数脉搏。拿不准的项目选「不确定」——不确定的内容不参与辨证，宁可少填、不可错填。"
                : "专业模式：直接录入脉象（19 脉）与三部九候，脉诊数据将以完整权重参与辨证。"
            }
          >
            {/* 模式切换 */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPulseMode("amateur")}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  pulseMode === "amateur"
                    ? "border-cinnabar bg-cinnabar text-white"
                    : "border-rice-dark text-ink-light hover:border-cinnabar hover:text-cinnabar"
                }`}
              >
                业余自测（有引导）
              </button>
              <button
                type="button"
                onClick={() => setPulseMode("expert")}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  pulseMode === "expert"
                    ? "border-cinnabar bg-cinnabar text-white"
                    : "border-rice-dark text-ink-light hover:border-cinnabar hover:text-cinnabar"
                }`}
              >
                专业录入
              </button>
            </div>

            {/* 专业模式确认门槛 */}
            {pulseMode === "expert" && !expertConfirmed && (
              <div className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="mb-2 font-medium">专业模式面向具备脉诊基础的执业人员与学习者</p>
                <p className="mb-3 text-xs leading-relaxed">
                  脉象录入将以完整权重参与辨证并影响方药参考的出具。若您没有脉诊训练背景，请使用「业余自测」——引导式测量同样能提供有效的辨证线索。
                </p>
                <button
                  type="button"
                  onClick={() => setExpertConfirmed(true)}
                  className="rounded-lg bg-cinnabar px-4 py-1.5 text-xs text-white"
                >
                  我具备脉诊基础，进入专业模式
                </button>
              </div>
            )}

            {pulseSkipped ? (
              <button onClick={() => setPulseSkipped(false)} className="text-xs text-cinnabar underline">
                已跳过，点击重新填写
              </button>
            ) : pulseMode === "expert" && expertConfirmed ? (
              /* ———— 专业录入 ———— */
              <div className="space-y-4">
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
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-light">总体脉象（多选，按指下所得）</p>
                  <div className="flex flex-wrap gap-2">
                    {EXPERT_PULSE_OPTIONS.map((o) => {
                      const active = (pulse.pulse28 ?? []).includes(o.key);
                      return (
                        <button
                          key={o.key}
                          type="button"
                          title={o.desc}
                          onClick={() =>
                            setPulse((p) => ({
                              ...p,
                              pulse28: toggle(p.pulse28 ?? [], o.key),
                            }))
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            active
                              ? "border-cinnabar bg-cinnabar text-white"
                              : "border-rice-dark text-ink-light hover:border-cinnabar hover:text-cinnabar"
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-ink-light/70">悬停各脉象可查看指下特征说明。</p>
                </div>

                {/* 三部九候（选填） */}
                <div className="rounded-lg border border-rice-dark p-3">
                  <p className="mb-2 text-xs font-medium text-ink-light">三部九候（选填）：分部记录沉取/浮取所得</p>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <OptionGroup options={["左", "右"]} selected={[posDraft.side]} onToggle={(k) => setPosDraft((d) => ({ ...d, side: k as PositionPulse["side"] }))} multi={false} />
                    <OptionGroup options={["寸", "关", "尺"]} selected={[posDraft.position]} onToggle={(k) => setPosDraft((d) => ({ ...d, position: k as PositionPulse["position"] }))} multi={false} />
                    <OptionGroup options={["浮", "中", "沉"]} selected={[posDraft.depth]} onToggle={(k) => setPosDraft((d) => ({ ...d, depth: k as PositionPulse["depth"] }))} multi={false} />
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {EXPERT_PULSE_OPTIONS.map((o) => {
                      const active = posDraft.qualities.includes(o.key);
                      return (
                        <button
                          key={o.key}
                          type="button"
                          title={o.desc}
                          onClick={() => setPosDraft((d) => ({ ...d, qualities: toggle(d.qualities, o.key) }))}
                          className={`rounded-full border px-2 py-0.5 text-xs transition ${
                            active
                              ? "border-cinnabar bg-cinnabar text-white"
                              : "border-rice-dark text-ink-light hover:border-cinnabar"
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={posDraft.qualities.length === 0}
                    onClick={() => {
                      setPulse((p) => ({ ...p, positions: [...(p.positions ?? []), posDraft] }));
                      setPosDraft({ side: "左", position: "寸", depth: "中", qualities: [] });
                    }}
                    className="rounded-lg border border-cinnabar px-3 py-1 text-xs text-cinnabar disabled:opacity-40"
                  >
                    + 添加该部记录
                  </button>
                  {(pulse.positions ?? []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(pulse.positions ?? []).map((pos, i) => (
                        <li key={i} className="flex items-center justify-between rounded bg-rice/60 px-2 py-1 text-xs">
                          <span>
                            {pos.side}{pos.position}·{pos.depth}取：
                            {pos.qualities.map((q) => EXPERT_PULSE_OPTIONS.find((o) => o.key === q)?.label).join("、")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPulse((p) => ({ ...p, positions: (p.positions ?? []).filter((_, j) => j !== i) }))}
                            className="text-ink-light/60 hover:text-red-600"
                          >
                            删除
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button onClick={() => setPulseSkipped(true)} className="text-xs text-ink-light/70 underline hover:text-cinnabar">
                  不采集脉诊？跳过本项
                </button>
              </div>
            ) : pulseMode === "amateur" ? (
              /* ———— 业余向导 ———— */
              <div className="space-y-4">
                {/* 步骤 1：准备 */}
                <div className="rounded-lg bg-rice/60 p-3 text-xs leading-relaxed text-ink-light">
                  <p className="mb-1 font-semibold text-ink">第 1 步 · 准备</p>
                  静坐 5 分钟后再测；测前 30 分钟不喝咖啡浓茶、不剧烈运动；手臂平放、与心脏同高。
                </div>
                {/* 步骤 2：定位 */}
                <div className="rounded-lg bg-rice/60 p-3 text-xs leading-relaxed text-ink-light">
                  <p className="mb-1 font-semibold text-ink">第 2 步 · 找到脉搏</p>
                  掌心向上，用另一只手的食指、中指、无名指三指并拢，搭在手腕拇指侧、腕横纹上方，轻按至能感觉到跳动。
                </div>
                {/* 步骤 3：计时计数 */}
                <div className="rounded-lg bg-rice/60 p-3 text-xs leading-relaxed text-ink-light">
                  <p className="mb-2 font-semibold text-ink">第 3 步 · 计时数脉搏</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {!timing ? (
                      <button type="button" onClick={startTimer} className="rounded-lg bg-cinnabar px-4 py-1.5 text-xs text-white">
                        {pulse.measuredSeconds ? "再测一次（60 秒）" : "开始计时 60 秒"}
                      </button>
                    ) : (
                      <button type="button" onClick={() => stopTimer()} className="rounded-lg bg-cinnabar px-4 py-1.5 text-xs text-white">
                        计时中…剩余 {secondsLeft} 秒（点击提前结束）
                      </button>
                    )}
                    {pulse.measuredSeconds != null && !timing && (
                      <>
                        <span>测了 {pulse.measuredSeconds} 秒，数到</span>
                        <input
                          type="number"
                          min={5}
                          max={300}
                          className="w-20 rounded-lg border border-rice-dark px-2 py-1 outline-none focus:border-cinnabar"
                          placeholder="次数"
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isFinite(n) && n > 0) applyBeatCount(n);
                          }}
                        />
                        <span>次</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span>脉率（次/分）：</span>
                    <input
                      type="number"
                      min={30}
                      max={180}
                      value={pulse.rate ?? ""}
                      onChange={(e) => setPulse((p) => ({ ...p, rate: e.target.value === "" ? null : Number(e.target.value) }))}
                      placeholder="自动换算或直填"
                      className="w-28 rounded-lg border border-rice-dark px-2 py-1 outline-none focus:border-cinnabar"
                    />
                    <span className="text-ink-light/70">&lt;60 偏慢，60~90 正常，&gt;90 偏快</span>
                  </div>
                </div>
                {/* 步骤 4：复测 */}
                <div className="rounded-lg bg-rice/60 p-3 text-xs leading-relaxed text-ink-light">
                  <p className="mb-2 font-semibold text-ink">第 4 步 · 复测一次更可靠（建议）</p>
                  <div className="flex items-center gap-2">
                    <span>第二次脉率：</span>
                    <input
                      type="number"
                      min={30}
                      max={180}
                      value={pulse.retestRate ?? ""}
                      onChange={(e) => setPulse((p) => ({ ...p, retestRate: e.target.value === "" ? null : Number(e.target.value) }))}
                      placeholder="选填"
                      className="w-24 rounded-lg border border-rice-dark px-2 py-1 outline-none focus:border-cinnabar"
                    />
                  </div>
                  {retestMismatch && (
                    <p className="mt-2 rounded border border-amber-400 bg-amber-50 p-2 text-amber-800">
                      两次测量相差超过 10 次/分，本次脉率数据将不参与辨证——请休息片刻后重新测量。
                    </p>
                  )}
                </div>
                {/* 步骤 5：节律与脉形粗判 */}
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-light">跳动是否均匀整齐？</p>
                    <OptionGroup
                      options={["整齐", "时有停跳", "不确定"]}
                      selected={pulse.rhythm ? [pulse.rhythm] : []}
                      onToggle={(k) => setPulse((p) => ({ ...p, rhythm: k === "不确定" ? "" : (k as PulseForm["rhythm"]) }))}
                      multi={false}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-light">搏动力度</p>
                    <OptionGroup
                      options={[{ key: "有力", label: "明显有力" }, { key: "无力", label: "偏弱、需仔细感受" }, { key: "适中", label: "适中" }, { key: "", label: "不确定" }]}
                      selected={[pulse.strength]}
                      onToggle={(k) => setPulse((p) => ({ ...p, strength: k as PulseForm["strength"] }))}
                      multi={false}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-light">轻重按压的感觉</p>
                    <OptionGroup
                      options={[{ key: "轻按即得", label: "轻轻搭着就清楚" }, { key: "重按才得", label: "要用力按才清楚" }, { key: "", label: "不确定" }]}
                      selected={[pulse.depth]}
                      onToggle={(k) => setPulse((p) => ({ ...p, depth: k as PulseForm["depth"] }))}
                      multi={false}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-light">指下脉道的感觉</p>
                    <OptionGroup
                      options={[{ key: "细如线", label: "细如线" }, { key: "宽大", label: "宽大有力" }, { key: "紧绷如弦", label: "紧绷如按琴弦" }, { key: "", label: "不确定" }]}
                      selected={[pulse.width]}
                      onToggle={(k) => setPulse((p) => ({ ...p, width: k as PulseForm["width"] }))}
                      multi={false}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-light">以上力度/深浅/粗细的判断，您有把握吗？</p>
                    <OptionGroup
                      options={["确定", "不确定"]}
                      selected={pulse.confidence ? [pulse.confidence] : []}
                      onToggle={(k) => setPulse((p) => ({ ...p, confidence: k as PulseForm["confidence"] }))}
                      multi={false}
                    />
                    {pulse.confidence === "不确定" && (
                      <p className="mt-1 text-xs text-ink-light/70">
                        没关系——脉形判断将不参与辨证，只保留脉率与节律（这两项相对客观）。
                      </p>
                    )}
                  </div>
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
            ) : null}
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

          <Section title="七、生活方式与近期体检" hint="选填；生活方式参与辨证参考，体检指标仅用于健康提示">
            <p className="mb-1 text-xs font-medium text-ink-light">生活方式（多选，无则不选）</p>
            <OptionGroup options={LIFESTYLE_OPTIONS} selected={lifestyle} onToggle={(k) => setLifestyle((l) => toggle(l, k))} />
            <p className="mb-1 mt-4 text-xs font-medium text-ink-light">近一年体检异常（多选，无则不选）</p>
            <OptionGroup options={CHECKUP_OPTIONS} selected={checkup} onToggle={(k) => setCheckup((l) => toggle(l, k))} />
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
