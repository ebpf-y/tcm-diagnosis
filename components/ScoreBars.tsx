"use client";

/** 体质得分条形图（问卷结果、综合报告共用） */
export default function ScoreBars({
  items,
}: {
  items: { name: string; score: number; highlight?: boolean; extra?: string }[];
}) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.name} className="flex items-center gap-3 text-sm">
          <span className={`w-16 shrink-0 ${it.highlight ? "font-bold text-cinnabar" : ""}`}>
            {it.name}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-rice-dark">
            <div
              className={`h-full rounded-full ${it.highlight ? "bg-cinnabar" : "bg-ink-light/50"}`}
              style={{ width: `${Math.min(100, Math.max(0, it.score))}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-xs text-ink-light">
            {it.score.toFixed(1)} 分{it.extra ? ` ${it.extra}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
