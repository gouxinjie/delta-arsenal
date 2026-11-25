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
  tierWeapons: 'https://cdn.jsdelivr.net/gh/AVA-2568/delta-gun-tierlist@main/data/game/weapons.json',
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

/**
 * 武器名称归一化：跨源名称匹配用（dfc 名 / tierlist 名与官方名常有差异）
 * 规则：小写 → 去括号注释 → 去空格/连字符 → 去类别后缀词
 * @param {string} name - 原始武器名
 * @returns {string} 归一化后的名称 key
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .replace(/[\s\-—·]/g, '')
    .replace(/(紧凑)?突击步枪|战斗步枪|冲锋枪|射手步枪|重型?狙击步枪|杠杆(式)?步枪|霰弹枪|轻机枪|通用机枪|手枪|战术|弓/g, '');
}

// 归一化后仍不一致的跨源别名（tierlist weapons.json 名 -> 官方名）
const NAME_ALIAS = {
  马林: 'marlin', // 马林杠杆式步枪 vs Marlin杠杆步枪
};

async function main() {
  console.log('== 三角洲军械库 sync 开始 ==');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });

  // ---- 1. 拉取数据源 ----
  const gunsRaw = await fetchJSON('guns', SOURCES.guns);
  const ammoRaw = await fetchJSON('ammo', SOURCES.ammo);
  // tierlist weapons.json：含 88 把武器的官方 weapon_id，用于给补充源武器匹配官方图
  let tierWeapons = [];
  try {
    const tierRaw = await fetchJSON('tier_weapons', SOURCES.tierWeapons);
    tierWeapons = tierRaw.weapons ?? [];
    console.log(`  [OK] tierlist weapons ${tierWeapons.length} 条`);
  } catch (e) {
    console.warn(`  [WARN] tierlist weapons 拉取失败，官方图匹配降级: ${e.message}`);
  }
  // 归一化名称 -> 官方 weapon_id（同 id 重复出现直接覆盖，结果一致）
  const TIER_ID_BY_NAME = new Map(
    tierWeapons.map((w) => {
      const key = normalizeName(w.name);
      return [NAME_ALIAS[key] ?? key, String(w.weapon_id)];
    })
  );

  const dfdWeapons = gunsRaw.jData.data.data.list;
  const tierAmmo = ammoRaw.ammo;

  // delta-force-core 作为武器补充源（本地 npm，无网络依赖）
  // flatMap 时带上分类 category（WEAPONS 是 WeaponCategory 数组，武器对象本身无 category 字段）
  let dfcWeapons = [];
  try {
    const dfc = await import('delta-force-core');
    dfcWeapons = dfc.WEAPONS.flatMap((g) => (g.weapons ?? []).map((w) => ({ ...w, category: g.category })));
    console.log(`  [OK] delta-force-core 武器 ${dfcWeapons.length} 条`);
  } catch (e) {
    console.warn(`  [WARN] delta-force-core 不可用，跳过补充源: ${e.message}`);
  }

  // dfc 命名与官方不一致的别名映射（dfc 名 -> dfd 官方名），用于去重合并
  const DFC_ALIAS = {
    'QBZ-95-1突击步枪': 'QBZ95-1突击步枪',
    'AS Val「巨浪」突击步枪': 'AS Val突击步枪',
    'SR-3M冲锋枪': 'SR-3M紧凑突击步枪',
    'MP7冲锋枪': 'MP7',
    'M1014半自动霰弹枪': 'M1014霰弹枪',
    'S12K连发霰弹枪': 'S12K霰弹枪',
    'M14战斗射手步枪': 'M14射手步枪',
    'AWM重型狙击步枪': 'AWM狙击步枪',
    'QSZ92G手枪': 'QSZ92G',
    '.357左轮手枪': '.357左轮',
    '93R手枪': '93R',
    'G17手枪': 'G17',
    'G18手枪': 'G18',
  };

  // ---- 2. 构建武器表 ----
  // DFD 为主（面板全 + 官方图），dfc 按别名映射去重后补缺
  const dfcByName = new Map(dfcWeapons.map((w) => [DFC_ALIAS[w.name] ?? w.name, w]));
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
      // 候选图 URL 列表（下载时按顺序尝试，成功即止）
      imageUrls: [g.pic ?? ''].filter(Boolean),
      imagePre: g.prePic ?? '',
      panel,
      slots: (gd.accessory ?? []).map((s) => s.slotID).filter(Boolean),
      source: 'dfd',
    });
    seenNames.add(g.objectName);
  }
  // dfc 分类名与官方（dfd）不一致的归一映射
  const DFC_CATEGORY_MAP = { 突击步枪: '步枪' };

  for (const w of dfcWeapons) {
    const officialName = DFC_ALIAS[w.name] ?? w.name;
    if (seenNames.has(officialName)) continue; // dfd 已有（含别名匹配），不重复入库
    // dfc 字段映射（与 dfd 重叠武器数值交叉验证）：
    // dfc.control == dfd.recoil（后坐力），dfc.handling == dfd.control（控制力）
    // 图片候选（按优先级）：官方 playerhub 图（tierlist weapon_id 匹配）→ dfc 图床 → jsDelivr 镜像
    const dfcImg = w.image ?? '';
    const dfcImgMirror = dfcImg.replace(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)$/,
      'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4'
    );
    const normKey = NAME_ALIAS[normalizeName(w.name)] ?? normalizeName(w.name);
    const tierId = TIER_ID_BY_NAME.get(normKey);
    const tierImg = tierId ? `https://playerhub.df.qq.com/playerhub/60004/object/${tierId}.png` : '';
    if (!tierId) console.warn(`  [WARN] ${w.name} 未匹配到官方 weapon_id，图链降级为 dfc 源`);
    weapons.push({
      id: w.id,
      name: w.name,
      category: DFC_CATEGORY_MAP[w.category] ?? w.category ?? '未知',
      caliber: normalizeCaliber(w.caliber),
      image: tierImg || dfcImg,
      imageUrls: [...new Set([tierImg, dfcImg, dfcImgMirror])].filter(Boolean),
      imagePre: '',
      panel: {
        meatHarm: w.baseDamage, armorHarm: w.armorDamage, fireRate: w.fireRate,
        effectiveRange: w.effectiveRange, recoil: w.control, control: w.handling,
        stability: w.aimStability, hipFire: w.hipFireAccuracy,
        muzzleVelocity: w.muzzleVelocity, magSize: w.magazineCapacity,
        fireModes: w.fireModes ?? [], soundRadius: w.soundRadius,
      },
      slots: [],
      source: 'dfc',
    });
    seenNames.add(w.name);
    seenNames.add(officialName);
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
    if (g) {
      // dfd 枪：官方 gunDetail.ammo 关联
      for (const a of g.gunDetail?.ammo ?? []) {
        ammoWeapons.push({ ammo_id: String(a.objectID), weapon_id: w.id });
      }
      continue;
    }
    // dfc 补充枪：无官方关联数据，按口径推导（口径决定可用弹药，与游戏规则一致）
    for (const a of ammoRows) {
      if (a.caliber && a.caliber === w.caliber) {
        ammoWeapons.push({ ammo_id: a.id, weapon_id: w.id });
      }
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
    // 候选 URL 按顺序尝试（如 dfc：raw.githubusercontent 失败自动走 jsDelivr 镜像）
    const urls = (w.imageUrls ?? []).filter((u) => /^https?:/.test(u));
    if (!urls.length) continue;
    const local = `/img/weapons/${w.id}.png`;
    const file = path.join(ROOT, 'public', 'img', 'weapons', `${w.id}.png`);
    let ok = false;
    if (fs.existsSync(file) && fs.statSync(file).size > 0) { imgSkip++; ok = true; }
    else {
      for (const url of urls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (!buf.length) throw new Error('空文件');
          fs.writeFileSync(file, buf);
          imgOk++;
          ok = true;
          break;
        } catch (e) {
          console.warn(`  [WARN] 图片下载失败 ${w.name} <- ${url}: ${e.message}`);
        }
      }
      if (!ok) imgFail++;
    }
    // 仅在本地文件可用时改写为本地路径；失败置空，页面走占位图（禁止出现 404 死链）
    w.image = ok ? local : '';
  }
  const updImg = db.prepare('UPDATE weapons SET image = ? WHERE id = ?');
  db.transaction(() => {
    for (const w of weapons) updImg.run(w.image, w.id);
  })();
  console.log(`  图片: 新下载 ${imgOk} | 已存在 ${imgSkip} | 失败 ${imgFail}`);

  // ---- 5.7 弹药口径图标本地化（playerhub 官方贴图，按口径区分）----
  // 数据源 ammo.json 无图标字段，图标按口径从 playerhub 拉取，本地化避免热链
  const AMMO_ICON_MAP = {
    '.300BLK': '300BLK', '.338 Lap Mag': '338', '.357 Magnum': '357',
    '.45ACP': '45-ACP', '.50AE': '50-AE', '12.7x55': '12.7x55',
    '12Gauge': '12-Gauge', '4.6x30mm': '4.6x30mm', '5.45x39mm': '5.45x39mm',
    '5.56x45mm': '5.56x45mm', '5.7x28mm': '5.7x28mm', '5.8x42mm': '5.8x42mm',
    '6.8x51mm': '6.8x51mm', '7.62x39mm': '7.62x39mm', '7.62x51mm': '7.62x51mm',
    '7.62x54R': '7.62x54mm', '9x19mm': '9x19mm', '9x39mm': '9x39mm',
  };
  const AMMO_IMG_DIR = path.join(ROOT, 'public', 'img', 'ammo');
  fs.mkdirSync(AMMO_IMG_DIR, { recursive: true });
  let ammoImgOk = 0, ammoImgSkip = 0, ammoImgFail = 0;
  for (const [caliber, file] of Object.entries(AMMO_ICON_MAP)) {
    const dest = path.join(AMMO_IMG_DIR, `${file}.png`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { ammoImgSkip++; continue; }
    try {
      const res = await fetch(`https://playerhub.df.qq.com/playerhub/60004/object/gun/ammo/${file}.png`, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      ammoImgOk++;
    } catch (e) {
      ammoImgFail++;
      console.warn(`  [WARN] 弹药图标下载失败 ${caliber}: ${e.message}`);
    }
  }
  console.log(`  弹药图标: 新下载 ${ammoImgOk} | 已存在 ${ammoImgSkip} | 失败 ${ammoImgFail}`);

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
