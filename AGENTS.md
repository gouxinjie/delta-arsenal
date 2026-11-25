# AGENTS.md — 三角洲军械库（Delta Arsenal）

> 本文件供 AI Agent（Claude Code / WorkBuddy / Cursor 等）在本仓库工作时阅读。
> 产品需求详见 `PRD.md`，本文件只讲工程事实与约定。

## 项目是什么

《三角洲行动》玩家工具站：弹药数据库 + 武器图鉴 + 穿甲对照矩阵。
非官方粉丝站。站名：三角洲军械库（Delta Arsenal），域名已备案。

## 技术栈

- Next.js 15（App Router）+ TypeScript + Tailwind CSS，构建期 SSG 直读 SQLite
- 数据库：SQLite（better-sqlite3），文件 `data/delta.db`，**入库真源**
- 数据同步：`scripts/sync.mjs`（Node ≥ 22，无框架依赖；better-sqlite3 按 Node 22 ABI 编译）
- 部署：阿里云 ECS（Nginx 反代 :3000 + PM2），页面全静态

## 常用命令

```bash
npm run sync     # 拉取三源 → 重建 data/delta.db（有阈值校验，低于阈值不写入）
npm run dev      # 本地开发（待 M2 接入 Next.js 后可用）
npm run build    # SSG 构建
```

## 数据链路（重要）

三源互为冗余，全部在**构建期**消费，运行时零外部依赖：

| 数据 | 主源 | 说明 |
|------|------|------|
| 弹药全字段（118 条） | `AVA-2568/delta-gun-tierlist@main` 的 `data/game/ammo.json`（经 jsDelivr） | `ammo_item_id` 与枪械表 objectID 直接对应；含 `penetration_matrix`（每级甲穿透判定），矩阵页数据现成 |
| 枪械面板 + 官方图（47 把） | `jiansenc/DeltaForceData@main` 的 `public/json/gun/gunRifle.json`（经 jsDelivr） | `gunDetail.ammo[].objectID` 用于建立弹药↔武器关联 |
| 武器补充（68 把） | npm 包 `delta-force-core`（本地，无网络） | 按名称补 DFD 缺失的枪，面板字段略少 |
| 图片 | `playerhub.df.qq.com`（腾讯 CDN） | **构建期下载到 `/public/img/`，禁止热链** |

- `tmp/*_cache.json` 是拉取失败的本地回退缓存；**sync 失败优先检查缓存新鲜度**
- 弹药↔武器关联 = 官方 `gunDetail.ammo` ∪ 按口径补齐（游戏内弹种由口径决定）；两家源口径写法不同（`.300 Blackout` / `12 Gauge` / `7.62x54`），sync 内置 `CALIBER_CANON` 归一表，**新增口径必须先补表**，否则关联会静默丢失
- `ammo.objectID` 编码规则：`371XYY000001`，`371X`≈口径组，X 位含品阶/穿透信息
- 弹药品阶映射：白=1 绿=2 蓝=3 紫=4 橙/金=5

## 目录结构

```
app/                  Next.js 路由
components/commons/   公共组件（每组件独立文件夹 + index.tsx）
lib/                  数据库读取层（db.ts，全部带 JSDoc）
scripts/              sync.mjs 等脚本
data/                 delta.db（入库，勿手改；重建走 npm/pnpm run sync）
public/img/           构建期下载的武器图片
public/search-index.json  前端搜索索引（sync 生成）
tmp/                  抓取缓存（gitignore）
PRD.md                产品需求文档（v0.3 定稿）
```

## 约定与红线

1. **不要手改 `data/delta.db`**——它是生成物，改了会被下次 sync 覆盖
2. 主题色 token 见 PRD 2.2（底 `#12141A` / 面板 `#1B1F29` / 强调橙 `#FF9E2C`），写组件时用 CSS 变量，不要散落硬编码
3. 数字/口径一律等宽字体
4. 页面必须带数据版本标注（读 `meta` 表）与「非官方」声明
5. 穿甲矩阵三色判定规则以 PRD 4.1 为准，页面需标注「仅供参考，以游戏内实测为准」
6. 不做：用户系统、评论、交易行实时价格（API 已停运）、地图点位
7. 提交前清理 console.log 与未使用 import（用户习惯）

