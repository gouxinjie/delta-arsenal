/**
 * 游戏中常量映射（口径贴图 / 改装配件槽位名）
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
 */

/** 口径 -> 本地弹药贴图路径（playerhub 官方贴图，按口径区分） */
export const CALIBER_ICON: Record<string, string> = {
  '.300BLK': '/img/ammo/300BLK.png',
  '.338 Lap Mag': '/img/ammo/338.png',
  '.357 Magnum': '/img/ammo/357.png',
  '.45ACP': '/img/ammo/45-ACP.png',
  '.50AE': '/img/ammo/50-AE.png',
  '12.7x55': '/img/ammo/12.7x55.png',
  '12Gauge': '/img/ammo/12-Gauge.png',
  '4.6x30mm': '/img/ammo/4.6x30mm.png',
  '5.45x39mm': '/img/ammo/5.45x39mm.png',
  '5.56x45mm': '/img/ammo/5.56x45mm.png',
  '5.7x28mm': '/img/ammo/5.7x28mm.png',
  '5.8x42mm': '/img/ammo/5.8x42mm.png',
  '6.8x51mm': '/img/ammo/6.8x51mm.png',
  '7.62x39mm': '/img/ammo/7.62x39mm.png',
  '7.62x51mm': '/img/ammo/7.62x51mm.png',
  '7.62x54R': '/img/ammo/7.62x54mm.png',
  '9x19mm': '/img/ammo/9x19mm.png',
  '9x39mm': '/img/ammo/9x39mm.png',
};

/** 弹药命中特效 -> 徽章配色（燃烧金橙 / 爆裂红），AmmoBrowser 与武器详情共用 */
export const AMMO_EFFECT_TONE: Record<'burn' | 'detonation', string> = {
  burn: 'var(--t5)',
  detonation: 'var(--danger)',
};

/** 改装槽位编号 -> 中文槽位名 */
export const SLOT_NAMES: Record<string, string> = {
  '1': '瞄具',
  '2': '枪口',
  '3': '枪管',
  '4': '护木',
  '5': '弹匣',
  '6': '枪托',
  '8': '前握把',
  '10': '后握把',
  '11': '导轨',
  '14': '功能性配件',
  '17': '侧导轨',
  '19': '机匣盖',
  '20': '战术灯',
  '31': '枪口下挂',
  '32': '弹鼓',
  '34': '拉机柄',
  '35': '上导轨',
  '38': '枪管下导轨',
  '40': '枪口附件',
  '44': '下挂榴弹',
  '45': '枪带环',
  '50': '通用导轨',
};
