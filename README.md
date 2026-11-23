# 三角洲军械库（Delta Arsenal）

《三角洲行动》非官方玩家工具站：弹药数据库 + 武器图鉴 + 穿甲对照矩阵。

> 本站为非官方粉丝站，与《三角洲行动》官方无关。所有数据仅供玩家参考，请以游戏内实测为准。

## 功能

- **穿甲对照矩阵**：弹种 × 护甲等级速查，三色判定，出装前快速确认带几级弹。
- **弹药库**：全口径弹药数据，含穿透等级、伤害倍率、适用枪械。
- **武器图鉴**：收录枪械面板、口径、可改装槽位与官方图。
- **搜索索引**：前端全文搜索（`public/search-index.json`）。

## 技术栈

- Next.js 15（App Router）+ TypeScript + Tailwind CSS
- SQLite（better-sqlite3），构建期 SSG 直读，运行时零外部依赖
- 部署：阿里云 ECS（Nginx 反代 :3000 + PM2），页面全静态

## 快速开始

```bash
# 1. 安装依赖（使用 pnpm）
pnpm install

# 2. 拉取三源数据 → 重建 data/delta.db（有阈值校验，低于阈值不写入）
pnpm run sync

# 3. 本地开发（端口 3800）
pnpm run dev

# 4. 构建 SSG
pnpm run build
```

> 环境要求：Node ≥ 20（`scripts/sync.mjs` 无框架依赖，可直接运行）。

## 数据链路

三源互为冗余，全部在**构建期**消费：

| 数据 | 主源 | 说明 |
|------|------|------|
| 弹药全字段 | `AVA-2568/delta-gun-tierlist@main`（jsDelivr） | 含 `penetration_matrix`，矩阵页数据现成 |
| 枪械面板 + 官方图 | `jiansenc/DeltaForceData@main`（jsDelivr） | `ammo[].objectID` 建立弹药 ↔ 武器关联 |
| 武器补充 | npm 包 `delta-force-core`（本地） | 按名称补 DFD 缺失枪械 |
| 图片 | `playerhub.df.qq.com`（腾讯 CDN） | 构建期下载至 `/public/img/`，禁止热链 |

- `data/delta.db` 为入库真源，**不要手改**，重建走 `pnpm run sync`。
- `tmp/*_cache.json` 为拉取失败时的本地回退缓存，sync 失败优先检查缓存新鲜度。

## 目录结构

```
app/                  Next.js 路由
components/commons/   公共组件（每组件独立文件夹 + index.tsx）
lib/                  数据库读取层（db.ts）
scripts/              sync.mjs 等脚本
data/                 delta.db（入库，生成物）
public/img/           构建期下载的武器图片
public/search-index.json  前端搜索索引（sync 生成）
tmp/                  抓取缓存（gitignore）
```

## 约定

- 主题色 token：底 `#12141A` / 面板 `#1B1F29` / 强调橙 `#FF9E2C`，组件统一走 CSS 变量。
- 数字、口径一律等宽字体。
- 页面必须带数据版本标注与「非官方」声明。
- 穿甲矩阵三色判定以 PRD 4.1 为准，页面标注「仅供参考，以游戏内实测为准」。

## 免责声明

本项目仅用于学习与玩家交流，所有游戏数据、图片版权归原版权方所有。若有不妥，请联系处理。
