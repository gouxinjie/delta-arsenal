/**
 * 内容安全策略
 * 说明：App Router 的静态产物会内联 RSC 负载脚本（self.__next_f.push(...)）与首屏防闪主题脚本，
 * 无 per-request nonce 的静态页面无法启用严格 script-src，因此保留 'unsafe-inline'；
 * 但以下约束仍生效：禁止加载站外脚本 / 禁止被 iframe 嵌入 / 禁止 object 与 base 劫持 / 禁止表单外发。
 * 站点本身无用户输入、无动态 HTML 注入，XSS 面极小，该策略定位是收紧外链与点击劫持面。
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** 与 CSP 无冲突的基础安全头 */
const BASE_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 与 CSP frame-ancestors 'none' 保持一致，兼容不支持 CSP 的旧浏览器
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 图片全部为构建期下载到 public/ 的本地文件，无需 Next 图片优化服务
  images: { unoptimized: true },
  // 隐藏 X-Powered-By，减少指纹信息
  poweredByHeader: false,

  /**
   * 安全响应头（需 next start / 反代场景生效；纯静态托管需在 Nginx 侧配置同样的头）
   * dev 环境不注入 CSP：React Refresh 依赖 eval 与 ws 连接，注入会直接打挂热更新
   * @returns {Promise<{ source: string, headers: { key: string, value: string }[] }[]>} 响应头配置
   */
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/:path*',
        headers: isProd ? [...BASE_HEADERS, { key: 'Content-Security-Policy', value: CSP }] : BASE_HEADERS,
      },
    ];
  },
};

export default nextConfig;
