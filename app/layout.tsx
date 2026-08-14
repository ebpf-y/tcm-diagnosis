import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中医体质辨识",
  description: "问卷、对话、舌诊、面诊四位一体的中医体质辨识与养生建议工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b border-rice-dark bg-white/70">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold text-cinnabar">
              中医体质辨识
            </a>
            <nav className="flex gap-4 text-sm text-ink-light">
              <a href="/intake" className="hover:text-cinnabar">主诉四诊</a>
              <a href="/questionnaire" className="hover:text-cinnabar">问卷问诊</a>
              <a href="/chat" className="hover:text-cinnabar">对话问诊</a>
              <a href="/imaging" className="hover:text-cinnabar">舌面诊</a>
              <a href="/report" className="hover:text-cinnabar">综合报告</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-8 text-center text-xs text-ink-light/70">
          本系统输出为中医辨证调理参考，不构成疾病诊断；方药须在执业中医师指导下使用。
        </footer>
      </body>
    </html>
  );
}
