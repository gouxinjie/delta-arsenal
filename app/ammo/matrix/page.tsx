import type { ReactNode } from 'react';
import { getAllAmmo } from '@/lib/db';
import { parseJson } from '@/lib/json';
import { ARMOR_LEVELS, cellTitle, isSpecialAmmo, judge } from '@/lib/penetration';
import PageHero from '@/components/commons/PageHero';
import { IconAmmo, IconChart, IconCheck, IconCross, IconShield, IconWarn } from '@/components/commons/icons';
import { RARITY_LABEL, ammoColor, isExclusiveAmmo } from '@/constants/game';
import type { AmmoRow, PenetrationMatrix } from '@/types/ammo';

export const metadata = { title: '穿甲对照矩阵' };

// 图例中的穿透判定四档（与 lib/penetration 的 judge() 阈值保持一致，改规则时两处同步）
const PEN_RULES: { label: string; rate: string; icon: ReactNode; tone: string }[] = [
  { label: '高 2 级以上', rate: '100%', icon: <IconCheck className="h-3.5 w-3.5" />, tone: 'text-t2' },
  { label: '高 1 级', rate: '75%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-t5' },
  { label: '等级相同', rate: '50%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-warn' },
  { label: '低于甲级', rate: '0%', icon: <IconCross className="h-3.5 w-3.5" />, tone: 'text-danger' },
];

/** 弹药标识入参（只取展示所需字段，便于表格与卡片复用） */
interface AmmoLabelProps {
  /** 弹药基础信息 */
  ammo: Pick<AmmoRow, 'name' | 'caliber' | 'rarity' | 'tier' | 'pen_level'>;
  /** 品阶色（专属弹为危险色，由 ammoColor 统一计算） */
  color: string;
  /** 判定是否偏离常规四档 */
  special: boolean;
}

/**
 * 弹药标识块：名称 + 穿透 / 品阶 / 特殊徽章 + 口径行
 * 桌面表格首列与移动端卡片共用，保证两套布局信息一致
 * @param props - 弹药与配色信息
 */
function AmmoLabel({ ammo, color, special }: AmmoLabelProps) {
  const exclusive = isExclusiveAmmo(ammo);
  const tierLabel = exclusive ? '专属弹' : `${ammo.tier ?? '?'} 阶（${ammo.rarity ?? '—'}）`;
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{ammo.name}</span>
        <span
          className="badge shrink-0"
          style={{ color, borderColor: color, opacity: 0.9 }}
          title={`穿透等级 ${ammo.pen_level} 级`}
        >
          穿{ammo.pen_level}
        </span>
        <span
          className="badge shrink-0"
          style={{ color, borderColor: color, opacity: 0.85 }}
          title={`品阶：${tierLabel}`}
        >
          {exclusive ? '专属' : RARITY_LABEL[ammo.rarity] ?? `${ammo.tier}阶`}
        </span>
        {special && (
          <span
            className="badge shrink-0"
            style={{ color: 'var(--warn)', borderColor: 'var(--warn)', opacity: 0.9 }}
            title="穿透衰减不遵循常规四档（箭矢/龙息/双头弹/特效弹等），以单元格实测值为准"
          >
            特殊
          </span>
        )}
      </div>
      <p className="num text-xs text-muted mt-1 ml-0.5">
        {ammo.caliber} · {ammo.rarity ?? '—'}
      </p>
    </>
  );
}

