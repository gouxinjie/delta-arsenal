import { Suspense } from 'react';
import { getAmmoWeaponMap, getAmmoWithWeapons } from '@/lib/db';
import { toAmmoView } from '@/lib/view';
import AmmoBrowser from '@/components/commons/AmmoBrowser';
import PageHero from '@/components/commons/PageHero';
import { IconAmmo } from '@/components/commons/icons';

export const metadata = { title: '弹药库' };

export default function AmmoPage() {
  // 弹药 -> 适用武器（含图片）映射，一次性查完避免逐条查询
  const weaponMap = getAmmoWeaponMap();
  // effects / matrix 均为 JSON 字符串：统一由 toAmmoView 解析并裁剪，
  // 矩阵仅供矩阵页使用，不下发到客户端
  const ammo = getAmmoWithWeapons().map((a) => toAmmoView(a, weaponMap[a.id] ?? []));

  return (
    <div>
      <PageHero
        title="弹药库"
        icon={<IconAmmo className="w-6 h-6" />}
        subtitle="按口径分组浏览，点击条目查看详情。穿透等级越高，对高等级护甲的压制越强。"
      />
      <Suspense fallback={<p className="text-muted text-sm">加载中…</p>}>
        <AmmoBrowser ammo={ammo} />
      </Suspense>
    </div>
  );
}
