/**
 * 改枪码模块类型定义（数据文件记录 / 构建期展示模型）
 * @description 改枪码是人工整理的内容数据，不来自社区数据源，也不进 SQLite；
 *              真源为 constants/build-codes.json，由 lib/build-codes 在构建期解析。
 *              面板参数统一由武器图鉴承载，改枪码只负责方案本身（价格 / 标签 / 备注 / 码）。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

/** 改枪码适用场景（游戏内两大玩法模式；当前先上线烽火地带） */
export type BuildScenario = 'firestorm' | 'allout';

/**
 * 数据文件单条记录（constants/build-codes.json 的 items 元素，人工维护）
 * @description 除 id / weapon / scenario / code 外均可省略
 */
export interface BuildCodeRecord {
  /** 唯一标识（React key / 分享锚点），同一把枪的多套方案不可重复 */
  id: string;
  /** 方案名（如「全能 AN94」）；缺省时卡片回退为武器名 */
  title?: string;
  /** 关联武器：填数据库枪名或玩家口语别名（如「腾龙突击步枪」「AK47」） */
  weapon: string;
  /** 适用场景 */
  scenario: BuildScenario;
  /** 改装总价（游戏内哈夫币）；null / 缺省表示未标注，排序时沉底 */
  price?: number | null;
  /**
   * 历史溯源字段：早期记录保留了整理者昵称
   * @deprecated 卡片与录入器已不再展示 / 写入，仅作为数据文件里的存档字段原样传递
   */
  author?: string;
  /**
   * 历史溯源字段：早期记录保留了原出处链接
   * @deprecated 卡片与录入器已不再展示 / 写入，仅作为数据文件里的存档字段原样传递
   */
  source?: string;
  /** 改枪码本体，格式：武器名-场景-编码（如 腾龙突击步枪-烽火地带-6GFL1T405DJM2O0M5J12S） */
  code: string;
  /** 是否站内推荐（卡片标题前的星标） */
  featured?: boolean;
  /** 录入日期 YYYY-MM-DD，「最新发布」排序依据 */
  createdAt?: string;
  /** 手感 / 适用场景备注，缺省不展示 */
  note?: string;
  /** 玩法关键词标签（如「以小博大」「后坐力稳」），缺省不展示标签行 */
  tags?: string[];
}

/** 数据文件整体结构 */
export interface BuildCodeFile {
  /** 数据最后整理日期（YYYY-MM-DD），页面用于标注内容新鲜度 */
  updatedAt?: string;
  /** 全部方案 */
  items: BuildCodeRecord[];
}

/** 方案关联的武器摘要（构建期从 weapons 表取得） */
export interface BuildCodeWeapon {
  /** 武器 objectID（用于跳转图鉴详情） */
  id: string;
  /** 数据库中的完整枪名 */
  name: string;
  /** 类别（步枪 / 冲锋枪…） */
  category: string;
  /** 口径 */
  caliber: string;
  /** 本地图片路径 */
  image: string;
}

/** 录入页可选的武器项（客户端表单直接可用，不含面板数值） */
export interface BuildWeaponOption {
  /** 武器 objectID */
  id: string;
  /** 完整枪名 */
  name: string;
  /** 简称（去掉官方型号后缀，改枪码前缀一般用它） */
  shortName: string;
  /** 类别 */
  category: string;
  /** 口径 */
  caliber: string;
  /** 本地图片路径 */
  image: string;
}

/** 卡片展示模型（武器与图片已在构建期解析补齐） */
export interface BuildCodeView {
  /** 唯一标识 */
  id: string;
  /** 卡片标题（记录有 title 用 title，否则用武器简称） */
  title: string;
  /** 适用场景 */
  scenario: BuildScenario;
  /** 关联武器；数据库未收录该枪时为 null（卡片退化为纯文字） */
  weapon: BuildCodeWeapon | null;
  /** 武器展示名（未匹配时回退为记录里的原始写法） */
  weaponName: string;
  /** 改装总价，null 表示未标注 */
  price: number | null;
  /** 改枪码本体 */
  code: string;
  /** 是否站内推荐 */
  featured: boolean;
  /** 录入日期（YYYY-MM-DD），缺省为空串 */
  createdAt: string;
  /** 备注，缺省为空串 */
  note: string;
  /** 归一后的标签数组，无标签时为空数组 */
  tags: string[];
}
