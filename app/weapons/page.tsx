import { getAllWeapons, getAmmoOfWeapon } from '@/lib/db';
import WeaponBrowser from '@/components/commons/WeaponBrowser';
import PageHero from '@/components/commons/PageHero';
import { IconBook } from '@/components/commons/icons';
import type { WeaponDetail, WeaponPanel } from '@/types/weapon';

export const metadata = { title: '武器图鉴' };

export default function WeaponsPage() {
  // 构建期一次性组装卡片 + 抽屉所需的完整数据，运行时零额外请求
  const weapons: WeaponDetail[] = getAllWeapons().map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    caliber: w.caliber,
    image: w.image,
    panel: JSON.parse(w.panel || '{}') as WeaponPanel,
    slots: JSON.parse(w.slots || '[]') as string[],
    ammo: getAmmoOfWeapon(w.id).map((a) => ({
      id: a.id,
      name: a.name,
      caliber: a.caliber,
      tier: a.tier,
      pen_level: a.pen_level,
      dmg_ratio: a.dmg_ratio,
      season_limited: a.season_limited,
    })),
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
            款武器，点击卡片在侧边查看详细配置，了解武器性能与详细搭配。
          </>
        }
      />
      <WeaponBrowser weapons={weapons} />
    </div>
  );
}
