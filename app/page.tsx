const ENTRIES = [
  {
    href: "/intake",
    step: "第一步",
    title: "主诉与四诊信息",
    desc: "主诉、病程、现病史、脉诊自测、闻诊自评——以主诉为纲，还原真实中医病历采集流程。",
    tag: "诊疗起点",
  },
  {
    href: "/questionnaire",
    step: "第二步",
    title: "问卷问诊",
    desc: "基于《中医体质分类与判定》标准量表（CCMQ-60），60 道题科学判定九种体质。",
    tag: "约 5 分钟",
  },
  {
    href: "/chat",
    step: "第三步",
    title: "AI 对话问诊",
    desc: "AI 医师围绕主诉与证候鉴别点逐轮问诊（寒热、汗出、口渴、二便、睡眠情志），点选作答。",
    tag: "智能问诊",
  },
  {
    href: "/imaging",
    step: "第四步",
    title: "舌诊 / 面诊",
    desc: "拍摄舌象、面色照片，多模态 AI 识别舌质舌苔、面色特征，照片不留存。",
    tag: "拍照分析",
  },
  {
    href: "/report",
    step: "第五步",
    title: "综合报告",
    desc: "四诊合参：综合判定体质与证候，输出病机分析、治则、经典方剂、食疗与保健方案。",
    tag: "历史可查",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="mb-10 text-center">
        <h1 className="mb-3 text-3xl font-bold text-ink">望闻问切，四诊合参</h1>
        <p className="mx-auto max-w-2xl text-ink-light">
          参照真实中医诊疗流程：先录主诉与四诊信息，再经问卷、对话、舌面诊多渠道采集，
          由规则引擎完成体质辨识与证候辨证（九种体质、十八常见证候），
          并给出病机分析、治则治法、经典方剂与食养保健方案。
        </p>
      </section>
      <div className="space-y-4">
        {ENTRIES.map((e) => (
          <a
            key={e.href}
            href={e.href}
            className="group flex items-start gap-4 rounded-xl border border-rice-dark bg-white p-5 shadow-sm transition hover:border-cinnabar hover:shadow-md"
          >
            <span className="mt-0.5 shrink-0 rounded-full bg-rice px-3 py-1 text-xs font-medium text-cinnabar">
              {e.step}
            </span>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink group-hover:text-cinnabar">
                  {e.title}
                </h2>
                <span className="rounded-full bg-rice px-2 py-0.5 text-xs text-ink-light">
                  {e.tag}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-ink-light">{e.desc}</p>
            </div>
          </a>
        ))}
      </div>
      <p className="mt-8 rounded-lg bg-rice-dark/60 p-4 text-center text-sm text-ink-light">
        提示：五个环节可任意组合，完成的项目越多，辨证越准确。本系统输出为中医辨证调理参考，不构成疾病诊断。
      </p>
    </div>
  );
}
