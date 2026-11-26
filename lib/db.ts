import Database from 'better-sqlite3';
import path from 'node:path';
import type { AmmoRow, AmmoWeaponBrief } from '@/types/ammo';
import type { WeaponRow } from '@/types/weapon';

// 行类型集中定义在 types/，此处转出以保持既有 `@/lib/db` 引用可用
export type { AmmoRow, AmmoWeaponBrief, WeaponRow };

// 构建期/SSG 直读 SQLite（PRD 6：零运行时数据库依赖）
const DB_PATH = path.join(process.cwd(), 'data', 'delta.db');

/** 数据库单例（只读） */
let _db: Database.Database | null = null;

/** 获取只读数据库连接（懒加载单例） */
function db(): Database.Database {
  if (!_db) _db = new Database(DB_PATH, { readonly: true });
  return _db;
}


/**
 * 读取数据版本元信息
 * @returns key-value 元信息（season / generatedAt / sources / counts）
 */
export function getMeta(): Record<string, string> {
  const rows = db().prepare('SELECT key, value FROM meta').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/**
 * 读取全部弹药
 * @returns 弹药列表（按口径、穿透等级降序）
 */
export function getAllAmmo(): AmmoRow[] {
  return db()
    .prepare('SELECT * FROM ammo ORDER BY caliber, pen_level DESC, tier DESC')
    .all() as AmmoRow[];
}

/**
 * 读取全部弹药并聚合适用枪械名
 * @returns 弹药列表，附 weaponNames（顿号分隔的适用枪械名；无关联枪械时为空串）
 */
export function getAmmoWithWeapons(): (AmmoRow & { weaponNames: string })[] {
  return db()
    .prepare(
      // COALESCE 必须有：无关联枪械时 GROUP_CONCAT 返回 NULL，会让「string」类型变成谎言
      `SELECT a.*, COALESCE(GROUP_CONCAT(w.name, '、'), '') AS weaponNames
       FROM ammo a
       LEFT JOIN ammo_weapons aw ON aw.ammo_id = a.id
       LEFT JOIN weapons w ON w.id = aw.weapon_id
       GROUP BY a.id ORDER BY a.caliber, a.pen_level DESC, a.tier DESC`
    )
    .all() as (AmmoRow & { weaponNames: string })[];
}

/**
 * 读取「弹药 -> 适用武器」映射（含武器图片，供弹药详情抽屉展示）
 * @returns 以弹药 itemID 为键的武器简要信息数组（组内按名称排序）
 */
export function getAmmoWeaponMap(): Record<string, AmmoWeaponBrief[]> {
  const rows = db()
    .prepare(
      `SELECT aw.ammo_id AS ammoId, w.id AS id, w.name AS name, COALESCE(w.image, '') AS image
       FROM ammo_weapons aw
       JOIN weapons w ON w.id = aw.weapon_id
       ORDER BY w.name`
    )
    .all() as { ammoId: string; id: string; name: string; image: string }[];

  const map: Record<string, AmmoWeaponBrief[]> = {};
  for (const { ammoId, id, name, image } of rows) {
    if (!map[ammoId]) map[ammoId] = [];
    map[ammoId].push({ id, name, image });
  }
  return map;
}

/**
 * 读取全部武器
 * @returns 武器列表（按类别、名称排序）
 */
export function getAllWeapons(): WeaponRow[] {
  return db().prepare('SELECT * FROM weapons ORDER BY category, name').all() as WeaponRow[];
}

/**
 * 按 id 读取单个武器
 * @param id - 武器 objectID
 * @returns 武器行，不存在返回 null
 */
export function getWeapon(id: string): WeaponRow | null {
  return (db().prepare('SELECT * FROM weapons WHERE id = ?').get(id) as WeaponRow | undefined) ?? null;
}

/**
 * 读取某武器可用的弹药
 * @param weaponId - 武器 objectID
 * @returns 弹药列表（按穿透等级降序）
 */
export function getAmmoOfWeapon(weaponId: string): AmmoRow[] {
  return db()
    .prepare(
      `SELECT a.* FROM ammo a JOIN ammo_weapons aw ON aw.ammo_id = a.id
       WHERE aw.weapon_id = ? ORDER BY a.pen_level DESC`
    )
    .all(weaponId) as AmmoRow[];
}

/**
 * 读取「武器 -> 可用弹药」映射（构建期一次性取全量，避免逐把武器查询造成 N+1）
 * @returns 以武器 objectID 为键的弹药行数组（组内按穿透等级降序），无关联武器不出现在键中
 */
export function getAmmoByWeaponMap(): Record<string, AmmoRow[]> {
  const rows = db()
    .prepare(
      `SELECT aw.weapon_id AS weaponId, a.* FROM ammo a
       JOIN ammo_weapons aw ON aw.ammo_id = a.id
       ORDER BY a.pen_level DESC`
    )
    .all() as (AmmoRow & { weaponId: string })[];

  const map: Record<string, AmmoRow[]> = {};
  for (const { weaponId, ...row } of rows) {
    if (!map[weaponId]) map[weaponId] = [];
    // 去掉查询附带的 weaponId：返回对象结构必须与 AmmoRow 一致，避免污染下游数据
    map[weaponId].push(row);
  }
  return map;
}

/**
 * 读取同类武器（用于详情页推荐）
 * @param weapon - 当前武器行
 * @param limit - 返回数量，默认 3
 * @returns 同类别武器列表
 */
export function getRelatedWeapons(weapon: WeaponRow, limit = 3): WeaponRow[] {
  // 必须带 ORDER BY：无排序时 SQLite 返回顺序不稳定，SSG 每次构建的推荐位会跳动
  return db()
    .prepare(`SELECT * FROM weapons WHERE category = ? AND id != ? ORDER BY name LIMIT ?`)
    .all(weapon.category, weapon.id, limit) as WeaponRow[];
}
