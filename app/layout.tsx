import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/commons/Header';
import Footer from '@/components/commons/Footer';
import RouteProgress from '@/components/commons/RouteProgress';
import { getSiteMeta } from '@/lib/site-meta';
import { SITE_URL, THEME_STORAGE_KEY } from '@/constants/site';

/**
 * 视口配置：固定按设备宽度渲染，viewportFit=cover 让固定在底部的抽屉 / 弹层
 * 可以配合 env(safe-area-inset-*) 避开 iPhone 刘海与底部横条
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  // SSG 输出 canonical / OG 绝对地址的基准，随环境变量切换线上域名
  metadataBase: new URL(SITE_URL),
  title: {
    default: '三角洲军械库 — 三角洲行动弹药与武器数据速查',
    template: '%s | 三角洲军械库',
  },
  description:
    '三角洲行动非官方军械数据速查站：全弹种穿透伤害数据、武器面板图鉴、穿甲对照矩阵、玩家改枪码。撤离前先查这一站。',
  applicationName: '三角洲军械库',
  openGraph: {
    type: 'website',
    siteName: '三角洲军械库',
    locale: 'zh_CN',
    title: '三角洲军械库 — 三角洲行动弹药与武器数据速查',
    description: '全弹种穿透伤害数据、武器面板图鉴、穿甲对照矩阵、玩家改枪码，构建期直读社区数据源。',
  },
  twitter: {
    card: 'summary',
    title: '三角洲军械库 — 三角洲行动弹药与武器数据速查',
    description: '全弹种穿透伤害数据、武器面板图鉴、穿甲对照矩阵、玩家改枪码。',
  },
  // 站点图标走 public 固定路径而非 app/icon.svg 文件约定：
  // 文件约定生成的 URL 由内容 hash 决定，浏览器 favicon 缓存不遵守 HTTP 缓存头，换 URL 才能可靠失效
  icons: {
    icon: [{ url: '/brand-icon.svg', type: 'image/svg+xml' }],
  },
};

/**
 * 首屏主题脚本：在水合前读回用户选择的主题，避免深色用户先看到一帧浅色
 * 默认主题为浅色（html 上直接输出 data-theme="light"），只有用户主动切到深色才改属性
 * 键名取自 constants/site 的 THEME_STORAGE_KEY，与 ThemeToggle 共用同一份字面量
 */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 元信息解析与计数兜底集中在 lib/site-meta（首页 / 页脚共用同一口径），缺库时降级为骨架
  const siteMeta = getSiteMeta();
  return (
    // data-theme 服务端固定输出 light：站点默认浅色，深色仅在用户主动切换后由首屏脚本改写
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-bg text-main">
        {/* 全局跳转进度条：点击瞬间出现，补足 RSC 返回前的空窗 */}
        <RouteProgress />
        <Header />
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-4">{children}</main>
        <Footer siteMeta={siteMeta} />
      </body>
    </html>
  );
}
