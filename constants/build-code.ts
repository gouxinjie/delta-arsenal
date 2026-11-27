/**
 * 改枪码模块展示常量（场景 / 价格区间 / 排序 / 方案标签）
 * @description 场景文案与筛选选项只在这里定义一份，服务端页面与客户端浏览器组件共用，
 *              避免两处各写一套中文文案造成筛选值与展示不一致。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

import type { BuildScenario } from '@/types/build-code';

/** 场景 Tab 配置（顺序即页面展示顺序，默认第一个） */
export const BUILD_SCENARIOS: readonly { value: BuildScenario; label: string }[] = [
  { value: 'firestorm', label: '烽火地带' },
  { value: 'allout', label: '全面战场' },
];

/**
 * 场景值 -> 中文文案
 * @param scenario - 场景标识
 * @returns 中文文案；未登记的场景回退为「未知场景」
 */
export function buildScenarioLabel(scenario: string): string {
  return BUILD_SCENARIOS.find((item) => item.value === scenario)?.label ?? '未知场景';
}

/** 价格区间筛选项（单位：哈夫币；max 为开区间上界） */
export const BUILD_PRICE_RANGES: readonly { value: string; label: string; min: number; max: number }[] = [
  { value: 'all', label: '全部价格', min: 0, max: Number.POSITIVE_INFINITY },
  { value: 'lt100k', label: '10 万以下', min: 0, max: 100_000 },
  { value: '100k-200k', label: '10–20 万', min: 100_000, max: 200_000 },
  { value: '200k-300k', label: '20–30 万', min: 200_000, max: 300_000 },
  { value: 'gt300k', label: '30 万以上', min: 300_000, max: Number.POSITIVE_INFINITY },
];

/** 排序方式（默认按价格从高到低，符合「越贵越满改」的阅读习惯） */
export type BuildSortKey = 'price-desc' | 'price-asc' | 'newest';

/** 排序下拉项 */
export const BUILD_SORT_OPTIONS: readonly { value: BuildSortKey; label: string }[] = [
  { value: 'price-desc', label: '价格从高到低' },
  { value: 'price-asc', label: '价格从低到高' },
  { value: 'newest', label: '最新发布' },
];

/** 预置标签及其胶囊配色 */
export interface BuildTagOption {
  /** 标签文案（即数据文件 tags 里的取值） */
  label: string;
  /** 胶囊配色类名：边框 / 底 / 字；用语义色令牌 + 透明度，暗浅主题自动适配 */
  className: string;
}

/**
 * 方案标签预置词（卡片上的玩法关键词）
 * @description 预置词用于录入器快捷点选，数据文件里的自定义标签同样合法（走中性配色）；
 *              只在这里维护一份，避免各处自造近义词（如「稳定」/「稳」并存）。
 *              配色按语义分配，同一标签在卡片与录入器上颜色完全一致
 */
export const BUILD_TAG_OPTIONS: readonly BuildTagOption[] = [
  { label: '高性价比', className: 'border-t2/35 bg-t2/12 text-t2' },
  { label: '新手推荐', className: 'border-tone-cyan/35 bg-tone-cyan/12 text-tone-cyan' },
  { label: '以小博大', className: 'border-t4/35 bg-t4/12 text-t4' },
  { label: '腰射专用', className: 'border-tone-pink/35 bg-tone-pink/12 text-tone-pink' },
  { label: '近战适用', className: 'border-danger/35 bg-danger/12 text-danger' },
  { label: '满改神器', className: 'border-t5/35 bg-t5/12 text-t5' },
  { label: '后坐力稳', className: 'border-t3/35 bg-t3/12 text-t3' },
  { label: '超高射速', className: 'border-warn/35 bg-warn/12 text-warn' },
  { label: '中近距离', className: 'border-t1/35 bg-t1/10 text-t1' },
  { label: '火力压制', className: 'border-accent/35 bg-accent/12 text-accent' },
];

/** 标签胶囊的基础类名（边框宽度 / 圆角 / 字号），配色由 getBuildTagClass 追加 */
export const BUILD_TAG_BASE_CLASS =
  'rounded-[4px] border px-2.5 py-1 text-[12px] font-medium leading-none';

/** 未登记的自定义标签配色：中性灰蓝，避免与预置的语义色混淆 */
export const BUILD_TAG_FALLBACK_CLASS = 'border-edge bg-panel-hi text-muted';

/**
 * 取标签配色类名
 * @param label - 标签文案
 * @returns 预置标签的语义色类名；自定义标签返回中性配色
 */
export function getBuildTagClass(label: string): string {
  return (
    BUILD_TAG_OPTIONS.find((option) => option.label === label)?.className ?? BUILD_TAG_FALLBACK_CLASS
  );
}

/** 单条方案最多展示的标签数量（超出会挤压卡片宽度，也削弱重点） */
export const BUILD_TAG_LIMIT = 4;

/** 单个标签的最大字符数（中文按字计，超出部分截断） */
export const BUILD_TAG_MAX_LENGTH = 8;

/**
 * 归一方案标签：去首尾空白、去重、丢弃空值、截断超长、限制数量
 * @description 数据文件是人工维护的，可能手写空格 / 重复 / 超长标签，
 *              统一在这里清洗，卡片与录入器共用同一套规则
 * @param tags - 原始标签数组（数据文件可能缺失或非数组）
 * @returns 清洗后的标签数组；输入非法时返回空数组
 */
export function normalizeBuildTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const result: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim().slice(0, BUILD_TAG_MAX_LENGTH);
    if (!value || result.includes(value)) continue;
    result.push(value);
    if (result.length >= BUILD_TAG_LIMIT) break;
  }
  return result;
}
