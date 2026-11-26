import { getAmmoByWeaponMap, getAllWeapons } from '@/lib/db';
import { toWeaponDetail } from '@/lib/view';
import WeaponBrowser from '@/components/commons/WeaponBrowser';
import PageHero from '@/components/commons/PageHero';
import { IconBook } from '@/components/commons/icons';
import type { WeaponDetail } from '@/types/weapon';

export const metadata = { title: '武器图鉴' };

export default function WeaponsPage() {
  // 构建期一次性取全量关联（单条 JOIN），再在内存按武器分组，避免逐把武器查询的 N+1
  const ammoByWeapon = getAmmoByWeaponMap();
  // 面板 / 槽位 JSON 解析与弹药裁剪统一走 toWeaponDetail
  const weapons: WeaponDetail[] = getAllWeapons().map((w) =>
    toWeaponDetail(w, ammoByWeapon[w.id] ?? [])
  );

  return (
    <div>
      <PageHero
        title="武器图鉴"
        icon={<IconBook className="w-6 h-6" />}
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
