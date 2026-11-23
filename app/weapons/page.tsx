import { getAllWeapons } from '@/lib/db';
import WeaponBrowser from '@/components/commons/WeaponBrowser';

export const metadata = { title: '武器图鉴' };

export default function WeaponsPage() {
  const weapons = getAllWeapons().map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    caliber: w.caliber,
    image: w.image,
    panel: JSON.parse(w.panel || '{}'),
  }));
  return (
    <div>
      <h1 className="text-xl font-bold mb-1">武器图鉴</h1>
      <p className="text-sm text-muted mb-5">按类型浏览，点击卡片查看完整面板与适用弹药。</p>
      <WeaponBrowser weapons={weapons} />
    </div>
  );
}
