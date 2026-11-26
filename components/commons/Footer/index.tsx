/**
 * @component Footer
 * @description 全站页脚：数据版本与更新时间、收录统计、关于入口、非官方免责声明
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-26
 */
import Link from 'next/link';
import { formatCount } from '@/lib/format';
import type { SiteMeta } from '@/types/site';

/** Footer 组件入参 */
interface FooterProps {
  /** 站点元信息（已兜底；数据库缺失时计数为 null，渲染为「—」） */
  siteMeta: SiteMeta;
}

export default function Footer({ siteMeta }: FooterProps) {
  const { season, datasetVersion, updatedAt, counts } = siteMeta;
  return (
    <footer className="border-t border-edge mt-10">
      <div className="max-w-[1200px] mx-auto px-4 py-5 sm:py-6 text-xs text-muted space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="num">
            数据版本 {season} · {datasetVersion || '—'} · 更新于 {updatedAt}
          </span>
          <span className="num">
            收录弹药 {formatCount(counts.ammo)} · 武器 {formatCount(counts.weapons)}
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
