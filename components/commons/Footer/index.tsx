/**
 * @component Footer
 * @description 全站页脚：数据版本与更新时间、收录统计、关于入口、非官方免责声明
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-26
 */
import Link from 'next/link';
import type { SiteCounts } from '@/types/site';

/** Footer 组件入参 */
interface FooterProps {
  /** 数据元信息（季节版本、更新时间、来源等） */
  meta: Record<string, string>;
  /** 收录数量统计，null 表示数据库缺失（渲染为「—」） */
  counts: SiteCounts;
}

/**
 * 数字兜底展示：null 统一渲染为「—」，避免把「无数据」显示成 0
 * @param value - 计数值
 * @returns 展示文本
 */
function showCount(value: number | null): string {
  return value === null ? '—' : String(value);
}

export default function Footer({ meta, counts }: FooterProps) {
  const updated = meta.generatedAt ? new Date(meta.generatedAt).toLocaleDateString('zh-CN') : '—';
  // 数据集版本（如 20261105-weiguang.1）用于判断本站是否落后于上游，未知时不展示
  const datasetVersion = meta.datasetVersion && meta.datasetVersion !== 'unknown' ? meta.datasetVersion : '';
  return (
    <footer className="border-t border-edge mt-10">
      <div className="max-w-[1200px] mx-auto px-4 py-5 sm:py-6 text-xs text-muted space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="num">
            数据版本 {meta.season ?? '—'} · {datasetVersion || '—'} · 更新于 {updated}
          </span>
          <span className="num">
            收录弹药 {showCount(counts.ammo)} · 武器 {showCount(counts.weapons)}
          </span>
          <Link href="/about" className="hover:text-accent">
            关于与免责声明
          </Link>
        </div>
        <p>
          本站为玩家自制的非官方粉丝站点，与腾讯 / 琳琅天上无关。游戏图片及名称版权归原权利方所有。
          数据来源于社区整理，仅供参考，以游戏内实测为准。
        </p>
      </div>
    </footer>
  );
}
