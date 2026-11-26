import Link from 'next/link';
import type { ReactNode } from 'react';
import { getMeta } from '@/lib/db';
import { IconChart, IconAmmo, IconBook, IconUnknown } from '@/components/commons/icons';

/**
 * @page Home
 * @description 首页：全宽战术 Hero（标题 / 标语 / 主 CTA / 数据速览）+ Bento 布局的模块入口
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-25
 */

/** 首页入口卡片配置 */
interface EntranceCard {
  /** 目标路由 */
  href: string;
  /** 卡片角标（英文代号） */
  tag: string;
  /** 标题 */
  title: string;
  /** 一句话说明（桌面） */
  desc: string;
  /** 移动端精简说明（两列卡片宽度有限，避免文字被截断） */
  short: string;
  /** 图标节点（尺寸由图标自身 className 控制） */
  icon: ReactNode;
  /** 在网格中的跨度类名（sm 2 列 / lg 3 列下控制主次，空串表示单列） */
  span: string;
  /** 是否核心模块：图标框与标题走高亮强调色 */
  core?: boolean;
  /** 是否二期功能：整体降低视觉权重，不做 hover 抬升 */
  soon?: boolean;
}

/** 数据来源展示项 */
interface SourceInfo {
  /** 分类角标：弹药 / 枪械 / 补充 / 图片 */
  kind: string;
  /** 来源标识（GitHub 仓库 / npm 包 / 域名） */
  name: string;
  /** 该来源提供的数据说明 */
  what: string;
  /** 站外链接，空串表示无 */
  url: string;
}

/** 已知数据源的角色说明，键为 `owner/repo/文件名` */
const SOURCE_ROLES: Record<string, { kind: string; what: string }> = {
  'AVA-2568/delta-gun-tierlist/ammo.json': {
    kind: '弹药',
    what: '全口径弹药全字段与穿甲判定矩阵',
  },
  'AVA-2568/delta-gun-tierlist/weapons.json': {
    kind: '索引',
    what: '官方武器 ID 索引',
  },
  'AVA-2568/delta-gun-tierlist/provenance.json': {
    kind: '索引',
    what: '数据集版本与上游同步时间（版本溯源）',
  },
  'jiansenc/DeltaForceData/gunRifle.json': {
    kind: '枪械',
    what: '武器面板数据与官方图标',
  },
};

/** 武器图片来源（不在 meta.sources 中，由 sync 构建期下载到本地） */
const IMAGE_SOURCE: SourceInfo = {
  kind: '图片',
  name: 'playerhub.df.qq.com',
  what: '腾讯官方武器图，构建期下载至本站，页面不热链',
  url: '',
};

/**
 * 把 sync 写入 meta.sources 的原始条目解析为可读来源（同一仓库的多个文件合并为一行）
 * @param raw - meta.sources 的 JSON 字符串（jsDelivr 地址 + npm 包名）
 * @returns 来源展示项数组；无法识别的条目跳过
 */
function parseSources(raw: string): SourceInfo[] {
  let entries: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      entries = parsed.filter((v): v is string => typeof v === 'string');
    }
  } catch {
    return [];
  }

  const grouped = new Map<string, SourceInfo>();
  for (const entry of entries) {
    // npm 本地包，形如 delta-force-core@0.8.0（无网络依赖）
    if (!entry.startsWith('http')) {
      grouped.set(entry, {
        kind: '补充',
        name: entry,
        what: '主源缺失枪械的面板数据（本地包，离线读取）',
        url: '',
      });
      continue;
    }
    // jsDelivr 镜像：https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}
    const matched = /cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^@/]+)@[^/]+\/(.+)$/.exec(entry);
    if (!matched) continue;
    const [, owner, repo, filePath] = matched;
    const fileName = filePath.split('/').pop() ?? filePath;
    const role = SOURCE_ROLES[`${owner}/${repo}/${fileName}`];
    const name = `${owner}/${repo}`;
    const what = role?.what ?? fileName;
    const existing = grouped.get(name);
    if (existing) {
      // 同仓库多文件：用途合并到同一行，避免重复展示仓库名
      if (!existing.what.includes(what)) existing.what += `；${what}`;
    } else {
      grouped.set(name, {
        kind: role?.kind ?? '数据',
        name,
        what,
        url: `https://github.com/${owner}/${repo}`,
      });
    }
  }
  // 固定展示顺序：弹药 → 枪械 → 补充，与站点信息主次一致；未知分类排末尾
  const order = ['弹药', '枪械', '索引', '补充', '数据'];
  const rank = (kind: string) => {
    const idx = order.indexOf(kind);
    return idx === -1 ? order.length : idx;
  };
  return [...grouped.values()].sort((a, b) => rank(a.kind) - rank(b.kind));
}

