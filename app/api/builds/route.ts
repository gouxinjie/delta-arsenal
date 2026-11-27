/**
 * @route POST /api/builds
 * @description 改枪码写入接口：口令鉴权 → 字段归一 → 改枪码查重 → 写入 data/builds.db → 失效页面缓存。
 *              站点没有用户系统，写入权限完全由 BUILDS_WRITE_TOKEN 环境变量控制；
 *              未配置该变量时一律拒绝（fail closed），避免误开放成任何人都能灌数据的接口。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { normalizeRecord } from '@/lib/build-codes';
import { buildCodeExists, insertBuildRecord, nextAvailableId } from '@/lib/builds-db';
import type { BuildCodeRecord, BuildCodeWriteResult } from '@/types/build-code';

/** 请求体上限：一条方案几百字节，8KB 足够拦住异常大包 */
const MAX_BODY_BYTES = 8 * 1024;

/**
 * 校验写入口令
 * @param request - 原始请求
 * @returns 口令正确返回 true；未配置口令或口令为空一律 false
 * @description 两侧先做 sha256 再定长比较，避免通过响应耗时与长度差异探测口令
 */
function isAuthorized(request: Request): boolean {
  const expected = process.env.BUILDS_WRITE_TOKEN;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return false;

  const given = createHash('sha256').update(token).digest();
  const want = createHash('sha256').update(expected).digest();
  return timingSafeEqual(given, want);
}

/**
 * 构造统一响应
 * @param body - 响应体
 * @param status - HTTP 状态码
 * @returns 带 no-store 的 JSON 响应
 */
function json(body: BuildCodeWriteResult, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * 写入一条改枪码方案
 * @param request - POST 请求，body 为 BuildCodeRecord，header 需带 Authorization: Bearer <口令>
 * @returns 统一响应体；成功时 data.id 为最终写入的记录 id
 */
export async function POST(request: Request): Promise<Response> {
  if (!process.env.BUILDS_WRITE_TOKEN) {
    return json(
      { success: false, code: 503, message: '服务端未配置 BUILDS_WRITE_TOKEN，已拒绝写入' },
      503
    );
  }
  if (!isAuthorized(request)) {
    return json({ success: false, code: 401, message: '写入口令不正确' }, 401);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ success: false, code: 413, message: '请求体过大' }, 413);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, code: 400, message: '请求体不是合法 JSON' }, 400);
  }

  // 与读取路径共用同一个归一函数：脏字段在这里被拦下，不会写进库
  const record = normalizeRecord(payload as BuildCodeRecord);
  if (!record) {
    return json(
      { success: false, code: 400, message: '记录不完整：枪械、场景、改枪码缺一不可' },
      400
    );
  }

  try {
    // 同一串改枪码只保留一条，避免连点两次产生重复方案
    if (buildCodeExists(record.code)) {
      return json({ success: false, code: 409, message: '这套改枪码已收录，无需重复录入' }, 409);
    }

    // 方案名相同的不同枪械可能撞 id，这里自动追加 -2 / -3
    const id = nextAvailableId(record.id);
    insertBuildRecord({ ...record, id });

    // ISR 缓存按需失效：列表页与首页概览立刻重新渲染，不需要重新构建
    revalidatePath('/builds');
    revalidatePath('/');

    return json({ success: true, code: 0, message: '已入库', data: { id } }, 200);
  } catch (error) {
    console.error('[api/builds] 写入失败', error);
    return json({ success: false, code: 500, message: '写入失败，请稍后重试' }, 500);
  }
}
