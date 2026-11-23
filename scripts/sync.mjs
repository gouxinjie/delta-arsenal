// 三角洲军械库 — 数据同步脚本 (M1)
// 拉取三源 → 统一 schema → 写入 SQLite (data/delta.db)
// 可重复执行：全量重建。任一源拉取失败时回退到本地缓存，缓存也没有则报错终止。

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'delta.db');

const SOURCES = {
  guns: 'https://cdn.jsdelivr.net/gh/jiansenc/DeltaForceData@main/public/json/gun/gunRifle.json',
  ammo: 'https://cdn.jsdelivr.net/gh/AVA-2568/delta-gun-tierlist@main/data/game/ammo.json',
};

const TIER_BY_RARITY = { 白: 1, 绿: 2, 蓝: 3, 紫: 4, 橙: 5, 金: 5 };

async function fetchJSON(key, url) {
  const cache = path.join(ROOT, 'tmp', `${key}_cache.json`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    fs.writeFileSync(cache, JSON.stringify(json));
    console.log(`  [OK] ${key} <- ${url}`);
    return json;
  } catch (e) {
    if (fs.existsSync(cache)) {
      console.warn(`  [WARN] ${key} 拉取失败(${e.message})，使用本地缓存`);
      return JSON.parse(fs.readFileSync(cache, 'utf-8'));
    }
    throw new Error(`${key} 拉取失败且无缓存: ${e.message}`);
  }
}

function normalizeCaliber(c) {
  if (!c) return '';
  return c.replace(/^ammo/, '').trim();
}

