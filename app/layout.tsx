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
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-bg text-main">
        <Header />
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-6">{children}</main>
        <Footer meta={meta} counts={counts} />
      </body>
    </html>
  );
}