---

## 前端开发规范（团队约束，所有代码必须遵循）

> 作者规范由 gouxinjie 制定，适用于本仓库及团队所有前端项目。
> 本仓库为 React/Next.js，Vue 相关条款仅在 Vue 项目适用。
> **本仓库适配说明**（已与负责人确认）：样式用 Tailwind CSS（项目既定技术栈，Tailwind 类即语义化样式）；包管理器已迁移至 **pnpm**（见 package.json `packageManager` 与 `pnpm-lock.yaml`）。其余条款一律生效。

### 一、代码规范
1. **类型安全**：必须用 TypeScript，禁止 `any`；所有函数/变量/API 响应必须定义类型。
2. **代码风格**：遵循 ESLint；**禁止 `eslint-disable`**。React 用函数组件 + Hooks，禁用 class component。
3. **路径规范**：禁止 `../../` 相对路径，统一 `@/` 别名。
4. **错误处理**：接口/工具统一返回 `{ success, code, message, data }`；必须处理 loading / error，不假设接口结构。
5. **代码清理**：移除未使用变量、函数、import、样式。

### 二、样式规范
- 优先 SCSS（本仓库为 Tailwind，等价满足）；禁止污染全局样式；注释须含文件/样式/关键布局说明；命名语义化。

### 三、组件规范
- 公共组件放 `components/commons/组件名/`，每个组件独立文件夹。
- 每个组件文件头部必须有注释：`@component / @description / @author gouxinjie / @created / @updated`。
- Props/Interface 必须写注释（含义、类型、默认值、是否必填）。

### 四、目录结构
- 遵循 `components/`（commons + business）、`pages/`、`utils/`、`styles/`、`types/`、`constants/`、`hooks/`、`assets/` 分层。

### 五、依赖管理
- 统一使用 pnpm（本仓库当前为 npm，迁移前不强制）。

### 六、接口/函数封装
- 所有工具函数、API 封装函数必须加 JSDoc 注释（功能、参数、返回值、异常）。

### 七、数据库规范
- 必须参数化查询、中文注释、禁止拼接 SQL。

### 八、安全规范
- 敏感信息用环境变量，禁止硬编码；SQL 参数化；XSS 转义。

### 九、AI 行为约束（核心）
1. 不编造接口；2. 不假设数据库结构；3. 不跳过鉴权；4. 不省略错误处理；5. 不生成未使用代码；6. 不修改无关文件；7. 需求不明确必须询问。

### 十、开发工作流（必须执行）
- 新功能：分析需求 → 确认接口 → 定义类型 → 组件结构 → 样式 → 接入 API → 错误处理 → 自检 AGENTS.md。
- 改代码：先读原代码、理解逻辑、给方案，再改（禁止直接改）。
- Debug：分析报错 → 定位 → 找根因 → 给修复方案。

### 十一、输出规范（强制）
- 输出完整代码（含 import、代码块），禁止伪代码，必须有中文注释，修改代码必须说明变更点。

### 十二、自检机制（输出前必须检查）
TypeScript 无 any / 有错误处理 / 目录结构 / 无未使用代码 / ESLint / 中文注释 / 用 `@/` 而非 `../../` / **@author 为 gouxinjie**。

### 十三、性能规范
- 列表必须用 key；大组件拆分；useMemo/useCallback（Vue 用 computed）优化；路由懒加载；图片懒加载/压缩。

### 十四、状态管理
- 小状态用组件内状态；跨组件：React 用 Zustand，Vue 用 Pinia（Setup Store）。禁止滥用全局状态。

### 十五、日志规范
- 错误必须记日志；API 失败打印错误；不输出敏感信息；开发允许 console，生产移除。

### 十六、MCP/工具调用规范
- 优先用工具取数；不伪造数据；工具失败兜底；不确定询问用户。

### 十七、终极原则
> 优先代码质量，其次正确性，最后才是开发速度。