/**
 * 数据来源面板（首页，向用户说明数据出处、同步方式与免责口径）
 * @param sources - 由 meta.sources 解析出的来源列表
 */
function DataSourcePanel({ sources }: { sources: SourceInfo[] }) {
  const list = [...sources, IMAGE_SOURCE];
  return (
    <section
      id="data-source"
      className="tac-panel tac-panel-plain mt-4 rounded-xl p-4 sm:p-6"
      aria-labelledby="data-source-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="data-source-title"
          className="flex items-center gap-2 text-[13px] font-bold tracking-[0.2em] text-muted"
        >
          <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
          数据来源
        </h2>
        <span className="num text-[10px] tracking-[0.2em] text-muted/50">DATA PROVENANCE</span>
      </div>

      <p className="mt-2 max-w-[760px] text-[13px] leading-relaxed text-muted">
        本站为玩家自制的非官方工具站，数据全部来自开源社区整理，由
        <code className="num mx-1 rounded border border-edge bg-panel-hi px-1.5 py-0.5 text-[12px] text-main">
          npm run sync
        </code>
        在构建期一次性同步入库；页面为静态生成，运行时不再请求任何第三方接口。
      </p>

      {/* 数据链路 */}
      <div className="num mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-muted/70">
        <span className="key-chip">社区开源数据集</span>
        <span aria-hidden="true">→</span>
        <span className="key-chip">sync 入库</span>
        <span aria-hidden="true">→</span>
        <span className="key-chip">SQLite</span>
        <span aria-hidden="true">→</span>
        <span className="key-chip">构建期 SSG</span>
      </div>

      <ul className="mt-5 divide-y divide-edge/60 border-t border-edge/60">
        {list.map((s) => (
          <li
            key={`${s.kind}-${s.name}`}
            className="group -mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 rounded-md px-2 py-3 transition-colors hover:bg-panel-hi/50"
          >
            <span className="badge w-12 shrink-0 justify-center border-edge text-muted transition-colors group-hover:border-accent/40 group-hover:text-accent">
              {s.kind}
            </span>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="num text-[12px] text-main underline-offset-4 transition-colors group-hover:text-accent hover:underline"
              >
                {s.name}
                <span className="ml-1 text-muted/50" aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : (
              <span className="num text-[12px] text-main">{s.name}</span>
            )}
            <span className="text-[12px] leading-relaxed text-muted">{s.what}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-l-2 border-edge pl-3 text-[12px] leading-relaxed text-muted/70">
        武器图按官方武器 ID 索引匹配；本站与腾讯 / 琳琅天上无关，数据可能存在滞后或误差，请以游戏内实测为准。
      </p>
    </section>
  );
}

/**
 * Hero 右侧雷达装饰环（纯 SVG，装饰性质，屏幕阅读器忽略）
 * @returns 同心环 + 刻度 + 三角洲三角意象
 */
function HeroRadar() {
  return (
    <div
      className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 lg:block"
      aria-hidden="true"
    >
      <div className="relative h-[460px] w-[460px]">
        {/* 环心柔光 */}
        <div className="absolute inset-24 rounded-full bg-accent/[0.07] blur-3xl" />
        <svg viewBox="0 0 460 460" className="absolute inset-0 h-full w-full text-accent/25">
          <circle cx="230" cy="230" r="150" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle
            cx="230"
            cy="230"
            r="204"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          {/* 缓慢旋转的外圈刻度 */}
          <g className="radar-spin">
            <circle
              cx="230"
              cy="230"
              r="204"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeDasharray="2 48"
              strokeOpacity="0.45"
            />
          </g>
          {/* 内圈虚线 + 十字准线 */}
          <circle
            cx="230"
            cy="230"
            r="94"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="1 13"
            strokeOpacity="0.7"
          />
          <path
            d="M230 18v42M230 400v42M18 230h42M400 230h42"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.55"
          />
        </svg>
        {/* 中心三角洲三角 */}
        <svg
          viewBox="0 0 32 32"
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-accent/35"
        >
          <path d="M16 3 30 28H2Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M16 12 23.5 25H8.5Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

/**
 * 穿甲判定色块示意（核心卡右下角装饰：行 = 弹种，列 = 护甲等级）
 * 仅表达「绿可穿 / 黄临界 / 红不可穿」的视觉概念，不代表真实数据
 */
type MatrixTone = 'ok' | 'warn' | 'bad';

const MATRIX_CELLS: MatrixTone[] = [
  'ok', 'ok', 'warn', 'bad', 'bad',
  'ok', 'warn', 'warn', 'bad', 'bad',
  'warn', 'warn', 'bad', 'bad', 'bad',
];

/** 判定色块对应样式（绿 / 黄 / 红） */
const MATRIX_CELL_STYLE: Record<MatrixTone, string> = {
  ok: 'border-t2/45 bg-t2/20',
  warn: 'border-t5/45 bg-t5/20',
  bad: 'border-danger/40 bg-danger/15',
};

function MatrixPreview() {
  return (
    <div
      className="pointer-events-none absolute bottom-5 right-5 hidden grid-cols-5 gap-1.5 sm:grid"
      aria-hidden="true"
    >
      {MATRIX_CELLS.map((tone, i) => (
        <span key={i} className={`h-4 w-6 rounded-sm border ${MATRIX_CELL_STYLE[tone]}`} />
      ))}
    </div>
  );
}

export default function Home() {
  let counts: { ammo: number; weapons: number } = { ammo: 118, weapons: 81 };
  let season = '—';
  let datasetVersion = '';
  let updated = '—';
  let sourcesRaw = '';
  try {
    const meta = getMeta();
    counts = JSON.parse(meta.counts ?? '{}') as { ammo: number; weapons: number };
    season = meta.season ?? '—';
    // 上游数据集版本（如 20261105-weiguang.1），用于判断本站数据是否落后于当前赛季
    datasetVersion = meta.datasetVersion && meta.datasetVersion !== 'unknown' ? meta.datasetVersion : '';
    updated = new Date(meta.generatedAt).toLocaleDateString('zh-CN');
    sourcesRaw = meta.sources ?? '';
  } catch {
    // 数据库缺失时用兜底数值渲染骨架
  }

  const sources = parseSources(sourcesRaw);

  const cards: EntranceCard[] = [
    {
      href: '/ammo/matrix',
      tag: 'CORE',
      title: '穿甲对照矩阵',
      desc: '弹种 × 护甲等级速查，出装前看一眼带几级弹。三色判定一眼看清能否打穿。',
      short: '弹种 × 护甲等级三色速查，出装前先看一眼。',
      icon: <IconChart className="h-5 w-5 sm:h-7 sm:w-7" />,
      span: 'col-span-2 sm:col-span-2 lg:col-span-2',
      core: true,
    },
    {
      href: '/ammo',
      tag: 'AMMO',
      title: '弹药库',
      desc: `全口径 ${counts.ammo} 种弹药：穿透等级、伤害比例、适用枪械。`,
      short: `全口径 ${counts.ammo} 种弹药的穿透与伤害`,
      icon: <IconAmmo className="h-5 w-5 sm:h-7 sm:w-7" />,
      span: '',
    },
    {
      href: '/weapons',
      tag: 'ARMS',
      title: '武器图鉴',
      desc: `收录 ${counts.weapons} 把枪械：面板、口径、可改装槽位。`,
      short: `${counts.weapons} 把枪械的面板与改装数据`,
      icon: <IconBook className="h-5 w-5 sm:h-7 sm:w-7" />,
      span: '',
    },
    {
      href: '/about',
      tag: 'SOON',
      title: '改枪码',
      desc: '二期上线，敬请期待。',
      short: '二期上线，敬请期待。',
      icon: <IconUnknown className="h-5 w-5 sm:h-7 sm:w-7" />,
      span: 'col-span-2 sm:col-span-2 lg:col-span-2',
      soon: true,
    },
  ];

  return (
    <div>
      {/* ============ Hero：全宽战术横幅（与内页 PageHero 同一视觉语言） ============ */}
      <section className="relative -mt-4 mb-5 mx-[calc(50%-50vw)] overflow-hidden border-b border-accent/25 sm:mb-8">
        {/* 氛围层 1：主题化渐变底 */}
        <div className="absolute inset-0" style={{ background: 'var(--hero-bg)' }} aria-hidden="true" />
        {/* 氛围层 2：战术网格（右侧渐隐，给装饰环留白） */}
        <div
          className="absolute inset-0 bg-grid"
          style={{ maskImage: 'linear-gradient(90deg, black 6%, transparent 76%)' }}
          aria-hidden="true"
        />
        {/* 氛围层 3：斜向扫描光带 */}
        <div className="absolute inset-0" style={{ background: 'var(--hero-sweep)' }} aria-hidden="true" />
        <HeroRadar />

        <div className="relative mx-auto max-w-[1200px] px-4 py-8 sm:py-14">
          <p className="num flex items-center gap-2.5 text-[11px] tracking-[0.32em] text-accent">
            <span className="h-px w-8 bg-accent/60" aria-hidden="true" />
            DELTA ARSENAL // {season} 数据集
          </p>

          <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[0.1em] title-glow sm:mt-5 sm:text-5xl sm:tracking-[0.14em]">
            三角洲<span className="text-accent">军械库</span>
          </h1>

          <p className="mt-3 text-sm tracking-wider text-muted sm:mt-4 sm:text-[15px]">
            情报，永远比子弹先到一步。
          </p>
          <p className="mt-1.5 max-w-[520px] text-[13px] leading-relaxed text-muted/70 sm:text-sm">
            弹药全字段、枪械面板与穿甲判定，构建期直读社区数据源，撤离前查这一站。
          </p>

          {/* 主 CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <Link
              href="/ammo/matrix"
              className="group inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-bold tracking-wide text-[color:var(--on-accent)] transition-all [box-shadow:var(--box-glow)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              进入穿甲矩阵
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="/ammo"
              className="inline-flex items-center gap-2 rounded-md border border-edge bg-panel/50 px-4 py-2 text-[13px] tracking-wide text-muted transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              浏览弹药库
            </Link>
          </div>

          {/* 数据速览：等宽数字 + 细分隔线；窄屏两列摆放，避免长版本号溢出 */}
          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 sm:mt-8 sm:flex sm:flex-wrap sm:items-end sm:gap-x-10 sm:gap-y-5">
            <div className="border-l border-accent/30 pl-3">
              <dt className="num text-[10px] tracking-[0.2em] text-muted sm:tracking-[0.3em]">弹药 AMMO</dt>
              <dd className="num mt-1 text-2xl font-bold leading-none text-accent">{counts.ammo}</dd>
            </div>
            <div className="border-l border-info/30 pl-3">
              <dt className="num text-[10px] tracking-[0.2em] text-muted sm:tracking-[0.3em]">枪械 ARMS</dt>
              <dd className="num mt-1 text-2xl font-bold leading-none text-info">{counts.weapons}</dd>
            </div>
            <div className="border-l border-edge pl-3">
              <dt className="num text-[10px] tracking-[0.2em] text-muted sm:tracking-[0.3em]">数据更新</dt>
              <dd className="num mt-1 text-xl font-bold leading-none text-main">{updated}</dd>
            </div>
            <div className="border-l border-edge pl-3">
              <dt className="num text-[10px] tracking-[0.2em] text-muted sm:tracking-[0.3em]">数据集 DATASET</dt>
              <dd className="num mt-1 truncate text-base font-bold leading-none text-main" title={datasetVersion || '—'}>
                {datasetVersion || '—'}
              </dd>
            </div>
          </dl>

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-wider text-muted/50 sm:mt-7">
            <span>非官方粉丝站点 · 数据仅供参考，以游戏内实测为准</span>
            <a
              href="#data-source"
              className="text-accent/70 underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              查看数据来源 ↓
            </a>
          </p>
        </div>

        {/* 底边强调色分割线 */}
        <div
          className="absolute bottom-0 left-0 h-px w-1/2 bg-gradient-to-r from-accent via-accent/40 to-transparent"
          aria-hidden="true"
        />
      </section>

      {/* ============ 模块入口：Bento 网格（移动端 2 列紧凑排布，核心/二期卡占整行） ============ */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-[13px] font-bold tracking-[0.2em] text-muted">核心模块</h2>
          <span className="num text-[10px] tracking-[0.2em] text-muted/50">4 MODULES</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Link
              key={c.href}
              href={c.href}
              className={`tac-panel tac-panel-plain group relative flex flex-col overflow-hidden rounded-xl p-3.5 sm:p-5 ${c.span} ${
                c.soon ? 'opacity-70 hover:border-edge' : 'tac-hover-flat'
              }`}
            >
              {/* hover 时从右上角晕开的强调色光斑 */}
              {!c.soon && (
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      'radial-gradient(120% 90% at 100% 0%, var(--accent-dim), transparent 62%)',
                  }}
                  aria-hidden="true"
                />
              )}

              {/* 三色判定示意（仅核心卡） */}
              {c.core && <MatrixPreview />}

              {/* 二期功能卡：右侧状态水印，移动端也保留，用来补足整行卡片的右侧留白 */}
              {c.soon && (
                <span
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none num text-[40px] font-bold leading-none tracking-[0.12em] text-accent/[0.06] sm:right-6 sm:text-[64px]"
                  aria-hidden="true"
                >
                  SOON
                </span>
              )}

              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors sm:h-14 sm:w-14 ${
                    c.core
                      ? 'border-accent/45 bg-gradient-to-br from-accent/25 to-accent/5 text-accent [box-shadow:var(--box-glow)]'
                      : 'border-edge bg-panel-hi text-muted group-hover:text-accent'
                  }`}
                >
                  {c.icon}
                </span>
                <span className="num text-[10px] tracking-[0.2em] text-muted/40 sm:text-[11px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              {/* 二期卡的角标在移动端隐藏：标题旁已有「二期上线」说明，省一行高度 */}
              <span
                className={`badge relative mt-3 w-fit sm:mt-5 ${c.core ? 'border-accent/40 text-accent' : ''} ${
                  c.soon ? '!hidden sm:!inline-flex' : ''
                }`}
              >
                {c.tag}
                {c.core && ' ★'}
              </span>

              <h3
                className={`relative mt-1.5 text-base font-bold tracking-wide transition-colors sm:mt-2.5 sm:text-lg ${
                  c.core ? 'text-accent' : 'group-hover:text-accent'
                }`}
              >
                {c.title}
              </h3>
              {/* 移动端两列宽度有限，用精简文案；桌面仍是完整描述 */}
              <p className="relative mt-1 max-w-[420px] text-[12px] leading-relaxed text-muted sm:mt-1.5 sm:text-sm">
                <span className="sm:hidden">{c.short}</span>
                <span className="hidden sm:inline">{c.desc}</span>
              </p>

              <span
                className={`relative mt-auto items-center gap-1.5 pt-3 text-[11px] tracking-[0.18em] sm:pt-5 ${
                  c.soon ? 'hidden sm:flex num text-muted/60' : 'flex num text-muted group-hover:text-accent'
                }`}
              >
                {c.soon ? 'COMING SOON' : '进入模块'}
                {!c.soon && (
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                    →
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ 数据来源：说明出处与同步方式 ============ */}
      <DataSourcePanel sources={sources} />
    </div>
  );
}
