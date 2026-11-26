import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllWeapons, getWeapon, getAmmoOfWeapon, getRelatedWeapons } from '@/lib/db';
import { describeAmmoEffects, parseAmmoEffects } from '@/lib/ammo-effects';
import { IconRifle } from '@/components/commons/icons';
import { AMMO_EFFECT_TONE, SLOT_NAMES, tierTextClass } from '@/constants/game';
import type { WeaponPanel } from '@/types/weapon';

export function generateStaticParams() {
  return getAllWeapons().map((w) => ({ id: w.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = getWeapon(id);
  return { title: w ? w.name : '武器详情' };
}

const TIER_BORDER = ['border-l-t1', 'border-l-t2', 'border-l-t3', 'border-l-t4', 'border-l-t5'];

export default async function WeaponDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = getWeapon(id);
  if (!w) notFound();

  // 库中为 JSON 字符串，构建期解析并显式标注类型（禁止隐式 any）
  const panel = JSON.parse(w.panel || '{}') as WeaponPanel;
  const slots = JSON.parse(w.slots || '[]') as string[];
  const ammo = getAmmoOfWeapon(id);
  const related = getRelatedWeapons(w);

  // 面板字段可能缺省（补充源枪械），缺省项在渲染时过滤掉
  const panelItems: [string, string | number | undefined][] = [
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
            <img
              src={w.image}
              alt={w.name}
              loading="lazy"
              className="max-h-48 w-full object-contain sm:max-h-64"
            />
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
          <div className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {panelItems
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-edge py-2 text-sm">
                  <span className="text-muted">{k}</span>
                  <span className="num">{v}</span>
                </div>
              ))}
          </div>
          {panel.fireModes && panel.fireModes.length > 0 && (
            <p className="num text-xs text-muted mt-3">开火模式：{panel.fireModes.join(' / ')}</p>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-bold mb-2">适用弹药 <span className="num text-xs text-muted">({ammo.length})</span></h2>
        {ammo.length ? (
          <div className="grid gap-2">
            {ammo.map((a) => {
              // 命中特效（燃烧 / 爆裂）：有则名称后跟一枚标签，悬浮看完整参数
              const effects = describeAmmoEffects(parseAmmoEffects(a.effects));
              return (
                <Link
                  key={a.id}
                  href={`/ammo?ammo=${a.id}`}
                  className={`tac-panel !border-l-2 ${a.tier ? TIER_BORDER[a.tier - 1] : 'border-l-edge'} px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm hover:border-accent transition-colors`}
                >
                  <span>{a.name}</span>
                  {effects.map((e) => (
                    <span
                      key={e.key}
                      className="badge shrink-0"
                      style={{ color: AMMO_EFFECT_TONE[e.key], borderColor: AMMO_EFFECT_TONE[e.key] }}
                      title={e.detail}
                    >
                      {e.label}
                    </span>
                  ))}
                  <span className="num text-xs text-muted ml-auto">
                    穿透 <b className={a.tier ? tierTextClass(a.tier) : ''}>{a.pen_level}</b> 级 · 伤害
                    {Math.round(a.dmg_ratio * 100)}%
                  </span>
                </Link>
              );
            })}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
