import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/commons/Header';
import Footer from '@/components/commons/Footer';
import { getMeta } from '@/lib/db';

export const metadata: Metadata = {
  title: {
    default: '三角洲军械库 — 三角洲行动弹药与武器数据速查',
    template: '%s | 三角洲军械库',
  },
  description:
    '三角洲行动非官方军械数据速查站：全弹种穿透伤害数据、武器面板图鉴、穿甲对照矩阵。撤离前先查这一站。',
};

/**
 * 首屏主题脚本：在水合前读回用户选择的主题，避免浅色用户先看到一帧暗色
 * 键名需与 components/commons/ThemeToggle 中的 THEME_STORAGE_KEY 保持一致
 */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('delta-theme')==='light'){document.documentElement.dataset.theme='light';}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let meta: Record<string, string> = {};
  let counts = { ammo: 0, weapons: 0 };
  try {
    meta = getMeta();
    counts = JSON.parse(meta.counts ?? '{}');
  } catch {
    // 数据库缺失时页面仍可渲染骨架
  }
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-bg text-main">
        <Header />
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-6">{children}</main>
        <Footer meta={meta} counts={counts} />
      </body>
    </html>
  );
}
