import Link from 'next/link';
import { getMeta } from '@/lib/db';
import { IconChart, IconAmmo, IconBook, IconUnknown } from '@/components/commons/icons';

export default function Home() {
  let counts = { ammo: 118, weapons: 81 };
  let season = '—';
  let updated = '—';
  try {
    const meta = getMeta();
    counts = JSON.parse(meta.counts ?? '{}');
    season = meta.season ?? '—';
    updated = new Date(meta.generatedAt).toLocaleDateString('zh-CN');
  } catch {}

  const cards = [
    { href: '/ammo/matrix', tag: 'CORE', title: '穿甲对照矩阵', desc: '弹种 × 护甲等级速查，出装前看一眼带几级弹', icon: <IconChart className="w-5 h-5" />, star: true },
    { href: '/ammo', tag: 'AMMO', title: '弹药库', desc: `全口径 ${counts.ammo} 种弹药：穿透等级、伤害比例、适用枪械`, icon: <IconAmmo className="w-5 h-5" /> },
    { href: '/weapons', tag: 'ARMS', title: '武器图鉴', desc: `收录 ${counts.weapons} 把枪械：面板、口径、可改装槽位`, icon: <IconBook className="w-5 h-5" /> },
    { href: '/about', tag: 'SOON', title: '改枪码', desc: '二期上线，敬请期待', icon: <IconUnknown className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="tac-panel rounded-lg relative overflow-hidden px-8 py-14 text-center">
        <div className="bg-grid absolute inset-0" aria-hidden="true" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-56 bg-accent/10 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />
        <div className="relative">
          <p className="num text-[11px] tracking-[0.3em] text-accent mb-4">DELTA ARSENAL // {season} 数据集</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.22em] title-glow">
            三角洲<span className="text-accent">军械库</span>
          </h1>
          <p className="text-muted mt-4 text-sm tracking-wider">情报，永远比子弹先到一步。</p>
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            <span className="badge text-accent border-accent/40">弹药 {counts.ammo}</span>
            <span className="badge text-info border-info/40">枪械 {counts.weapons}</span>
            <span className="badge">更新 {updated}</span>
          </div>
        </div>
      </section>

      {/* 入口卡片 */}
      <section className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="tac-panel tac-hover rounded-lg p-5 group">
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-2 num text-[10px] tracking-[0.25em] ${c.star ? 'text-accent' : 'text-muted'}`}>
                <span className={`${c.star ? 'text-accent' : 'text-muted'}`}>{c.icon}</span>
                {c.tag} {c.star && '★'}
              </span>
              <span className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all">→</span>
            </div>
            <h2 className={`text-lg font-bold mt-3 group-hover:text-accent transition-colors ${c.star ? 'text-accent' : ''}`}>
              {c.title}
            </h2>
            <p className="text-sm text-muted mt-1">{c.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
