import { Suspense } from 'react';
import { getAmmoWeaponMap, getAmmoWithWeapons } from '@/lib/db';
import { parseAmmoEffects } from '@/lib/ammo-effects';
import AmmoBrowser from '@/components/commons/AmmoBrowser';
import PageHero from '@/components/commons/PageHero';
import { IconAmmo } from '@/components/commons/icons';

export const metadata = { title: '弹药库' };

export default function AmmoPage() {
  // 弹药 -> 适用武器（含图片）映射，一次性查完避免逐条查询
  const weaponMap = getAmmoWeaponMap();
  // effects 在库里是 JSON 字符串，构建期解析成对象后交给客户端组件；
  // matrix 仅供矩阵页使用，抽屉的对甲结论由穿透等级推导，无需下发到客户端
  const ammo = getAmmoWithWeapons().map((a) => ({
    id: a.id,
    name: a.name,
    caliber: a.caliber,
    tier: a.tier,
    rarity: a.rarity,
    pen_level: a.pen_level,
    dmg_ratio: a.dmg_ratio,
    armor_ratio: a.armor_ratio,
    effects: parseAmmoEffects(a.effects),
    season_limited: a.season_limited,
    note: a.note ?? '',
    weaponNames: a.weaponNames,
    weapons: weaponMap[a.id] ?? [],
  }));
  return (
    <div>
      <PageHero
        title="弹药库"
        icon={<IconAmmo className="w-6 h-6" />}
        subtitle="按口径分组浏览，点击行查看详情。穿透等级越高，对高等级护甲的压制越强。"
      />
      <Suspense fallback={<p className="text-muted text-sm">加载中…</p>}>
        <AmmoBrowser ammo={ammo} />
      </Suspense>
    </div>
  );
}
