/**
 * 改枪码运行时数据库（data/builds.db）
 * @description 与 data/delta.db 彻底分离，两者生命周期不同：
 *              - delta.db 是 scripts/sync.mjs 的生成物，每次同步都会删库重建，只能当构建期快照；
 *              - builds.db 是人工录入的持久数据，sync 完全不碰它，页面运行时读写。
 *              首次打开且表为空时，从 constants/build-codes.json 播种一次，保证迁移后已有方案不丢；
 *              播种完成写 meta 标记，后续即使用户清空记录也不会被自动还原。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import SEED_FILE from '@/constants/build-codes.json';
import type { BuildCodeFile, BuildCodeRecord, BuildScenario } from '@/types/build-code';

/** 运行时数据库目录（与 delta.db 同目录，部署时该目录必须可写） */
const DATA_DIR = path.join(process.cwd(), 'data');

/** 运行时数据库文件路径 */
const DB_PATH = path.join(DATA_DIR, 'builds.db');

/** 播种完成标记（存在即不再从 JSON 导入，避免清空后被还原） */
const SEED_KEY = 'seeded_from_json';

/** meta 表里记录「最后整理时间」的键 */
const UPDATED_KEY = 'updatedAt';

/** builds 表行结构（tags 以 JSON 字符串存储） */
interface BuildRow {
  /** 唯一标识 */
  id: string;
  /** 方案名，可为空 */
  title: string | null;
  /** 关联枪名（写入时的完整枪名） */
  weapon: string;
  /** 场景标识 */
  scenario: string;
  /** 改装总价（哈夫币），可为空 */
  price: number | null;
  /** 改枪码本体 */
  code: string;
  /** 是否站内推荐（SQLite 无布尔类型，用 0/1） */
  featured: number;
  /** 录入日期 YYYY-MM-DD */
  created_at: string | null;
  /** 备注 */
  note: string | null;
  /** 标签数组的 JSON 字符串 */
  tags: string | null;
  /** 历史溯源字段（仅存档，不展示） */
  author: string | null;
  /** 历史溯源字段（仅存档，不展示） */
  source: string | null;
  /** 最后写入时间（ISO 字符串） */
  updated_at: string;
}

/** 数据库单例（可写连接，仅服务端使用） */
let _db: Database.Database | null = null;

/**
 * 把记录拍平成数据库行
 * @param record - 待写入记录
 * @param now - 写入时间（ISO 字符串）
 * @returns 行对象；必填字段缺失时返回 null
 */
function toRow(record: BuildCodeRecord, now: string): BuildRow | null {
  if (!record || typeof record.id !== 'string' || !record.id.trim()) return null;
  if (typeof record.weapon !== 'string' || !record.weapon.trim()) return null;
  if (typeof record.code !== 'string' || !record.code.trim()) return null;
  if (typeof record.scenario !== 'string' || !record.scenario.trim()) return null;

  return {
    id: record.id.trim(),
    title: record.title?.trim() || null,
    weapon: record.weapon.trim(),
    scenario: record.scenario,
    price:
      typeof record.price === 'number' && Number.isFinite(record.price) && record.price >= 0
        ? Math.round(record.price)
        : null,
    code: record.code.trim(),
    featured: record.featured === true ? 1 : 0,
    created_at: record.createdAt?.trim() || null,
    note: record.note?.trim() || null,
    tags: record.tags && record.tags.length > 0 ? JSON.stringify(record.tags) : null,
    author: record.author ?? null,
    source: record.source ?? null,
    updated_at: now,
  };
}

/**
 * 把数据库行还原为记录
 * @param row - builds 表行
 * @returns 记录对象；tags 解析失败按空数组处理
 */
function toRecord(row: BuildRow): BuildCodeRecord {
  let tags: string[] = [];
  if (row.tags) {
    try {
      const parsed: unknown = JSON.parse(row.tags);
      if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === 'string');
    } catch {
      // 手改库或历史脏数据：标签解析失败不影响方案本身
      tags = [];
    }
  }

  return {
    id: row.id,
    ...(row.title ? { title: row.title } : {}),
    weapon: row.weapon,
    scenario: row.scenario as BuildScenario,
    ...(row.price !== null ? { price: row.price } : {}),
    ...(row.author ? { author: row.author } : {}),
    ...(row.source ? { source: row.source } : {}),
    code: row.code,
    ...(row.featured === 1 ? { featured: true } : {}),
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.note ? { note: row.note } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };
}

/** 写入一条记录的预编译语句（懒创建，避免模块加载时就触达数据库） */
function insertStatement(instance: Database.Database): Database.Statement {
  return instance.prepare(
    `INSERT INTO builds (
       id, title, weapon, scenario, price, code, featured,
       created_at, note, tags, author, source, updated_at
     ) VALUES (
       @id, @title, @weapon, @scenario, @price, @code, @featured,
       @created_at, @note, @tags, @author, @source, @updated_at
     )`
  );
}

