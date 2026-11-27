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
// 四档只对应三种颜色：100% 绿、75%/50% 同金色（judge() 的 warn 档不区分级差）、0% 红，
// 故「等级相同」必须用 --t5 而非 --warn，否则图例颜色与单元格对不上
// bar 为卡片左侧色条颜色，取主题变量而非 Tailwind 类名，保证浅色主题同步降饱和
const PEN_RULES: { label: string; rate: string; icon: ReactNode; tone: string; bar: string }[] = [
  { label: '高 2 级以上', rate: '100%', icon: <IconCheck className="h-3.5 w-3.5" />, tone: 'text-t2', bar: 'var(--t2)' },
  { label: '高 1 级', rate: '75%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-t5', bar: 'var(--t5)' },
  { label: '等级相同', rate: '50%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-t5', bar: 'var(--t5)' },
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
        {/* 名称保持常规字重，层级交给下方 13px 口径行与 11px 徽章的对比来承担 */}
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
            title="穿透衰减偏离常规四档：箭矢 / 龙息 / 双头弹 / 独头弹 / 45-70 等特殊弹种，或 7 级弹无视护甲（对任意甲级 100%）；以单元格实测值为准"
          >
            特殊
          </span>
        )}
      </div>
      {/* 口径（.338 Lap Mag 这类）是区分同名弹（AP / m61 / SNB）的唯一依据，
          提到 13px 半粗 + 接近正文色；品阶仍留 11px muted 作第三层，不再和口径同权 */}
      <p className="num mt-1 ml-0.5 flex flex-wrap items-baseline gap-x-1.5 leading-tight">
        <span className="text-[13px] font-medium text-main/90">{ammo.caliber}</span>
        <span className="text-[11px] text-muted">· {ammo.rarity ?? '—'}</span>
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

        {/* 术语说明：图标统一装进 18px 方形容器，保证三条文案左缘严格对齐、换行不参差
            用 flex-wrap 按内容宽度排布而非 grid 等分列，避免宽屏下三列被拉满导致文字间隔过大 */}
        <div className="flex flex-wrap gap-x-8 gap-y-2.5">
          <div className="flex gap-2.5">
            <span
              className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-accent/25 bg-accent/10 text-accent"
              aria-hidden="true"
            >
              <IconAmmo className="h-3 w-3" />
            </span>
            <span>
              <b className="text-main font-semibold">穿N</b>：穿透等级 0–7，即「N 级弹」
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
              <b className="text-main font-semibold">品阶</b>：白→绿→蓝→紫→金，与游戏内同色
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
              <b className="text-danger font-semibold">红标</b>：穿6/穿7 专属弹，多见于大威力步枪 / 机枪 / 狙击枪
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
            打不穿时单发 0 肉伤，只磨甲耐久；甲碎后伤害恢复全额。表格只列 1–6 级甲。
            <br />
            <b className="font-medium text-warn">特殊</b>
            行以单元格实测为准：非标准衰减弹（箭矢 / 龙息 / 双头弹 / 独头弹 / 45-70 等），以及 7 级弹（无视护甲，任意甲级 100%）。
          </p>
        </div>

        {/* 结论：强调底色条带包裹，竖条用 self-stretch 随文本高度伸缩，换行时不会被截断 */}
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-accent/20 bg-accent/[0.07] px-3 py-2.5">
          <span className="w-[3px] shrink-0 self-stretch rounded-full bg-accent" aria-hidden="true" />
          <p className="text-main">
            <b className="mr-1.5 font-semibold text-accent">结论</b>
            弹级 ≥ 甲级才打得动：同级 50%、高 1 级 75%、高 2 级 100%；低于甲级没有肉伤，只能磨甲等它碎。
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
              {/* 表头下边框 + 12px 字号：6 列表头横向空间紧，压缩字号后列与列之间不挤 */}
              <th className="sticky left-0 bg-panel z-10 min-w-[220px] border-b border-edge px-3 py-2.5 text-left text-[12px] tracking-wider text-muted">
                <span className="text-accent font-semibold">你的子弹</span>（按穿透等级排序）
              </th>
              {ARMOR_LEVELS.map((lv) => (
                // text-center 必须显式加：th 默认继承左对齐，会让表头文字与居中的单元格数值错位
                <th key={lv} className="border-b border-edge px-2 py-2.5 text-center">
                  <span className="num text-accent inline-flex items-center gap-1 text-[12px] font-medium whitespace-nowrap">
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
                className="group mb-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-edge/70 bg-panel/40 p-2.5 transition-colors last:mb-0 hover:border-accent/50 hover:bg-panel-hi/60 md:mb-0 md:table-row md:gap-0 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:bg-panel-hi"
              >
                {/* 桌面端首列是 sticky 不透明底（遮住横向滚动内容），hover 只能改自身底色：
                    行 hover 与首列 hover 都用 panel-hi，整行高亮才不会在首列断开 */}
                <td
                  className="col-span-3 transition-colors md:col-span-1 md:table-cell md:sticky md:left-0 md:z-10 md:min-w-[220px] md:bg-bg md:px-3 md:py-3 md:group-hover:bg-panel-hi"
                  style={{ boxShadow: `inset 3px 0 0 ${a.color}` }}
                >
                  <AmmoLabel ammo={a} color={a.color} special={a.special} />
                </td>
                {ARMOR_LEVELS.map((lv) => {
                  const j = judge(a.matrix[String(lv)]);
                  return (
                    <td
                      key={lv}
                      className="num rounded border border-edge/60 px-1.5 py-2 text-center md:rounded-none md:border-0 md:px-2 md:py-3 md:align-middle"
                      style={{ background: j.bg, color: j.fg }}
                      title={cellTitle(j)}
                      aria-label={`${lv} 级甲：${cellTitle(j)}`}
                    >
                      {/* 窄屏没有表头，护甲等级标签落在单元格内；桌面由 thead 承载，故隐藏 */}
                      <p className="text-[10px] leading-none text-muted opacity-80 md:hidden">{lv}级甲</p>
                      {/* 保留比例是这张表的核心信息，故数值 13px 加粗为主、✓/!/✕ 字形 11px 弱化只作快速扫读 */}
                      <p className="mt-1.5 flex items-center justify-center gap-1 leading-none md:mt-0">
                        <span aria-hidden="true" className="text-[11px] opacity-70">
                          {j.glyph}
                        </span>
                        <span className="text-[13px] font-semibold">
                          {j.rate === null ? '—' : `${j.rate}%`}
                        </span>
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
