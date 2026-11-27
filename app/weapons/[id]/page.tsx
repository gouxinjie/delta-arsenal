/**
 * 武器详情页（SSG）
 * @description 上半部分是「图 + 名称 + 速览」的信息头，下半部分按 枪械属性 → 适用弹药 → 改装槽位 → 同类武器 分区；
 *              面板刻度与图鉴抽屉共用 lib/view 的统计口径，弹药磁贴共用 commons/AmmoTile
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-27
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllWeapons, getAmmoOfWeapon, getRelatedWeapons, getWeapon } from '@/lib/db';
import { computeStatMax, parseWeaponPanel, toSlotChips, toWeaponDetail } from '@/lib/view';
import {
  WEAPON_BAR_STAT_KEYS,
  WEAPON_GRADE_NOTE,
  WEAPON_STAT_META,
  WEAPON_VALUE_ROW_KEYS,
  weaponGradeLabel,
  weaponGradeTextClass,
} from '@/constants/weapon';
import AmmoTile from '@/components/commons/AmmoTile';
import SectionTitle from '@/components/commons/SectionTitle';
import SmartImage from '@/components/commons/SmartImage';
import { IconRifle } from '@/components/commons/icons';

export function generateStaticParams() {
  return getAllWeapons().map((w) => ({ id: w.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = getWeapon(id);
  return { title: w ? w.name : '武器详情' };
}

export default async function WeaponDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = getWeapon(id);
  if (!w) notFound();

  // 面板 / 槽位 JSON 的解析与弹药裁剪集中在 lib/view，与图鉴页共用同一口径
  const { panel, slots, ammo, grade } = toWeaponDetail(w, getAmmoOfWeapon(id));
  const related = getRelatedWeapons(w);
  // 进度条刻度：全库同字段最大值，与图鉴抽屉一致，避免两处百分比不可比
  const statMax = computeStatMax(getAllWeapons().map((row) => parseWeaponPanel(row.panel)));

  /**
   * 「其它参数」：纯数值行 + 开火模式（行顺序见 constants/weapon）
   * 标签与单位统一取自 WEAPON_STAT_META，缺省项显示「—」
   */
  const valueRows = WEAPON_VALUE_ROW_KEYS.map((key) => {
    if (key === 'fireModes') {
      return { key, label: '开火模式', value: panel.fireModes?.length ? panel.fireModes.join(' / ') : '—' };
    }
    const meta = WEAPON_STAT_META[key];
    const raw = panel[key];
    return { key, label: meta.label, value: raw != null ? `${raw}${meta.unit ?? ''}` : '—' };
  });

  return (
    <article className="space-y-4 sm:space-y-5">
      {/* 面包屑：详情页不套全宽 Hero，用一行面包屑交代层级并提供回退入口 */}
      <nav aria-label="面包屑" className="flex items-center gap-1.5 text-[11px] text-muted">
        <Link
          href="/weapons"
          className="rounded transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
        >
          武器图鉴
        </Link>
        <span aria-hidden="true" className="text-muted/50">
          /
        </span>
        <span className="num truncate text-main/80">{w.name}</span>
      </nav>

      {/* 信息头：左图右文，图区沿用图鉴卡片的径向底纹与武器图投影 */}
      <header className="tac-panel tac-panel-plain overflow-hidden rounded-lg">
        <div className="flex flex-col sm:flex-row">
          <div className="thumb-bg flex items-center justify-center border-b border-edge/60 bg-bg/40 px-6 py-5 sm:w-[40%] sm:border-b-0 sm:border-r sm:px-8 sm:py-6">
            <SmartImage
              src={w.image}
              alt={w.name}
              lazy={false}
              className="weapon-img max-h-[110px] w-full object-contain sm:max-h-[160px]"
              fallback={<IconRifle className="h-16 w-16 text-muted/25" />}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
            <h1 className="text-lg font-bold tracking-wide sm:text-2xl">{w.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {/* 类别用中性描边标签、口径用强调色标签，与图鉴卡片保持同一套语义色 */}
              <span className="rounded border border-edge/70 bg-bg/60 px-1.5 py-px text-[11px] text-muted sm:text-xs">
                {w.category}
              </span>
              <span className="num rounded bg-accent/10 px-1.5 py-px text-[11px] font-medium text-accent sm:text-xs">
                {w.caliber || '—'}
              </span>
              {/* 社区分级：非官方口径，未定级（grade=0）不渲染徽标 */}
              {grade > 0 && (
                <span
                  className={`num rounded bg-accent/10 px-1.5 py-px text-[11px] font-medium sm:text-xs ${weaponGradeTextClass(grade)}`}
                  title={WEAPON_GRADE_NOTE}
                >
                  {weaponGradeLabel(grade)}
                </span>
              )}
            </div>

            {/* 速览三格：弹药数 / 槽位数 / 开火模式，纯文字列表之前要读两屏才知道 */}
            <dl className="num mt-4 grid grid-cols-3 gap-1.5">
              <div className="rounded border border-edge/70 bg-bg/50 px-2 py-1.5">
                <dt className="text-[10px] leading-tight text-muted">可用弹药</dt>
                <dd className="mt-0.5 text-sm font-semibold text-accent">{ammo.length}</dd>
              </div>
              <div className="rounded border border-edge/70 bg-bg/50 px-2 py-1.5">
                <dt className="text-[10px] leading-tight text-muted">改装槽位</dt>
                <dd className="mt-0.5 text-sm font-semibold text-accent">{slots.length}</dd>
              </div>
              <div className="min-w-0 rounded border border-edge/70 bg-bg/50 px-2 py-1.5">
                <dt className="text-[10px] leading-tight text-muted">弹匣容量</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-accent">
                  {panel.magSize != null ? `${panel.magSize} 发` : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      {/* 枪械属性：核心性能（进度条）+ 其它参数（纯数值行），两组用竖线分隔避免数字混读 */}
      <section className="tac-panel tac-panel-plain rounded-lg p-4 sm:p-5">
        <SectionTitle as="h2" title="枪械属性" />
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted">
              <span className="h-1.5 w-1.5 rounded-[1px] bg-accent" aria-hidden="true" />
              核心性能
            </p>
            <div className="space-y-1">
              {WEAPON_BAR_STAT_KEYS.map((key) => {
                const meta = WEAPON_STAT_META[key];
                const value = panel[key] ?? null;
                const max = statMax[key] ?? 0;
                const pct = value != null && max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
                return (
                  <div key={key} className="flex h-7 items-center gap-2">
                    <span className="w-[72px] shrink-0 whitespace-nowrap text-[11px] text-muted">{meta.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge/80">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-accent/40 to-accent [box-shadow:var(--bar-glow)]"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="num w-14 shrink-0 text-right text-[13px] font-medium text-main">
                      {value ?? '—'}
                      {value != null && meta.unit ? meta.unit : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sm:border-l sm:border-edge/60 sm:pl-6">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted">
              <span className="h-1.5 w-1.5 rounded-[1px] bg-info" aria-hidden="true" />
              其它参数
            </p>
            <div className="space-y-0.5">
              {valueRows.map((r) => (
                <div
                  key={r.key}
                  className="-mx-1 flex h-7 items-center justify-between gap-2 border-b border-edge/40 px-1 last:border-b-0"
                >
                  <span className="whitespace-nowrap text-[11px] text-muted">{r.label}</span>
                  <span className="num truncate text-[13px] text-accent">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 border-t border-edge/60 pt-3 text-[11px] leading-relaxed text-muted/80">
          面板数值来自官方数据源，不同来源枪械字段完整度略有差异。仅供参考，以游戏内实测为准。
          <br />
          武器分级为社区按基础属性与改装上限的划分，非官方数据，会随赛季平衡调整；未定级的枪械不展示等级徽标。
        </p>
      </section>

      {/* 适用弹药：与武器抽屉同款磁贴，点击到弹药库定位并高亮对应型号 */}
      <section className="tac-panel tac-panel-plain rounded-lg p-4 sm:p-5">
        <SectionTitle
          as="h2"
          title="适用弹药"
          count={ammo.length}
          extra={
            <Link href="/ammo" className="transition-colors hover:text-accent">
              弹药库 →
            </Link>
          }
        />
        {ammo.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {ammo.map((a) => (
              <AmmoTile key={a.id} ammo={a} size="md" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">暂无关联弹药数据（补充源枪械可能缺失关联）</p>
        )}
      </section>

      {/* 可改装槽位（数据源只有槽位清单，没有具体改枪方案） */}
      <section className="tac-panel tac-panel-plain rounded-lg p-4 sm:p-5">
        <SectionTitle as="h2" title="可改装槽位" count={slots.length} />
        {slots.length ? (
          <div className="flex flex-wrap gap-1.5">
            {/* 同名槽位合并计数（与图鉴抽屉同一口径，见 lib/view 的 toSlotChips） */}
            {toSlotChips(slots).map((chip) => (
              <span
                key={chip.key}
                className="num rounded border border-edge bg-bg/40 px-2 py-1 text-[11px] text-muted transition-colors hover:border-accent/60 hover:bg-panel-hi hover:text-main"
              >
                {chip.label}
                {chip.count > 1 ? ` ×${chip.count}` : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">暂无槽位数据（补充源枪械）</p>
        )}
      </section>

      {related.length > 0 && (
        <section className="tac-panel tac-panel-plain rounded-lg p-4 sm:p-5">
          <SectionTitle
            as="h2"
            title="同类武器"
            extra={
              <Link href="/weapons" className="transition-colors hover:text-accent">
                全部图鉴 →
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/weapons/${r.id}`}
                className="group flex items-center gap-2.5 rounded border border-edge bg-bg/40 px-2.5 py-2 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                <span className="thumb-bg flex h-10 w-16 shrink-0 items-center justify-center rounded bg-bg">
                  <SmartImage
                    src={r.image}
                    alt={r.name}
                    className="weapon-img max-h-8 max-w-full object-contain"
                    fallback={<IconRifle className="h-5 w-5 text-muted/30" />}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm transition-colors group-hover:text-accent">{r.name}</span>
                  <span className="num block truncate text-[11px] text-muted">{r.caliber || '—'}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
