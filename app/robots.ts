/**
 * robots.txt（构建期生成）
 * @description 全站允许抓取，并声明 sitemap 地址
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/site';

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
  };
}
