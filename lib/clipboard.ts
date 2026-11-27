/**
 * 剪贴板工具（客户端）
 * @description 全站复制能力的唯一实现：优先异步 Clipboard API，非 HTTPS 环境或旧浏览器
 *              自动回退到临时 textarea + execCommand，避免改枪码页与录入页各写一份。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

/**
 * 复制文本到剪贴板
 * @param text - 待复制文本
 * @returns 是否复制成功（false 时调用方应提示用户手动选择）
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // 权限被拒或页面失焦时继续走兜底方案，不直接判定失败
      console.warn('[clipboard] Clipboard API 复制失败，回退 execCommand', error);
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    // 固定定位 + 透明：避免复制瞬间页面滚动或出现闪烁的选择框
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (error) {
    console.error('[clipboard] 复制文本失败', error);
    return false;
  }
}