/**
 * 首次启动播种：把 constants/build-codes.json 里的方案导入空库
 * @param instance - 已建表的数据库连接
 * @description 用 INSERT OR IGNORE，重复执行也不会产生副本；完成后写 meta 标记
 */
function seedIfNeeded(instance: Database.Database): void {
  const seeded = instance.prepare('SELECT value FROM meta WHERE key = ?').get(SEED_KEY) as
    | { value: string }
    | undefined;
  if (seeded) return;

  const file = SEED_FILE as BuildCodeFile;
  const items = Array.isArray(file.items) ? file.items : [];
  const now = new Date().toISOString();
  const insert = insertStatement(instance);
  let imported = 0;

  instance.transaction(() => {
    for (const item of items) {
      const row = toRow(item, now);
      // 种子文件里字段不全的记录直接跳过，读取时还会再做一次归一校验
      if (!row) continue;
      const result = insert.run(row);
      imported += result.changes;
    }
    const upsertMeta = instance.prepare(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    upsertMeta.run(SEED_KEY, now);
    if (file.updatedAt) upsertMeta.run(UPDATED_KEY, file.updatedAt);
  })();

  if (imported > 0) {
    console.log(`[builds-db] 已从 constants/build-codes.json 播种 ${imported} 条改枪码`);
  }
}

/**
 * 获取可写数据库连接（懒加载单例）
 * @returns better-sqlite3 连接
 * @description 首次调用会自动建目录、建表并播种；WAL 模式让构建进程与运行时进程可并发读
 */
function db(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const instance = new Database(DB_PATH);
  // busy_timeout 必须先设：构建期多个 worker 同时首次建库时，切 WAL 会短暂争锁
  instance.pragma('busy_timeout = 10000');
  // WAL：读写并发不互相阻塞（构建进程与运行时进程可同时访问同一个库）
  instance.pragma('journal_mode = WAL');
  instance.exec(`
    CREATE TABLE IF NOT EXISTS builds (
      id TEXT PRIMARY KEY,
      title TEXT,
      weapon TEXT NOT NULL,
      scenario TEXT NOT NULL,
      price INTEGER,
      code TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      note TEXT,
      tags TEXT,
      author TEXT,
      source TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_builds_scenario ON builds(scenario);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  seedIfNeeded(instance);

  _db = instance;
  return _db;
}

/**
 * 读取全部方案记录
 * @returns 按写入顺序排列的记录数组
 */
export function listBuildRecords(): BuildCodeRecord[] {
  const rows = db().prepare('SELECT * FROM builds ORDER BY rowid').all() as BuildRow[];
  return rows.map(toRecord);
}

/**
 * 判断改枪码是否已收录
 * @param code - 改枪码本体
 * @returns 已存在返回 true
 */
export function buildCodeExists(code: string): boolean {
  const row = db().prepare('SELECT 1 AS hit FROM builds WHERE code = ? LIMIT 1').get(code.trim()) as
    | { hit: number }
    | undefined;
  return row !== undefined;
}

/**
 * 取当前记录 id 的第一个可用后缀
 * @param base - 基础 id（方案名 + 日期）
 * @returns 未被占用时返回 base，否则依次尝试 base-2、base-3…
 */
export function nextAvailableId(base: string): string {
  const statement = db().prepare('SELECT 1 AS hit FROM builds WHERE id = ? LIMIT 1');
  let candidate = base;
  let index = 2;
  while (statement.get(candidate) !== undefined) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

/**
 * 写入一条方案
 * @param record - 已完成校验与归一化的记录
 * @description 调用方需先保证 id 唯一；这里同时刷新 meta 里的整理时间
 */
export function insertBuildRecord(record: BuildCodeRecord): void {
  const instance = db();
  const now = new Date().toISOString();
  const row = toRow(record, now);
  if (!row) throw new Error('记录缺少必填字段，无法写入');

  instance.transaction(() => {
    insertStatement(instance).run(row);
    instance
      .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(UPDATED_KEY, row.updated_at);
  })();
}

/**
 * 读取「最后整理时间」
 * @returns meta 里记录的整理日期（YYYY-MM-DD）；没有写入记录时返回空串
 */
export function getBuildsUpdatedAt(): string {
  const row = db().prepare('SELECT value FROM meta WHERE key = ?').get(UPDATED_KEY) as
    | { value: string }
    | undefined;
  if (!row?.value) return '';
  // 写入时存的是 ISO 字符串，这里只取日期部分，与数据文件原有格式保持一致
  return row.value.slice(0, 10);
}
