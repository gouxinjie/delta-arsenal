import { Suspense } from 'react';
import { getAmmoWithWeapons } from '@/lib/db';
import AmmoBrowser from '@/components/commons/AmmoBrowser';

export const metadata = { title: '弹药库' };

export default function AmmoPage() {
  const ammo = getAmmoWithWeapons().map((a) => ({
    ...a,
    matrix: JSON.parse(a.matrix || '{}'),
  }));
  return (
    <div>
      <h1 className="text-xl font-bold mb-1">弹药库</h1>
      <p className="text-sm text-muted mb-5">按口径分组，点击卡片查看详情。穿透等级越高，对高等级护甲的压制越强。</p>
      <Suspense fallback={<p className="text-muted text-sm">加载中…</p>}>
        <AmmoBrowser ammo={ammo} />
      </Suspense>
    </div>
  );
}
