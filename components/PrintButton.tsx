"use client";

/** 打印/存 PDF 按钮（就诊携带版：打印样式隐藏导航与按钮，仅输出报告本体） */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-rice-dark px-5 py-2 text-sm text-ink-light hover:bg-rice"
    >
      打印 / 存为 PDF
    </button>
  );
}
