/**
 * @component Footer
 * @description 全站页脚：数据版本与更新时间、收录统计、关于入口、非官方免责声明
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-23
 */
import Link from 'next/link';

/** Footer 组件入参 */
interface FooterProps {
  /** 数据元信息（季节版本、更新时间、来源等） */
  meta: Record<string, string>;
  /** 收录数量统计 */
  counts: { ammo: number; weapons: number };
}

export default function Footer({ meta, counts }: FooterProps) {
  const updated = meta.generatedAt ? new Date(meta.generatedAt).toLocaleDateString('zh-CN') : '—';
  return (
    <footer className="border-t border-edge mt-10">
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-muted space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="num">
            数据版本 {meta.season ?? '—'} · 更新于 {updated}
          </span>
          <span className="num">
            收录弹药 {counts.ammo} · 武器 {counts.weapons}
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
