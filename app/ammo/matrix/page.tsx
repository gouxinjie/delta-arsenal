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
// bar 为卡片左侧色条颜色，取主题变量而非 Tailwind 类名，保证浅色主题同步降饱和
const PEN_RULES: { label: string; rate: string; icon: ReactNode; tone: string; bar: string }[] = [
  { label: '高 2 级以上', rate: '100%', icon: <IconCheck className="h-3.5 w-3.5" />, tone: 'text-t2', bar: 'var(--t2)' },
  { label: '高 1 级', rate: '75%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-t5', bar: 'var(--t5)' },
  { label: '等级相同', rate: '50%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-warn', bar: 'var(--warn)' },
  { label: '低于甲级', rate: '0%', icon: <IconCross className="h-3.5 w-3.5" />, tone: 'text-danger', bar: 'var(--danger)' },
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

      {/* 阅读图例：术语 → 判定机制 → 结论 三段式，左侧强调竖条作为区块锚点，字号 13px 提升可读性 */}
      <section
        aria-label="阅读图例"
        className="relative mb-4 overflow-hidden rounded-lg border border-accent/25 bg-accent/[0.04] px-4 py-4 text-[13px] leading-[1.7] text-muted"
      >
        {/* 左侧竖条：上浓下淡，暗示「本区块是阅读指引」而非数据表 */}
        <span
          className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent/70 to-accent/15"
          aria-hidden="true"
        />

        {/* 术语说明：图标统一装进 18px 方形容器，保证三条文案左缘严格对齐、换行不参差 */}
        <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex gap-2.5">
            <span
              className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-accent/25 bg-accent/10 text-accent"
              aria-hidden="true"
            >
              <IconAmmo className="h-3 w-3" />
            </span>
            <span>
              <b className="text-main font-semibold">穿N</b>：穿透等级（0–7），俗称「N 级弹」
            </span>
          </div>
          <div className="flex gap-2.5">
            <span
              className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-edge bg-bg/60"
              aria-hidden="true"
            >
              <span className="h-2 w-2 rounded-sm bg-t4" />
            </span>
            <span>
              <b className="text-main font-semibold">品阶徽章</b>：白→绿→蓝→紫→金弹，与游戏内颜色一致
            </span>
          </div>
          <div className="flex gap-2.5">
            <span
              className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-danger/30 bg-danger/10"
              aria-hidden="true"
            >
              <span className="h-2 w-2 rounded-sm bg-danger" />
            </span>
            <span>
              <b className="text-danger font-semibold">穿6/穿7</b>：狙击枪/重机枪专属弹（红标），不占常规品阶
            </span>
          </div>
        </div>

        {/* 判定机制：四档各自成卡片，左侧色条与表格单元格同色系，便于逐档对照扫读 */}
        <div className="mt-4 border-t border-edge/70 pt-4">
          <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <b className="inline-flex items-center gap-1.5 font-semibold text-main">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              常规穿透机制
            </b>
            <span className="text-[12px] text-muted/70">按弹级与甲级级差判定，适用于多数常规弹</span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {PEN_RULES.map((rule) => (
              <div
                key={rule.label}
                className="relative overflow-hidden rounded-md border border-edge/70 bg-bg/45 py-2 pl-3 pr-2.5 transition-colors hover:border-edge"
              >
                <span
                  className="absolute inset-y-0 left-0 w-[2.5px]"
                  style={{ background: rule.bar }}
                  aria-hidden="true"
                />
                <span className="flex items-center justify-between gap-2">
                  <span className="num text-[12px] text-muted">{rule.label}</span>
                  <span className={`num inline-flex items-center gap-1 text-[13px] font-semibold ${rule.tone}`}>
                    {rule.icon}
                    {rule.rate}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-[1.65] text-muted/70">
            数值为肉体伤害保留比例；打不穿时仅消耗护甲耐久。箭矢、龙息、双头弹及特效弹等特殊弹种不适用该表，
            标记「特殊」的行以单元格实测值为准。
          </p>
        </div>

        {/* 结论：强调底色条带包裹，竖条用 self-stretch 随文本高度伸缩，换行时不会被截断 */}
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-accent/20 bg-accent/[0.07] px-3 py-2.5">
          <span className="w-[3px] shrink-0 self-stretch rounded-full bg-accent" aria-hidden="true" />
          <p className="text-main">
            <b className="mr-1.5 font-semibold text-accent">结论</b>
            常规弹想打得动，弹级必须 ≥ 甲级；同级开始掉血，但伤害只有一半。
          </p>
        </div>
      </section>

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
                className="group mb-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-edge/70 bg-panel/40 p-2.5 transition-colors last:mb-0 hover:border-accent/50 hover:bg-panel-hi/60 md:mb-0 md:table-row md:gap-0 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:bg-accent/[0.06]"
              >
                {/* 桌面端首列是 sticky 不透明底（遮住横向滚动内容），hover 只能改自身底色：bg → panel-hi 有明显亮度差 */}
                <td
                  className="col-span-3 transition-colors md:col-span-1 md:table-cell md:sticky md:left-0 md:z-10 md:bg-bg md:px-3 md:py-2.5 md:group-hover:bg-panel-hi"
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
