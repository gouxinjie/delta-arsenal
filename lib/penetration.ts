
/**
 * 穿甲判定规则（纯函数，构建期与客户端通用）
 * @description 判定口径以 PRD 4.1 为准：绿=全额穿透，黄=可穿但有衰减，红=无肉体伤害。
 *              规则从矩阵页面抽出，便于复用与单测（此前写在页面文件里，无法复用）。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import type { MatrixCell, PenetrationMatrix } from '@/types/ammo';

/** 矩阵列：敌方护甲等级 */
export const ARMOR_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** 护甲等级 */
export type ArmorLevel = (typeof ARMOR_LEVELS)[number];

/** 判定档位：none 表示该护甲等级源数据缺失（与「打不穿」区分开） */
export type Tone = 'ok' | 'warn' | 'bad' | 'none';

/** 判定单元格的样式与字形 */
export interface CellStyle {
  /** 字形标记 */
  glyph: string;
  /** 前景色（主题变量） */
  fg: string;
  /** 背景色（主题变量） */
  bg: string;
  /** 判定说明 */
  desc: string;
}

/** 判定结果：样式 + 保留比例（无数据为 null） */
export interface JudgedCell extends CellStyle {
  /** 肉体伤害保留百分比（0~100），源数据缺失为 null */
  rate: number | null;
}

/**
 * 判定单元格样式与字形标记
 * 单元格用字形（✓ / ! / ✕）而不是内联 SVG：矩阵页有 100+ 行 × 6 列，逐格 SVG 会把静态 HTML 撑到 MB 级；
 * 也不用 Emoji：跨平台字形差异大，读屏会把「✅」念成符号名而丢失判定语义
 */
export const CELL_STYLES: Record<Tone, CellStyle> = {
  ok: { glyph: '✓', fg: 'var(--t2)', bg: 'var(--ok-bg)', desc: '全额穿透' },
  warn: { glyph: '!', fg: 'var(--t5)', bg: 'var(--warn-bg)', desc: '可穿但衰减' },
  bad: { glyph: '✕', fg: 'var(--danger)', bg: 'var(--bad-bg)', desc: '打不穿' },
  none: { glyph: '—', fg: 'var(--muted)', bg: 'transparent', desc: '暂无实测数据' },
};

/**
 * 按肉体伤害保留比例归入三档
 * 与图例四档（100/75/50/0）对应，仅 100% 显示绿色，避免 90% 等特殊值被误判为高效穿透
 * @param rate - 保留比例（0~1）
 * @returns 判定档位
 */
export function toneOf(rate: number): Exclude<Tone, 'none'> {
  if (rate <= 0) return 'bad';
  return rate >= 1 ? 'ok' : 'warn';
}

/**
 * 判定单元格展示档位与数值
 * @param cell - 矩阵单元格，undefined 表示该护甲等级无实测数据
 * @returns 档位样式、百分比数值（无数据为 null）与判定说明
 */
export function judge(cell: MatrixCell | undefined): JudgedCell {
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
export function cellTitle(judged: Pick<JudgedCell, 'rate' | 'desc'>): string {
  if (judged.rate === null) return judged.desc;
  return judged.rate > 0 ? `身体伤害保留 ${judged.rate}%` : '无法穿透，仅消耗护甲耐久';
}

/**
 * 判断弹药是否偏离「常规四档」穿透规则
 * 两类弹药会被标记，需与矩阵页图例「特殊」说明保持同一口径：
 * 1. 特殊弹种的非标准衰减（箭矢、龙息、双头弹、独头弹 HT/HT+、45-70 等，打高甲仍保留 10%~14%）；
 * 2. 7 级弹（.338 Lap Mag AP、.50 BMG M903 SLAP）无视护甲，对 6 级甲仍为 100%，而四档要求 75%。
 * 需单独标记，避免用户把图例当作普适结论
 * @param matrix - 穿透矩阵
 * @param penLevel - 弹穿等级
 * @returns 是否特殊机制
 */
export function isSpecialAmmo(matrix: PenetrationMatrix, penLevel: number): boolean {
  return ARMOR_LEVELS.some((level) => {
    const cell = matrix[String(level)];
    if (!cell) return false;
    const gap = penLevel - level;
    const expected = gap >= 2 ? 1 : gap === 1 ? 0.75 : gap === 0 ? 0.5 : 0;
    // 用 judge 的展示口径（penetrates=false 归零、百分比取整、缺数据不计入）与四档数值比对：
    // 口径统一后，RN 这类「源数据声明未穿透但残留伤害」的弹不会仅因原始字段矛盾被误标
    const actual = judge(cell).rate;
    return actual !== null && actual !== expected * 100;
  });
}