async function main() {
  console.log('== 三角洲军械库 sync 开始 ==');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });

  // ---- 1. 拉取数据源 ----
  const gunsRaw = await fetchJSON('guns', SOURCES.guns);
  const ammoRaw = await fetchJSON('ammo', SOURCES.ammo);

  const dfdWeapons = gunsRaw.jData.data.data.list;
  const tierAmmo = ammoRaw.ammo;

  // delta-force-core 作为武器补充源（本地 npm，无网络依赖）
  let dfcWeapons = [];
  try {
    const dfc = await import('delta-force-core');
    dfcWeapons = dfc.WEAPONS.flatMap((g) => g.weapons ?? (Array.isArray(g) ? g : [g]));
    console.log(`  [OK] delta-force-core 武器 ${dfcWeapons.length} 条`);
  } catch (e) {
    console.warn(`  [WARN] delta-force-core 不可用，跳过补充源: ${e.message}`);
  }

  // ---- 2. 构建武器表 ----
  // DFD 为主（面板全 + 官方图），dfc 按名称补缺
  const dfcByName = new Map(dfcWeapons.map((w) => [w.name, w]));
  const weapons = [];
  const seenNames = new Set();

  for (const g of dfdWeapons) {
    const gd = g.gunDetail ?? {};
    const panel = {
      meatHarm: gd.meatHarm, armorHarm: gd.armorHarm, fireRate: gd.fireSpeed,
      effectiveRange: gd.shootDistance, recoil: gd.recoil, control: gd.control,
      stability: gd.stable, hipFire: gd.hipShot, muzzleVelocity: gd.muzzleVelocity,
      magSize: gd.capacity, fireModes: (gd.fireMode ?? '').split(',').filter(Boolean),
      soundRadius: gd.soundDistance,
    };
    weapons.push({
      id: String(g.objectID),
      name: g.objectName,
      category: g.secondClassCN,
      caliber: normalizeCaliber(gd.caliber),
      image: g.pic ?? '',
      imagePre: g.prePic ?? '',
      panel,
      slots: (gd.accessory ?? []).map((s) => s.slotID).filter(Boolean),
      source: 'dfd',
    });
    seenNames.add(g.objectName);
  }
  for (const w of dfcWeapons) {
    if (seenNames.has(w.name)) continue;
    weapons.push({
      id: w.id,
      name: w.name,
      category: w.category ?? '未知',
      caliber: normalizeCaliber(w.caliber),
      image: w.image ?? '',
      imagePre: '',
      panel: {
        meatHarm: w.baseDamage, armorHarm: w.armorDamage, fireRate: w.fireRate,
        effectiveRange: w.effectiveRange, recoil: null, control: w.handling,
        stability: w.aimStability, hipFire: w.hipFireAccuracy,
        muzzleVelocity: w.muzzleVelocity, magSize: w.magazineCapacity,
        fireModes: w.fireModes ?? [], soundRadius: w.soundRadius,
      },
      slots: [],
      source: 'dfc',
    });
  }

  // ---- 3. 构建弹药表 + 弹药↔武器关联 ----
  const ammoById = new Map(tierAmmo.map((a) => [String(a.ammo_item_id), a]));
  const ammoRows = [];
  for (const [id, a] of ammoById) {
    const caliber = a.caliber || (a.name.includes('箭矢') ? '复合弓' : '未知');
    ammoRows.push({
      id,
      name: a.name,
      caliber,
      tier: TIER_BY_RARITY[a.rarity] ?? null,
      rarity: a.rarity,
      pen_level: a.penetration_level,
      dmg_ratio: a.flesh_damage_multiplier,
      armor_ratio: a.armor_damage_multiplier,
      matrix: a.penetration_matrix ?? {},
      season_limited: a.is_season_limited ? 1 : 0,
    });
  }

  const ammoWeapons = [];
  for (const w of weapons) {
    const g = dfdWeapons.find((x) => String(x.objectID) === w.id);
    if (!g) continue; // dfc 补充源暂无 ammo 映射
    for (const a of g.gunDetail?.ammo ?? []) {
      ammoWeapons.push({ ammo_id: String(a.objectID), weapon_id: w.id });
    }
  }

  // ---- 4. 阈值校验（PRD 9：低于阈值终止不写入）----
  const checks = [
    ['ammo', ammoRows.length, 100],
    ['weapons', weapons.length, 45],
    ['ammo_weapons 关联', ammoWeapons.length, 60],
  ];
  let failed = false;
  for (const [label, n, min] of checks) {
    const ok = n >= min;
    console.log(`  [${ok ? 'OK' : 'FAIL'}] ${label}: ${n} (阈值 ${min})`);
    if (!ok) failed = true;
  }
  if (failed) throw new Error('数据量低于阈值，终止写入');

  // ---- 5. 写入 SQLite（全量重建）----
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE ammo (
      id TEXT PRIMARY KEY, name TEXT, caliber TEXT,
      tier INTEGER, rarity TEXT, pen_level INTEGER,
      dmg_ratio REAL, armor_ratio REAL,
      matrix TEXT, season_limited INTEGER, updated_at TEXT
    );
    CREATE TABLE weapons (
      id TEXT PRIMARY KEY, name TEXT, category TEXT, caliber TEXT,
      image TEXT, imagePre TEXT,
      panel TEXT, slots TEXT, source TEXT, updated_at TEXT
    );
    CREATE TABLE ammo_weapons (
      ammo_id TEXT, weapon_id TEXT,
      PRIMARY KEY (ammo_id, weapon_id)
    );
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE INDEX idx_ammo_caliber ON ammo(caliber);
    CREATE INDEX idx_weapons_category ON weapons(category);
    CREATE INDEX idx_aw_weapon ON ammo_weapons(weapon_id);
  `);

  const now = new Date().toISOString();
  const insAmmo = db.prepare(`INSERT INTO ammo VALUES (@id,@name,@caliber,@tier,@rarity,@pen_level,@dmg_ratio,@armor_ratio,@matrix,@season_limited,@updated_at)`);
  const insWeapon = db.prepare(`INSERT INTO weapons VALUES (@id,@name,@category,@caliber,@image,@imagePre,@panel,@slots,@source,@updated_at)`);
  const insAW = db.prepare(`INSERT OR IGNORE INTO ammo_weapons VALUES (@ammo_id,@weapon_id)`);

  db.transaction(() => {
    for (const a of ammoRows) insAmmo.run({ ...a, matrix: JSON.stringify(a.matrix), updated_at: now });
    for (const w of weapons) insWeapon.run({ ...w, panel: JSON.stringify(w.panel), slots: JSON.stringify(w.slots), updated_at: now });
    for (const r of ammoWeapons) insAW.run(r);
    const meta = {
      generatedAt: now,
      season: 'S11',
      sources: JSON.stringify(Object.values(SOURCES).concat('delta-force-core@0.8.0')),
      counts: JSON.stringify({ ammo: ammoRows.length, weapons: weapons.length, links: ammoWeapons.length }),
    };
    for (const [k, v] of Object.entries(meta)) {
      db.prepare('INSERT INTO meta VALUES (?,?)').run(k, v);
    }
  })();

  // ---- 5.5 图片本地化（红线：不热链官方图床）----
  const IMG_DIR = path.join(ROOT, 'public', 'img', 'weapons');
  fs.mkdirSync(IMG_DIR, { recursive: true });
  let imgOk = 0, imgSkip = 0, imgFail = 0;
  for (const w of weapons) {
    if (!w.image || !/^https?:/.test(w.image)) continue;
    const local = `/img/weapons/${w.id}.png`;
    const file = path.join(ROOT, 'public', 'img', 'weapons', `${w.id}.png`);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) { imgSkip++; }
    else {
      try {
        const res = await fetch(w.image, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        imgOk++;
      } catch (e) {
        imgFail++;
        console.warn(`  [WARN] 图片下载失败 ${w.name}: ${e.message}`);
      }
    }
    w.image = local; // 无论本次是否下载成功，页面统一走本地路径
  }
  const updImg = db.prepare('UPDATE weapons SET image = ? WHERE id = ?');
  db.transaction(() => {
    for (const w of weapons) if (/^\/img\//.test(w.image)) updImg.run(w.image, w.id);
  })();
  console.log(`  图片: 新下载 ${imgOk} | 已存在 ${imgSkip} | 失败 ${imgFail}`);

  // ---- 5.6 生成搜索索引（前端内存检索用）----
  const PUBLIC_DIR = path.join(ROOT, 'public');
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const searchIndex = {
    ammo: ammoRows.map((a) => ({ type: 'ammo', id: a.id, name: a.name, caliber: a.caliber, pen: a.pen_level, tier: a.tier })),
    weapons: weapons.map((w) => ({ type: 'weapon', id: w.id, name: w.name, caliber: w.caliber, category: w.category })),
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(searchIndex));
  console.log(`  搜索索引: ${searchIndex.ammo.length + searchIndex.weapons.length} 条`);

  // ---- 6. 汇总 ----
  const caliberDist = {};
  for (const a of ammoRows) caliberDist[a.caliber] = (caliberDist[a.caliber] ?? 0) + 1;
  console.log('== sync 完成 ==');
  console.log(`  弹药: ${ammoRows.length} 条 | 武器: ${weapons.length} 条 | 关联: ${ammoWeapons.length} 条`);
  console.log(`  口径分布:`, caliberDist);
  console.log(`  输出: ${DB_PATH}`);
  db.close();
}

main().catch((e) => {
  console.error('== sync 失败 ==', e.message);
  process.exit(1);
});
