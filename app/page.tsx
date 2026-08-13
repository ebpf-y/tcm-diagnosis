const ENTRIES = [
  {
    href: "/questionnaire",
    title: "问卷问诊",
    desc: "基于《中医体质分类与判定》标准量表（CCMQ-60），60 道题科学判定九种体质。",
    tag: "约 5 分钟",
  },
  {
    href: "/chat",
    title: "AI 对话问诊",
    desc: "以中医\"十问歌\"思路与 AI 医师对话，从寒热、饮食、睡眠、情志等维度采集症状。",
    tag: "智能问诊",
  },
  {
    href: "/imaging",
    title: "舌诊 / 面诊",
    desc: "拍摄舌象、面色照片，多模态 AI 识别舌质舌苔、面色特征，照片不留存。",
    tag: "拍照分析",
  },
  {
    href: "/report",
    title: "综合报告",
    desc: "汇总各渠道结果，规则引擎综合判定体质，生成个性化饮食、起居、运动建议。",
    tag: "历史可查",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="mb-10 text-center">
        <h1 className="mb-3 text-3xl font-bold text-ink">辨识体质，因人养生</h1>
        <p className="mx-auto max-w-2xl text-ink-light">
          依据中华中医药学会《中医体质分类与判定》标准，通过问卷、对话、舌象、面象四种方式
          辨识您的体质类型（平和、气虚、阳虚、阴虚、痰湿、湿热、血瘀、气郁、特禀），
          并给出针对性的养生调养建议。
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {ENTRIES.map((e) => (
          <a
            key={e.href}
            href={e.href}
            className="group rounded-xl border border-rice-dark bg-white p-6 shadow-sm transition hover:border-cinnabar hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink group-hover:text-cinnabar">
                {e.title}
              </h2>
              <span className="rounded-full bg-rice px-2 py-0.5 text-xs text-ink-light">
                {e.tag}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-light">{e.desc}</p>
          </a>
        ))}
      </div>
      <p className="mt-8 rounded-lg bg-rice-dark/60 p-4 text-center text-sm text-ink-light">
        提示：四种方式可任意组合使用，完成的项目越多，综合报告越准确。所有结果仅供参考，不构成医疗建议。
      </p>
    </div>
  );
}
