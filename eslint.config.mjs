import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * ESLint 扁平配置
 * - 继承 Next.js core-web-vitals + TypeScript 规则集
 * - 图片使用 <img> 懒加载（本地缓存 + images.unoptimized），关闭 @next/next/no-img-element
 */
export default [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['.next/**', 'node_modules/**', 'scripts/**', 'public/**'],
  },
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
];
