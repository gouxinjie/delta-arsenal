// 三角洲军械库 — 数据同步脚本 (M1)
// 拉取三源 → 统一 schema → 写入 SQLite (data/delta.db)
// 可重复执行：全量重建。任一源拉取失败时回退到本地缓存，缓存也没有则报错终止。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

// 版本守卫：better-sqlite3 原生模块按 Node 22 ABI 编译，
// 用 Node 20 运行会在 `new Database()` 时直接原生崩溃（0xC0000005，无 JS 堆栈），此处提前给出可读报错
const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
if (NODE_MAJOR < 22) {
  console.error(`[FATAL] sync 需要 Node >= 22（当前 ${process.version}），请切换版本后重试`);
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'delta.db');

const SOURCES = {
  guns: 'https://cdn.jsdelivr.net/gh/jiansenc/DeltaForceData@main/public/json/gun/gunRifle.json',
  ammo: 'https://cdn.jsdelivr.net/gh/AVA-2568/delta-gun-tierlist@main/data/game/ammo.json',
  tierWeapons: 'https://cdn.jsdelivr.net/gh/AVA-2568/delta-gun-tierlist@main/data/game/weapons.json',
  // 元数据源：数据集版本与上游同步时间，仅用于版本标注与变化检测，拉取失败不阻塞主流程
  provenance: 'https://cdn.jsdelivr.net/gh/AVA-2568/delta-gun-tierlist@main/data/game/provenance.json',
};

const TIER_BY_RARITY = { 白: 1, 绿: 2, 蓝: 3, 紫: 4, 橙: 5, 金: 5 };

/**
 * 数据集版本 -> 赛季标签映射。
 * provenance.json 的 dataset_version 形如 `20261105-weiguang.1`（日期-赛季代号.修订号），
 * 上游开新赛季会递增该值，必须在此补一行；未登记时会告警并把赛季标记为「未知」，
 * 避免站点继续挂着旧赛季标签而无人发现。
 */
const SEASON_BY_DATASET = {
  '20261105-weiguang.1': 'S12',
};

/**
 * 计算弹药关键字段指纹（id + 穿透等级 + 穿透矩阵），用于跨次同步比对数据是否变动
 * @param {Array<{ id: string, pen_level: number, matrix: object }>} rows - 弹药行
 * @returns {string} 16 位 sha256 指纹
 */
