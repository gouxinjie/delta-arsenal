/**
 * 站点地图（构建期生成 sitemap.xml）
 * @description 收录静态路由与全部武器详情页；数据库缺失时降级为仅静态路由，不阻塞构建
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import type { MetadataRoute } from 'next';
import { getAllWeapons } from '@/lib/db';
import { SITE_URL } from '@/constants/site';

/** 静态页面路径与优先级（首页与核心矩阵最高） */
const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: '', priority: 1 },
  { path: '/ammo/matrix', priority: 0.9 },
  { path: '/ammo', priority: 0.8 },
  { path: '/weapons', priority: 0.8 },
  { path: '/builds', priority: 0.8 },
  { path: '/about', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, '');

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    changeFrequency: 'weekly',
    priority: route.priority,
  }));

  let weaponEntries: MetadataRoute.Sitemap = [];
  try {
    weaponEntries = getAllWeapons().map((w) => ({
      url: `${base}/weapons/${w.id}`,
      changeFrequency: 'monthly',
      priority: 0.5,
    }));
  } catch (err) {
    console.error('[sitemap] 武器列表读取失败，仅输出静态路由', err);
  }

  return [...staticEntries, ...weaponEntries];
}