export default function MatrixPage() {
  // 排序：全局按穿透等级从高到低，同等级按口径字母序；矩阵字段损坏时按空对象处理（该行不展示）
  const rows = getAllAmmo()
    .map((a) => ({ ...a, matrix: parseJson<PenetrationMatrix>(a.matrix, {}) }))
    .filter((a) => Object.keys(a.matrix).length > 0)
    .sort((x, y) => y.pen_level - x.pen_level || x.caliber.localeCompare(y.caliber))
    // 预先算好品阶色与特殊机制，避免表格与移动端卡片各算一遍
    .map((a) => ({
      ...a,
      color: ammoColor(a),
      special: isSpecialAmmo(a.matrix, a.pen_level),
    }));

  return (
    <div>
      <PageHero
        title="穿甲对照矩阵"
        icon={<IconChart className="w-6 h-6" />}
        subtitle={
          <>
            弹种 × 护甲等级速查：
            <b className="text-t2 inline-flex items-center gap-1">
              <IconCheck className="h-3.5 w-3.5" />
              高效穿透
            </b>
            {' ｜ '}
            <b className="text-warn inline-flex items-center gap-1">
              <IconWarn className="h-3.5 w-3.5" />
              可穿但衰减明显
            </b>
            {' ｜ '}
            <b className="text-danger inline-flex items-center gap-1">
              <IconCross className="h-3.5 w-3.5" />
              打不动
            </b>
            。单元格为命中身体时保留的生命值伤害比例。
          </>
        }
      />

      {/* 阅读图例：术语 → 判定机制 → 结论 三段式，段间用细分隔线，字号 13px 提升可读性 */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-4 mb-4 text-[13px] leading-[1.7] text-muted">
        {/* 术语说明：图标独立成列，保证三段文案左缘对齐、换行不参差 */}
        <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex gap-2">
            <IconAmmo className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <b className="text-main font-semibold">穿N</b>：穿透等级（0–7），俗称「N 级弹」
            </span>
          </div>
          <div className="flex gap-2">
            <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-sm bg-t4" aria-hidden="true" />
            <span>
              <b className="text-main font-semibold">品阶徽章</b>：白→绿→蓝→紫→金弹，与游戏内颜色一致
            </span>
          </div>
          <div className="flex gap-2">
            <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-sm bg-danger" aria-hidden="true" />
            <span>
              <b className="text-danger font-semibold">穿6/穿7</b>：狙击枪/重机枪专属弹（红标），不占常规品阶
            </span>
          </div>
        </div>

        {/* 判定机制：四档并列成卡片，配色与表格单元格一致，便于对照扫读 */}
        <div className="mt-3.5 pt-3.5 border-t border-edge">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
            <span className="h-2 w-2 shrink-0 rounded-sm bg-accent" aria-hidden="true" />
            <b className="text-main font-semibold">常规穿透机制</b>
            <span className="text-[12px] text-muted/80">按弹级与甲级级差判定，适用于多数常规弹</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            {PEN_RULES.map((rule) => (
              <div
                key={rule.label}
                className="flex items-center justify-between gap-2 rounded border border-edge/70 bg-bg/50 px-2.5 py-1.5"
              >
                <span className="num text-[12px]">{rule.label}</span>
                <span className={`num inline-flex items-center gap-1 text-[12px] font-semibold ${rule.tone}`}>
                  {rule.icon}
                  {rule.rate}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted/80 mt-1.5">
            数值为肉体伤害保留比例；打不穿时仅消耗护甲耐久。箭矢、龙息、双头弹及特效弹等特殊弹种不适用该表，
            标记「特殊」的行以单元格实测值为准。
          </p>
        </div>

        {/* 结论：左侧强调竖条 + 加粗标签，与正文区分层级 */}
        <div className="flex items-start gap-2 mt-3.5 pt-3.5 border-t border-edge">
          <span className="w-[3px] h-4 rounded bg-accent shrink-0 mt-[3px]" aria-hidden="true" />
          <p className="text-main">
            <b className="text-accent font-semibold mr-1.5">结论</b>
            常规弹想打得动，弹级必须 ≥ 甲级；同级开始掉血，但伤害只有一半。
          </p>
        </div>
      </div>

      {/*
        单一标记：桌面 / 平板为横向矩阵表（首列吸附），窄屏用 CSS 把每行重排为 3×2 卡片。
        此前是「移动卡片 + 桌面表格」两套 DOM 同时输出，118 行数据被渲染两遍，
        静态 HTML 里约一半体积与一半 DOM 节点是重复内容，合并后一并消失。
      */}
      <div className="md:overflow-x-auto md:border md:border-edge md:rounded-lg md:[box-shadow:var(--panel-shadow)]">
        <table className="matrix-table block w-full text-sm md:table md:min-w-[780px]">
          <thead className="hidden md:table-header-group">
            <tr className="bg-panel">
              <th className="sticky left-0 bg-panel z-10 px-3 py-3 text-left min-w-[220px] text-[13px] tracking-wider text-muted">
                <span className="text-accent font-semibold">你的子弹</span>（按穿透等级排序）
              </th>
              {ARMOR_LEVELS.map((lv) => (
                <th key={lv} className="px-3 py-3">
                  <span className="num text-accent inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap">
                    <IconShield className="w-3.5 h-3.5" />
                    敌人{lv}级甲
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {rows.map((a) => (
              <tr
                key={a.id}
                className="mb-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-edge/70 bg-panel/40 p-2.5 last:mb-0 hover:border-accent/40 md:mb-0 md:table-row md:gap-0 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:bg-panel/60"
              >
                <td
                  className="col-span-3 md:col-span-1 md:table-cell md:sticky md:left-0 md:z-10 md:bg-bg md:px-3 md:py-2.5"
                  style={{ boxShadow: `inset 3px 0 0 ${a.color}` }}
                >
                  <AmmoLabel ammo={a} color={a.color} special={a.special} />
                </td>
                {ARMOR_LEVELS.map((lv) => {
                  const j = judge(a.matrix[String(lv)]);
                  return (
                    <td
                      key={lv}
                      className="num rounded border border-edge/60 px-1.5 py-1.5 text-center md:rounded-none md:border-0 md:px-2 md:py-2"
                      style={{ background: j.bg, color: j.fg }}
                      title={cellTitle(j)}
                      aria-label={`${lv} 级甲：${cellTitle(j)}`}
                    >
                      {/* 窄屏没有表头，护甲等级标签落在单元格内；桌面由 thead 承载，故隐藏 */}
                      <p className="text-[10px] text-muted opacity-80 md:hidden">{lv}级甲</p>
                      <p className="mt-1 text-[13px] font-semibold md:mt-0">
                        <span aria-hidden="true">{j.glyph}</span>
                        <span className="ml-0.5 text-[10px] opacity-70">{j.rate === null ? '—' : `${j.rate}%`}</span>
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] leading-[1.7] text-muted mt-4">
        单元格数值取自社区数据集的实测穿透矩阵（非官方），为命中护甲覆盖部位时的肉体伤害保留比例；
        显示「—」表示该弹种在该护甲等级暂无实测数据（不等同于打不穿）。
        攻击四肢/面部等无防护部位始终为全额伤害。仅供参考，以游戏内实际表现为准。
      </p>
    </div>
  );
}
