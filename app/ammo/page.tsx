import { Suspense } from 'react';
import { getAmmoWithWeapons } from '@/lib/db';
import AmmoBrowser from '@/components/commons/AmmoBrowser';
import PageHero from '@/components/commons/PageHero';
import { IconAmmo } from '@/components/commons/icons';

export const metadata = { title: '弹药库' };

export default function AmmoPage() {
  const ammo = getAmmoWithWeapons().map((a) => ({
    ...a,
    matrix: JSON.parse(a.matrix || '{}'),
  }));
  return (
    <div>
      <PageHero
        title="弹药库"
        icon={<IconAmmo className="w-6 h-6" />}
        decoImage="/img/weapons/18020000002.png"
        subtitle="按口径分组浏览，点击行查看详情。穿透等级越高，对高等级护甲的压制越强。"
      />
      <Suspense fallback={<p className="text-muted text-sm">加载中…</p>}>
        <AmmoBrowser ammo={ammo} />
      </Suspense>
    </div>
  );
}
