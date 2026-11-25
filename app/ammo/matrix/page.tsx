import { getAllAmmo } from '@/lib/db';
import PageHero from '@/components/commons/PageHero';
import { IconChart, IconShield } from '@/components/commons/icons';

export const metadata = { title: '穿甲对照矩阵' };

const ARMOR_LEVELS = [1, 2, 3, 4, 5, 6];

interface MatrixCell {
  body_health_rate?: number;
  helmet_health_rate?: number;
  penetrates?: boolean;
}

// 常规弹判定规则（游戏基础机制）：
//   弹穿级高2级以上 → 100% 全额；高1级 → 75%；同级 → 50%（部分穿透）；低于 → 0（打不穿，只耗甲耐久）
// 注意：源数据中箭矢、龙息、双头弹及特效弹存在非标准衰减，单元格以数据集实测值为准，页面单独标注「特殊机制」
// 单元格配色走主题变量：暗色主题为高饱和亮色，浅色主题自动换成深色系保证白底可读
const CELL_STYLES = {
  ok: { icon: '✅', fg: 'var(--t2)', bg: 'var(--ok-bg)' },
  warn: { icon: '⚠️', fg: 'var(--t5)', bg: 'var(--warn-bg)' },
  bad: { icon: '❌', fg: 'var(--danger)', bg: 'var(--bad-bg)' },
} as const;

/**
 * 按肉体伤害保留比例归入三档：绿=全额穿透，黄=可穿但有衰减，红=无肉体伤害
 * 与图例四档（100/75/50/0）对应，仅 100% 显示绿色，避免 90% 等特殊值被误判为高效穿透
 * @param rate 保留比例（0~1）
 * @returns 判定档位
 */
function toneOf(rate: number): keyof typeof CELL_STYLES {
  if (rate <= 0) return 'bad';
  return rate >= 1 ? 'ok' : 'warn';
}

/**
 * 判定单元格展示档位与数值
 * @param cell 矩阵单元格
 * @returns 档位样式与百分比数值
 */
function judge(cell: MatrixCell | undefined) {
  // penetrates=false 时源数据仍可能带 body_health_rate（如 45-70 的 RN 对 1 级甲为 1），
  // 必须强制归零，否则会渲染出自相矛盾的「❌ 100%」
  const rate = cell?.penetrates === false ? 0 : Math.round((cell?.body_health_rate ?? 0) * 100);
  return { ...CELL_STYLES[toneOf(rate / 100)], rate };
}

/**
 * 判断弹药是否偏离「常规四档」穿透规则
 * 源数据中箭矢、龙息、特效弹等存在非标准衰减（如打高甲仍保留 10%~14%），
 * 需单独标记，避免用户把图例当作普适结论
 * @param matrix 穿透矩阵
 * @param penLevel 弹穿等级
 * @returns 是否特殊机制
 */
function isSpecialAmmo(matrix: Record<string, MatrixCell>, penLevel: number): boolean {
  return ARMOR_LEVELS.some((lv) => {
    const cell = matrix[String(lv)];
    if (!cell) return false;
    const gap = penLevel - lv;
    const expected = gap >= 2 ? 1 : gap === 1 ? 0.75 : gap === 0 ? 0.5 : 0;
    // 用 judge 的展示口径（penetrates=false 归零、百分比取整）与四档数值比对：
    // 口径统一后，RN 这类「源数据声明未穿透但残留伤害」的弹不会仅因原始字段矛盾被误标
    return judge(cell).rate !== expected * 100;
  });
}

const RARITY_LABEL: Record<string, string> = { 白: '白弹', 绿: '绿弹', 蓝: '蓝弹', 紫: '紫弹', 橙: '金弹', 金: '金弹', 红: '专属弹' };
const TIER_COLORS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];

// 图例中的穿透判定四档（与 judge() 阈值保持一致，改规则时两处同步）
const PEN_RULES: { label: string; rate: string; icon: string; tone: string }[] = [
  { label: '高 2 级以上', rate: '100%', icon: '✅', tone: 'text-t2' },
  { label: '高 1 级', rate: '75%', icon: '⚠️', tone: 'text-t5' },
  { label: '等级相同', rate: '50%', icon: '⚠️', tone: 'text-warn' },
  { label: '低于甲级', rate: '0%', icon: '❌', tone: 'text-danger' },
];

