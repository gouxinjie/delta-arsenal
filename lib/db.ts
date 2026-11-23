import Database from 'better-sqlite3';
import path from 'node:path';

// 构建期/SSG 直读 SQLite（PRD 6：零运行时数据库依赖）
const DB_PATH = path.join(process.cwd(), 'data', 'delta.db');

/** 数据库单例（只读） */
let _db: Database.Database | null = null;

/** 获取只读数据库连接（懒加载单例） */
function db(): Database.Database {
  if (!_db) _db = new Database(DB_PATH, { readonly: true });
  return _db;
}

/** 弹药数据行 */
export interface AmmoRow {
  /** 弹药 itemID */
  id: string;
  /** 型号名 */
  name: string;
  /** 口径 */
  caliber: string;
  /** 品阶 1-5 */
  tier: number | null;
  /** 品阶中文名 */
  rarity: string;
  /** 穿透等级 0-7 */
  pen_level: number;
  /** 肉体伤害倍率 */
  dmg_ratio: number;
  /** 护甲伤害倍率 */
  armor_ratio: number;
  /** 穿透矩阵 JSON 字符串 */
  matrix: string;
  /** 是否赛季限定 */
  season_limited: number;
}

/** 武器数据行 */
export interface WeaponRow {
  /** 武器 objectID */
  id: string;
  /** 武器名 */
  name: string;
  /** 类别 */
  category: string;
  /** 口径 */
  caliber: string;
  /** 本地图片路径 */
  image: string;
  /** 面板 JSON 字符串 */
  panel: string;
  /** 可改装槽位 JSON 数组字符串 */
  slots: string;
  /** 数据来源标记 */
  source: string;
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
 * @returns 弹药列表，附 weaponNames（顿号分隔的适用枪械名）
 */
export function getAmmoWithWeapons(): (AmmoRow & { weaponNames: string })[] {
  return db()
    .prepare(
      `SELECT a.*, GROUP_CONCAT(w.name, '、') AS weaponNames
       FROM ammo a
       LEFT JOIN ammo_weapons aw ON aw.ammo_id = a.id
       LEFT JOIN weapons w ON w.id = aw.weapon_id
       GROUP BY a.id ORDER BY a.caliber, a.pen_level DESC`
    )
    .all() as (AmmoRow & { weaponNames: string })[];
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
  return (db().prepare('SELECT * FROM weapons WHERE id = ?').get(id) as WeaponRow) ?? null;
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
 * 读取全部武器 id（供 generateStaticParams）
 * @returns 武器 objectID 数组
 */
export function getWeaponIds(): string[] {
  return (db().prepare('SELECT id FROM weapons').all() as { id: string }[]).map((r) => r.id);
}

/**
 * 读取同类武器（用于详情页推荐）
 * @param weapon - 当前武器行
 * @param limit - 返回数量，默认 3
 * @returns 同类别武器列表
 */
export function getRelatedWeapons(weapon: WeaponRow, limit = 3): WeaponRow[] {
  return db()
    .prepare(`SELECT * FROM weapons WHERE category = ? AND id != ? LIMIT ?`)
    .all(weapon.category, weapon.id, limit) as WeaponRow[];
}
