import type { ReactNode } from 'react';
import { getAllAmmo } from '@/lib/db';
import PageHero from '@/components/commons/PageHero';
import { IconAmmo, IconChart, IconCheck, IconCross, IconShield, IconWarn } from '@/components/commons/icons';
import { RARITY_LABEL, tierColor } from '@/constants/game';

export const metadata = { title: '穿甲对照矩阵' };

const ARMOR_LEVELS = [1, 2, 3, 4, 5, 6];

interface MatrixCell {
  body_health_rate?: number;
  helmet_health_rate?: number;
  penetrates?: boolean;
}

/** 判定档位：none 表示该护甲等级源数据缺失（与「打不穿」区分开） */
type Tone = 'ok' | 'warn' | 'bad' | 'none';

/**
 * 判定单元格样式与字形标记
 * 单元格用字形（✓ / ! / ✕）而不是内联 SVG：矩阵页有 100+ 行 × 6 列，逐格 SVG 会把静态 HTML 撑到 MB 级；
 * 也不用 Emoji：跨平台字形差异大，读屏会把「✅」念成符号名而丢失判定语义
 */
const CELL_STYLES: Record<Tone, { glyph: string; fg: string; bg: string; desc: string }> = {
  ok: { glyph: '✓', fg: 'var(--t2)', bg: 'var(--ok-bg)', desc: '全额穿透' },
  warn: { glyph: '!', fg: 'var(--t5)', bg: 'var(--warn-bg)', desc: '可穿但衰减' },
  bad: { glyph: '✕', fg: 'var(--danger)', bg: 'var(--bad-bg)', desc: '打不穿' },
  none: { glyph: '—', fg: 'var(--muted)', bg: 'transparent', desc: '暂无实测数据' },
};

/**
 * 按肉体伤害保留比例归入三档：绿=全额穿透，黄=可穿但有衰减，红=无肉体伤害
 * 与图例四档（100/75/50/0）对应，仅 100% 显示绿色，避免 90% 等特殊值被误判为高效穿透
 * @param rate 保留比例（0~1）
 * @returns 判定档位
 */
function toneOf(rate: number): Exclude<Tone, 'none'> {
  if (rate <= 0) return 'bad';
  return rate >= 1 ? 'ok' : 'warn';
}

/**
 * 判定单元格展示档位与数值
 * @param cell 矩阵单元格，undefined 表示该护甲等级无实测数据
 * @returns 档位样式、百分比数值（无数据为 null）与判定说明
 */
function judge(cell: MatrixCell | undefined) {
  // 缺数据必须与「打不穿」区分：源数据偶有护甲等级未覆盖，渲染成 0% 会变成错误结论
  if (!cell || (cell.body_health_rate === undefined && cell.penetrates === undefined)) {
    return { ...CELL_STYLES.none, rate: null };
  }
  // penetrates=false 时源数据仍可能带 body_health_rate（如 45-70 的 RN 对 1 级甲为 1），
  // 必须强制归零，否则会渲染出自相矛盾的「打不穿 100%」
  const rate = cell.penetrates === false ? 0 : Math.round((cell.body_health_rate ?? 0) * 100);
  return { ...CELL_STYLES[toneOf(rate / 100)], rate };
}

/**
 * 单元格提示文案：把「无数据 / 打不穿 / 保留比例」三种情况分开描述（同时用于 title 与 aria-label）
 * @param judged - judge() 的返回值
 * @returns 提示文本
 */
function cellTitle(judged: { rate: number | null; desc: string }): string {
  if (judged.rate === null) return judged.desc;
  return judged.rate > 0 ? `身体伤害保留 ${judged.rate}%` : '无法穿透，仅消耗护甲耐久';
}

/**
 * 判断弹药是否偏离「常规四档」穿透规则
 * 源数据中箭矢、龙息、特效弹等存在非标准衰减（如打高甲仍保留 10%~14%），
 * 需单独标记，避免用户把图例当作普适结论
 * @param matrix 穿透矩阵
 * @param penLevel 弹穿等级
 * @returns 是否特殊机制
 */
function isSpecialAmmo(matrix: Record<string, MatrixCell>, penLevel: number): boolean {
  return ARMOR_LEVELS.some((lv) => {
    const cell = matrix[String(lv)];
    if (!cell) return false;
    const gap = penLevel - lv;
    const expected = gap >= 2 ? 1 : gap === 1 ? 0.75 : gap === 0 ? 0.5 : 0;
    // 用 judge 的展示口径（penetrates=false 归零、百分比取整、缺数据不计入）与四档数值比对：
    // 口径统一后，RN 这类「源数据声明未穿透但残留伤害」的弹不会仅因原始字段矛盾被误标
    const actual = judge(cell).rate;
    return actual !== null && actual !== expected * 100;
  });
}

// 图例中的穿透判定四档（与 judge() 阈值保持一致，改规则时两处同步）
const PEN_RULES: { label: string; rate: string; icon: ReactNode; tone: string }[] = [
  { label: '高 2 级以上', rate: '100%', icon: <IconCheck className="h-3.5 w-3.5" />, tone: 'text-t2' },
  { label: '高 1 级', rate: '75%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-t5' },
  { label: '等级相同', rate: '50%', icon: <IconWarn className="h-3.5 w-3.5" />, tone: 'text-warn' },
  { label: '低于甲级', rate: '0%', icon: <IconCross className="h-3.5 w-3.5" />, tone: 'text-danger' },
];

/** 弹药标识入参（只取展示所需字段，便于表格与卡片复用） */
interface AmmoLabelProps {
  /** 弹药基础信息 */
  ammo: { name: string; caliber: string; rarity: string; tier: number | null; pen_level: number };
  /** 品阶色（专属弹为危险色） */
  color: string;
  /** 是否专属弹（穿 6/7 或红品阶） */
  exclusive: boolean;
  /** 判定是否偏离常规四档 */
  special: boolean;
}

/**
 * 弹药标识块：名称 + 穿透 / 品阶 / 特殊徽章 + 口径行
 * 桌面表格首列与移动端卡片共用，保证两套布局信息一致
 * @param props - 弹药与配色信息
 */
function AmmoLabel({ ammo, color, exclusive, special }: AmmoLabelProps) {
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
  // 排序（第一版）：全局按穿透等级从高到低，同等级按口径字母序
  const sorted = getAllAmmo()
    .map((a) => ({ ...a, m: JSON.parse(a.matrix || '{}') as Record<string, MatrixCell> }))
    .filter((a) => Object.keys(a.m).length > 0)
    .sort((x, y) => y.pen_level - x.pen_level || x.caliber.localeCompare(y.caliber));

  // 预先算好品阶色 / 专属标记 / 特殊机制，避免表格与移动端卡片各算一遍
  const rows = sorted.map((a) => {
    const isExclusive = a.pen_level >= 6 || a.rarity === '红';
    return {
      ...a,
      isExclusive,
      tierVar: isExclusive ? 'var(--danger)' : tierColor(a.tier),
      special: isSpecialAmmo(a.m, a.pen_level),
    };
  });

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
                  style={{ boxShadow: `inset 3px 0 0 ${a.tierVar}` }}
                >
                  <AmmoLabel ammo={a} color={a.tierVar} exclusive={a.isExclusive} special={a.special} />
                </td>
                {ARMOR_LEVELS.map((lv) => {
                  const j = judge(a.m[String(lv)]);
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
