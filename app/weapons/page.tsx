import { getAllWeapons } from '@/lib/db';
import WeaponBrowser from '@/components/commons/WeaponBrowser';
import PageHero from '@/components/commons/PageHero';
import { IconBook } from '@/components/commons/icons';

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
      <PageHero
        title="武器图鉴"
        icon={<IconBook className="w-6 h-6" />}
        decoImage="/img/weapons/18020000001.png"
        subtitle={
          <>
            共收录 <b className="text-accent num">{weapons.length}</b>{' '}
            款武器，点击卡片查看详细配置，了解武器性能与详细搭配。
          </>
        }
      />
      <WeaponBrowser weapons={weapons} />
    </div>
  );
}
