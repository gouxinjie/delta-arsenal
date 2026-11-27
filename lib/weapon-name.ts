/**
 * 枪名归一工具（纯函数，服务端构建与客户端录入页共用）
 * @description 改枪码前缀、数据库枪名、玩家口语写法各不相同，匹配前必须走同一套归一逻辑：
 *              去掉官方型号括号后缀、连字符与空白并转小写（「腾龙突击步枪（QBZ-191）」↔「腾龙突击步枪」、
 *              「FS12」↔「FS-12」）。放在独立模块是为了让客户端也能引用，而不牵连构建期的数据库代码。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

/**
 * 枪名归一：去掉括号后缀、连字符与空白并转小写
 * @param name - 原始枪名
 * @returns 归一后的比较键
 */
export function normalizeWeaponName(name: string): string {
  return name
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s\-－‐‑–—]/g, '')
    .toLowerCase();
}

/**
 * 取武器简称：去掉官方型号后缀（括号内容）
 * @param name - 数据库枪名或记录中的枪名
 * @returns 简称，如「腾龙突击步枪（QBZ-191）」→「腾龙突击步枪」
 */
export function shortWeaponName(name: string): string {
  return name.replace(/[（(][^）)]*[）)]/g, '').trim() || name;
}