export default function MatrixPage() {
  // 排序（第一版）：全局按穿透等级从高到低，同等级按口径字母序
  const sorted = getAllAmmo()
    .map((a) => ({ ...a, m: JSON.parse(a.matrix || '{}') as Record<string, MatrixCell> }))
    .filter((a) => Object.keys(a.m).length > 0)
    .sort((x, y) => y.pen_level - x.pen_level || x.caliber.localeCompare(y.caliber));

  return (
    <div>
      <PageHero
        title="穿甲对照矩阵"
        icon={<IconChart className="w-6 h-6" />}
        subtitle={
          <>
            弹种 × 护甲等级速查：<b className="text-t2">✅ 高效穿透</b> ｜ <b className="text-warn">⚠️ 可穿但衰减明显</b> ｜{' '}
            <b className="text-danger">❌ 打不动</b>。单元格为命中身体时保留的生命值伤害比例。
          </>
        }
      />

      {/* 阅读图例：术语 → 判定机制 → 结论 三段式，段间用细分隔线，字号 13px 提升可读性 */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-4 mb-4 text-[13px] leading-[1.7] text-muted">
        {/* 术语说明：图标独立成列，保证三段文案左缘对齐、换行不参差 */}
        <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex gap-2">
            <span className="shrink-0" aria-hidden="true">🎯</span>
            <span>
              <b className="text-main font-semibold">穿N</b>：穿透等级（0–7），俗称「N 级弹」
            </span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0" aria-hidden="true">📦</span>
            <span>
              <b className="text-main font-semibold">品阶徽章</b>：白→绿→蓝→紫→金弹，与游戏内颜色一致
            </span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0" aria-hidden="true">🔴</span>
            <span>
              <b className="text-danger font-semibold">穿6/穿7</b>：狙击枪/重机枪专属弹（红标），不占常规品阶
            </span>
          </div>
        </div>

        {/* 判定机制：四档并列成卡片，配色与表格单元格一致，便于对照扫读 */}
        <div className="mt-3.5 pt-3.5 border-t border-edge">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
            <span aria-hidden="true">💡</span>
            <b className="text-main font-semibold">常规穿透机制</b>
            <span className="text-[12px] text-muted/80">按弹级与甲级级差判定，适用于多数常规弹</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            {PEN_RULES.map((rule) => (
              <div
                key={rule.label}
                className="flex items-center justify-between gap-2 rounded border border-edge/70 bg-bg/50 px-2.5 py-1.5"
              >
                <span className="num text-[12px]">{rule.label}</span>
                <span className={`num text-[12px] font-semibold ${rule.tone}`}>
                  {rule.icon} {rule.rate}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted/80 mt-1.5">
            数值为肉体伤害保留比例；打不穿时仅消耗护甲耐久。箭矢、龙息、双头弹及特效弹等特殊弹种不适用该表，
            标记「特殊」的行以单元格实测值为准。
          </p>
        </div>

        {/* 结论：左侧强调竖条 + 加粗标签，与正文区分层级 */}
        <div className="flex items-start gap-2 mt-3.5 pt-3.5 border-t border-edge">
          <span className="w-[3px] h-4 rounded bg-accent shrink-0 mt-[3px]" aria-hidden="true" />
          <p className="text-main">
            <b className="text-accent font-semibold mr-1.5">结论</b>
            常规弹想打得动，弹级必须 ≥ 甲级；同级开始掉血，但伤害只有一半。
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-edge rounded-lg [box-shadow:var(--panel-shadow)]">
        <table className="matrix-table w-full text-sm min-w-[780px]">
          <thead>
            <tr className="bg-panel">
              <th className="sticky left-0 bg-panel z-10 px-3 py-3 text-left min-w-[220px] text-[13px] tracking-wider text-muted">
                <span className="text-accent font-semibold">你的子弹</span>（按穿透等级排序）
              </th>
              {ARMOR_LEVELS.map((lv) => (
                <th key={lv} className="px-3 py-3">
                  <span className="num text-accent inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap">
                    <IconShield className="w-3.5 h-3.5" />
                    敌人{lv}级甲
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              // 品阶色（白绿蓝紫金）；穿 6/7 或「红」品阶为专属弹，用红色标识
              const isExclusive = a.pen_level >= 6 || a.rarity === '红';
              const tierColor = isExclusive ? 'var(--danger)' : TIER_COLORS[(a.tier ?? 1) - 1];
              const tierLabel = isExclusive ? '专属弹' : `${a.tier ?? '?'} 阶（${a.rarity ?? '—'}）`;
              // 穿透衰减偏离常规四档的弹药（箭矢/龙息/双头弹/特效弹等），单独标注
              const special = isSpecialAmmo(a.m, a.pen_level);
              return (
                <tr key={a.id} className="border-t border-edge hover:bg-panel/60">
                  <td
                    className="sticky left-0 bg-bg z-10 px-3 py-2.5"
                    style={{ boxShadow: `inset 3px 0 0 ${tierColor}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      {/* 穿透等级徽章 */}
                      <span
                        className="badge shrink-0"
                        style={{ color: tierColor, borderColor: tierColor, opacity: 0.9 }}
                        title={`穿透等级 ${a.pen_level} 级`}
                      >
                        穿{a.pen_level}
                      </span>
                      {/* 品阶文字徽章 */}
                      <span
                        className="badge shrink-0"
                        style={{ color: tierColor, borderColor: tierColor, opacity: 0.85 }}
                        title={`品阶：${tierLabel}`}
                      >
                        {isExclusive ? '专属' : RARITY_LABEL[a.rarity] ?? `${a.tier}阶`}
                      </span>
                      {special && (
                        <span
                          className="badge shrink-0"
                          style={{ color: 'var(--warn)', borderColor: 'var(--warn)', opacity: 0.9 }}
                          title="穿透衰减不遵循常规四档（箭矢/龙息/双头弹/特效弹等），以单元格实测值为准"
                        >
                          特殊
                        </span>
                      )}
                    </div>
                    <p className="num text-xs text-muted mt-1 ml-0.5">
                      {a.caliber} · {a.rarity ?? '—'}
                    </p>
                  </td>
                  {ARMOR_LEVELS.map((lv) => {
                    const j = judge(a.m[String(lv)]);
                    return (
                      <td
                        key={lv}
                        className="num text-center px-2 py-2"
                        style={{ background: j.bg, color: j.fg }}
                        title={j.rate > 0 ? `身体伤害保留 ${j.rate}%` : '无法穿透，仅消耗护甲耐久'}
                      >
                        {j.icon}
                        <span className="text-[10px] opacity-70 ml-0.5">{j.rate}%</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] leading-[1.7] text-muted mt-4">
        单元格数值取自社区数据集的实测穿透矩阵（非官方），为命中护甲覆盖部位时的肉体伤害保留比例；
        攻击四肢/面部等无防护部位始终为全额伤害。仅供参考，以游戏内实际表现为准。
      </p>
    </div>
  );
}