function ammoFingerprint(rows) {
  const payload = rows
    .map((a) => [a.id, a.pen_level, a.matrix])
    .sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

/**
 * 从 provenance 解析数据集版本信息
 * @param {object|null} prov - provenance.json 内容（拉取失败为 null）
 * @returns {{ datasetVersion: string, datasetSyncedAt: string, season: string }}
 */
function resolveDataset(prov) {
  const datasetVersion = prov?.source?.dataset_version ?? 'unknown';
  const datasetSyncedAt = prov?.source?.synced_at ?? '';
  const season = SEASON_BY_DATASET[datasetVersion] ?? '未知';
  return { datasetVersion, datasetSyncedAt, season };
}

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

/**
 * 口径写法归一表：武器源与弹药源用词不一致（.300 Blackout / 12 Gauge / 7.62x54 …），
 * 统一收敛到弹药表的写法，否则按口径匹配关联会整批丢失。
 * key 一律小写，value 为弹药表中的标准写法。
 */
const CALIBER_CANON = {
  '.300 blackout': '.300BLK',
  '.338': '.338 Lap Mag',
  '.338 lapua': '.338 Lap Mag',
  '.338 lap mag': '.338 Lap Mag',
  '.357': '.357 Magnum',
  '.357 magnum': '.357 Magnum',
  '.45': '.45ACP',
  '.45 acp': '.45ACP',
  '.45acp': '.45ACP',
  '.50': '.50AE',
  '.50ae': '.50AE',
  '.50 bmg': '.50 BMG',
  '12.7x99': '.50 BMG',
  '12.7x99mm': '.50 BMG',
  '12': '12Gauge',
  '12 gauge': '12Gauge',
  '12gauge': '12Gauge',
  '4.6x30': '4.6x30mm',
  '5.45x39': '5.45x39mm',
  '5.56x45': '5.56x45mm',
  '5.7x28': '5.7x28mm',
  '5.8x42': '5.8x42mm',
  '6.8x51': '6.8x51mm',
  '7.62x39': '7.62x39mm',
  '7.62x51': '7.62x51mm',
  '7.62x54': '7.62x54R',
  '7.62x54mm': '7.62x54R',
  '7.62x54r': '7.62x54R',
  // dfc 源的已知笔误（G3 战斗步枪）
  'mmo7.62x51': '7.62x51mm',
  '9x19': '9x19mm',
  '9x39': '9x39mm',
  '箭矢': '复合弓',
};

/**
 * 口径归一化：剥离 ammo 前缀 + 收敛两家数据源的写法差异
 * @param {string} c - 原始口径
 * @returns {string} 归一化后的口径（与弹药表口径可对齐）
 */
function normalizeCaliber(c) {
  if (!c) return '';
  const raw = c.replace(/^ammo/, '').trim();
  return CALIBER_CANON[raw.toLowerCase()] ?? raw;
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
  // provenance：数据集版本号与上游同步时间（仅用于版本标注与变化检测，失败不阻塞主流程）
  let provenance = null;
  try {
    provenance = await fetchJSON('provenance', SOURCES.provenance);
  } catch (e) {
    console.warn(`  [WARN] provenance 拉取失败，数据版本降级为未知: ${e.message}`);
  }
  // 归一化名称 -> 官方 tier 记录（weapon_id 与口径均以官方为准）
  // 同一武器在 tier 表可能有多条记录（同 id 多品阶），已核实：归一名称命中多条时 id 与口径均唯一，直接覆盖结果一致
  const TIER_BY_NAME = new Map(
    tierWeapons.map((w) => {
      const key = normalizeName(w.name);
      return [NAME_ALIAS[key] ?? key, w];
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
  const weapons = [];
  const seenNames = new Set();
  // id 唯一性防护：dfc 武器统一改用官方 weapon_id 后，需确保不与 dfd 冲突（主键冲突会导致整批写入失败）
  const seenIds = new Set();

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
    seenIds.add(String(g.objectID));
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
    const tierWeapon = TIER_BY_NAME.get(normKey);
    // id 统一为官方 weapon_id（与 dfd 武器同一编码体系，图片/详情链接口径一致）；未匹配时回退 dfc 自带 id
    const officialId = tierWeapon ? String(tierWeapon.weapon_id) : '';
    const weaponId = officialId || String(w.id);
    if (!officialId) console.warn(`  [WARN] ${w.name} 未匹配到官方 weapon_id，图链降级为 dfc 源`);
    if (seenIds.has(weaponId)) {
      console.warn(`  [WARN] ${w.name} 的 id ${weaponId} 与已入库武器重复，跳过`);
      continue;
    }
    const tierImg = officialId ? `https://playerhub.df.qq.com/playerhub/60004/object/${officialId}.png` : '';
    // 口径以官方 tier 为准（dfc 存在 K437/KC17/MDR/MK4 口径与游戏不符）；官方口径为空时（如复合弓）回退 dfc
    const caliber = normalizeCaliber(tierWeapon?.caliber || w.caliber);
    weapons.push({
      id: weaponId,
      name: w.name,
      category: DFC_CATEGORY_MAP[w.category] ?? w.category ?? '未知',
      caliber,
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
    seenIds.add(weaponId);
  }

  // ---- 2.5 tierlist 武器兜底补充 ----
  // S12 起官方 DFD 源（47 把）与 dfc 源（0.8.0）更新滞后，新枪（如 AN94）只出现在 tierlist weapons.json；
  // 该源字段（flesh_damage / panel_attributes / ammo_item_ids）与前端面板模型可直接对应，故作为第三补充源
  const TIER_CATEGORY = {
    assaultRifle: '步枪',
    submachineGun: '冲锋枪',
    lightMachineGun: '轻机枪',
    marksmanRifle: '精确射手步枪',
    sniperRifle: '狙击步枪',
    pistol: '手枪',
    specialWeapon: '特殊武器',
  };
  /** 按 weapon_id 去重（同一武器在 tier 表存在多条品阶记录） */
  const tierById = new Map();
  for (const w of tierWeapons) {
    const id = String(w.weapon_id);
    if (!tierById.has(id)) tierById.set(id, w);
  }
  for (const [id, w] of tierById) {
    if (seenIds.has(id)) continue;
    const pa = w.panel_attributes ?? {};
    const tierImg = `https://playerhub.df.qq.com/playerhub/60004/object/${id}.png`;
    weapons.push({
      id,
      name: w.name,
      category: TIER_CATEGORY[w.category_id] ?? w.category ?? '未知',
      caliber: normalizeCaliber(w.caliber),
      image: tierImg,
      imageUrls: [tierImg],
      imagePre: '',
      panel: {
        meatHarm: w.flesh_damage, armorHarm: w.armor_damage, fireRate: w.rpm,
        effectiveRange: w.valid_range_m, recoil: pa.recoil_control, control: pa.handling,
        stability: pa.stability, hipFire: pa.waist_accuracy,
        muzzleVelocity: w.muzzle_velocity_mps, magSize: w.clip_capacity,
        fireModes: w.fire_modes ?? [], soundRadius: w.acoustics?.shot_distance_m,
      },
      slots: [],
      source: 'tierlist',
    });
    seenIds.add(id);
    seenNames.add(w.name);
    console.log(`  [补齐] ${w.name}（tierlist 源，官方源与 dfc 均未收录）`);
  }

  // ---- 3. 构建弹药表 + 弹药↔武器关联 ----
  const ammoById = new Map(tierAmmo.map((a) => [String(a.ammo_item_id), a]));
  const ammoRows = [];
  for (const [id, a] of ammoById) {
    // 口径同样走归一化，保证与武器口径在同一套用词下比对
    const caliber = normalizeCaliber(a.caliber) || (a.name.includes('箭矢') ? '复合弓' : '未知');
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
      // 命中特效（燃烧 / 延迟爆裂等），无特效为空对象，供前端生成「特点」摘要
      effects: a.on_hit_effects ?? {},
      season_limited: a.is_season_limited ? 1 : 0,
      // 源数据备注：限定弹标注赛季（如「S11赛季限定子弹」），特殊弹标注机制（如「叠层触发爆炸」）
      note: a.season_note ?? '',
    });
  }

  // 口径 -> 弹药 id 索引
  const ammoIdsByCaliber = new Map();
  for (const a of ammoRows) {
    if (!a.caliber || a.caliber === '未知') continue;
    if (!ammoIdsByCaliber.has(a.caliber)) ammoIdsByCaliber.set(a.caliber, []);
    ammoIdsByCaliber.get(a.caliber).push(a.id);
  }

  const ammoWeapons = [];
  const linked = new Set();
  // 关联有效性校验：官方名单可能引用弹药源尚未收录的新弹种（如霰弹 37250400005），
  // 这类「幽灵 id」写入会形成孤儿关联（前端 join 不到、meta 计数虚高），此处直接丢弃并告警
  const weaponIdSet = new Set(weapons.map((w) => w.id));
  const droppedLinks = [];
  /** 写入一条关联（去重：官方关联与口径补齐会重叠；无效 id 丢弃） */
  const pushLink = (ammoId, weaponId) => {
    if (!ammoById.has(ammoId) || !weaponIdSet.has(weaponId)) {
      droppedLinks.push({ ammoId, weaponId });
      return;
    }
    const key = `${ammoId}|${weaponId}`;
    if (linked.has(key)) return;
    linked.add(key);
    ammoWeapons.push({ ammo_id: ammoId, weapon_id: weaponId });
  };

  for (const w of weapons) {
    const g = dfdWeapons.find((x) => String(x.objectID) === w.id);
    // 1) 官方 gunDetail.ammo 关联（权威，但官方列表常只覆盖部分弹种）
    for (const a of g?.gunDetail?.ammo ?? []) {
      pushLink(String(a.objectID), w.id);
    }
    // 2) tierlist 记录的弹种清单（含官方源未覆盖的新枪，如 S12 的 AN94）
    for (const ammoId of tierById.get(w.id)?.ammo_item_ids ?? []) {
      pushLink(String(ammoId), w.id);
    }
    // 3) 口径补齐：游戏内弹种由口径决定，两家源的口径命名已归一化
    for (const ammoId of ammoIdsByCaliber.get(w.caliber) ?? []) {
      pushLink(ammoId, w.id);
    }
  }

  if (droppedLinks.length) {
    const detail = droppedLinks.map((d) => `${d.ammoId}->${d.weaponId}`).join(', ');
    console.warn(`  [WARN] 丢弃 ${droppedLinks.length} 条无效弹药关联（弹药源未收录或武器不存在）: ${detail}`);
  }

  // ---- 4. 阈值校验（PRD 9：低于阈值终止不写入）----
  const checks = [
    ['ammo', ammoRows.length, 100],
    ['weapons', weapons.length, 45],
    ['ammo_weapons 关联', ammoWeapons.length, 400],
  ];
  let failed = false;
  for (const [label, n, min] of checks) {
    const ok = n >= min;
    console.log(`  [${ok ? 'OK' : 'FAIL'}] ${label}: ${n} (阈值 ${min})`);
    if (!ok) failed = true;
  }
  if (failed) throw new Error('数据量低于阈值，终止写入');

  // ---- 4.5 版本溯源与变化检测（须在删库前读取旧 meta）----
  const { datasetVersion, datasetSyncedAt, season } = resolveDataset(provenance);
  if (!SEASON_BY_DATASET[datasetVersion]) {
    console.warn(`  [WARN] 未登记的数据集版本 ${datasetVersion}，请在 SEASON_BY_DATASET 补映射，否则赛季标签为「未知」`);
  }
  const ammoFp = ammoFingerprint(ammoRows);
  const nextCounts = { ammo: ammoRows.length, weapons: weapons.length, links: ammoWeapons.length };

  /** 旧库版本快照（读取失败不影响写入，仅跳过变化检测） */
  const prevMeta = {};
  let prevDb;
  try {
    if (fs.existsSync(DB_PATH)) {
      prevDb = new Database(DB_PATH, { readonly: true });
      for (const r of prevDb.prepare('SELECT key, value FROM meta').all()) prevMeta[r.key] = r.value;
    }
  } catch (e) {
    console.warn(`  [WARN] 旧库版本读取失败，跳过变化检测: ${e.message}`);
  } finally {
    // 异常路径也必须释放连接：Windows 下残留句柄会导致随后的删库失败
    try {
      prevDb?.close();
    } catch {
      // 关闭失败不影响后续就地重建
    }
  }
  if (prevMeta.datasetVersion && prevMeta.datasetVersion !== datasetVersion) {
    console.warn(`  [WARN] 数据集版本变化: ${prevMeta.datasetVersion} -> ${datasetVersion}，请复核赛季文案`);
  }
  if (prevMeta.ammoFingerprint && prevMeta.ammoFingerprint !== ammoFp) {
    console.warn(`  [WARN] 弹药数据指纹变化: ${prevMeta.ammoFingerprint} -> ${ammoFp}，弹种或穿透矩阵有改动，建议复核`);
  }
  try {
    const prevCounts = prevMeta.counts ? JSON.parse(prevMeta.counts) : null;
    if (prevCounts) {
      const changed = ['ammo', 'weapons', 'links'].filter((k) => prevCounts[k] !== nextCounts[k]);
      if (changed.length) {
        console.warn(`  [WARN] 收录数量变化: ${changed.map((k) => `${k} ${prevCounts[k]} -> ${nextCounts[k]}`).join(' | ')}`);
      }
    }
  } catch {
    console.warn('  [WARN] 旧库 counts 解析失败，跳过数量比对');
  }

  // ---- 5. 写入 SQLite（全量重建）----
  // 优先删库重建；库文件被占用（如开发服务器持有只读连接）时退化为就地重建，
  // 避免因文件锁导致整次同步失败。
  let db;
  try {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  } catch (e) {
    console.warn(`  [WARN] 旧库无法删除（${e.message}），改为就地重建`);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    for (const t of ['ammo_weapons', 'ammo', 'weapons', 'meta']) db.exec(`DROP TABLE IF EXISTS ${t}`);
  }
  db.exec(`
    CREATE TABLE ammo (
      id TEXT PRIMARY KEY, name TEXT, caliber TEXT,
      tier INTEGER, rarity TEXT, pen_level INTEGER,
      dmg_ratio REAL, armor_ratio REAL,
      matrix TEXT, effects TEXT, season_limited INTEGER, note TEXT, updated_at TEXT
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
  const insAmmo = db.prepare(`INSERT INTO ammo VALUES (@id,@name,@caliber,@tier,@rarity,@pen_level,@dmg_ratio,@armor_ratio,@matrix,@effects,@season_limited,@note,@updated_at)`);
  const insWeapon = db.prepare(`INSERT INTO weapons VALUES (@id,@name,@category,@caliber,@image,@imagePre,@panel,@slots,@source,@updated_at)`);
  const insAW = db.prepare(`INSERT OR IGNORE INTO ammo_weapons VALUES (@ammo_id,@weapon_id)`);

  db.transaction(() => {
    for (const a of ammoRows) insAmmo.run({ ...a, matrix: JSON.stringify(a.matrix), effects: JSON.stringify(a.effects), updated_at: now });
    for (const w of weapons) insWeapon.run({ ...w, panel: JSON.stringify(w.panel), slots: JSON.stringify(w.slots), updated_at: now });
    for (const r of ammoWeapons) insAW.run(r);
    const meta = {
      generatedAt: now,
      // 赛季标签由数据集版本映射得出，避免手写常量与上游脱节
      season,
      // 上游 provenance 的 dataset_version / synced_at，用于核对本站数据是否落后
      datasetVersion,
      datasetSyncedAt,
      // 弹药关键字段指纹（id + 穿透等级 + 穿透矩阵），跨次同步变化检测用
      ammoFingerprint: ammoFp,
      sources: JSON.stringify(Object.values(SOURCES).concat('delta-force-core@0.8.0')),
      counts: JSON.stringify(nextCounts),
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
  console.log(`  数据版本: ${season} · ${datasetVersion}（上游同步于 ${datasetSyncedAt || '未知'}）`);
  console.log(`  弹药: ${ammoRows.length} 条 | 武器: ${weapons.length} 条 | 关联: ${ammoWeapons.length} 条`);
  console.log(`  口径分布:`, caliberDist);
  console.log(`  输出: ${DB_PATH}`);
  // WAL 模式下必须显式合并回主库文件：dev 服务常持有只读连接，仅 close() 不会 checkpoint，
  // 会导致 data/delta.db 主文件仍是旧数据（改动全留在被 gitignore 的 -wal 里）
  const ckpt = db.pragma('wal_checkpoint(TRUNCATE)');
  console.log(`  WAL 合并: ${JSON.stringify(ckpt)}`);
  db.close();
}

main().catch((e) => {
  console.error('== sync 失败 ==', e.message);
  process.exit(1);
});
