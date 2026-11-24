import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllWeapons, getWeapon, getAmmoOfWeapon, getRelatedWeapons } from '@/lib/db';
import { IconRifle } from '@/components/commons/icons';

export function generateStaticParams() {
  return getAllWeapons().map((w) => ({ id: w.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = getWeapon(id);
  return { title: w ? w.name : '武器详情' };
}

const TIER_TEXT = ['text-t1', 'text-t2', 'text-t3', 'text-t4', 'text-t5'];
const TIER_BORDER = ['border-l-t1', 'border-l-t2', 'border-l-t3', 'border-l-t4', 'border-l-t5'];

const SLOT_NAMES: Record<string, string> = {
  '1': '瞄具', '2': '枪口', '3': '枪管', '4': '护木', '5': '弹匣', '6': '枪托',
  '8': '前握把', '10': '后握把', '11': '导轨', '14': '功能性配件', '17': '侧导轨',
  '19': '机匣盖', '20': '战术灯', '31': '枪口下挂', '32': '弹鼓', '34': '拉机柄',
  '35': '上导轨', '38': '枪管下导轨', '40': '枪口附件', '44': '下挂榴弹', '45': '枪带环',
  '50': '通用导轨',
};

export default async function WeaponDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = getWeapon(id);
  if (!w) notFound();

  const panel = JSON.parse(w.panel || '{}');
  const slots: string[] = JSON.parse(w.slots || '[]');
  const ammo = getAmmoOfWeapon(id);
  const related = getRelatedWeapons(w);

  const panelItems: [string, string | number][] = [
    ['肉体伤害', panel.meatHarm], ['护甲伤害', panel.armorHarm],
    ['射速', panel.fireRate], ['有效射程', panel.effectiveRange],
    ['后坐力控制', panel.recoil], ['操控速度', panel.control],
    ['瞄准稳定性', panel.stability], ['腰射精度', panel.hipFire],
    ['枪口初速', panel.muzzleVelocity], ['弹匣容量', panel.magSize],
    ['声浪范围', panel.soundRadius],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="tac-panel md:w-2/5 p-4 flex items-center justify-center">
          {w.image ? (
            <img src={w.image} alt={w.name} className="max-h-64 object-contain" />
          ) : (
            <span className="text-muted/30" aria-hidden="true">
              <IconRifle className="w-24 h-24" />
            </span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{w.name}</h1>
          <p className="num text-sm text-muted mt-1">
            {w.category} · {w.caliber || '—'}
          </p>
          <div className="grid grid-cols-2 gap-x-6 mt-4">
            {panelItems
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-edge py-2 text-sm">
                  <span className="text-muted">{k}</span>
                  <span className="num">{v}</span>
                </div>
              ))}
          </div>
          {panel.fireModes?.length > 0 && (
            <p className="num text-xs text-muted mt-3">开火模式：{panel.fireModes.join(' / ')}</p>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-bold mb-2">适用弹药 <span className="num text-xs text-muted">({ammo.length})</span></h2>
        {ammo.length ? (
          <div className="grid gap-2">
            {ammo.map((a) => (
              <Link
                key={a.id}
                href={`/ammo?q=${encodeURIComponent(a.name)}`}
                className={`tac-panel !border-l-2 ${a.tier ? TIER_BORDER[a.tier - 1] : 'border-l-edge'} px-4 py-2 flex items-center gap-3 text-sm hover:border-accent transition-colors`}
              >
                <span>{a.name}</span>
                <span className="num text-xs text-muted ml-auto">
                  穿透 <b className={a.tier ? TIER_TEXT[a.tier - 1] : ''}>{a.pen_level}</b> 级 · 伤害
                  {Math.round(a.dmg_ratio * 100)}%
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">暂无关联弹药数据</p>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">可改装槽位 <span className="num text-xs text-muted">({slots.length})</span></h2>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <span key={s} className="num text-xs border border-edge rounded px-2 py-1 text-muted">
              {SLOT_NAMES[s] ?? `槽位 ${s}`}
            </span>
          ))}
          {!slots.length && <span className="text-sm text-muted">暂无数据（补充源枪械）</span>}
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">同类武器</h2>
          <div className="grid grid-cols-3 gap-3">
            {related.map((r) => (
              <Link key={r.id} href={`/weapons/${r.id}`} className="tac-panel p-3 hover:border-accent transition-colors">
                <p className="text-sm truncate">{r.name}</p>
                <p className="num text-[11px] text-muted mt-0.5">{r.caliber || '—'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
