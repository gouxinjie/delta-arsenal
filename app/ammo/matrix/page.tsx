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

// 判定规则（官方机制，已交叉验证萌娘百科/官方教程/tierlist 实测数据三源一致）：
//   弹穿级高2级以上 → 100% 全额；高1级 → 75%；同级 → 50%（部分穿透）；低于 → 0（打不穿，只耗甲耐久）
// 单元格配色走主题变量：暗色主题为高饱和亮色，浅色主题自动换成深色系保证白底可读
const CELL_STYLES = {
  ok: { icon: '✅', fg: 'var(--t2)', bg: 'var(--ok-bg)' },
  warn: { icon: '⚠️', fg: 'var(--t5)', bg: 'var(--warn-bg)' },
  bad: { icon: '❌', fg: 'var(--danger)', bg: 'var(--bad-bg)' },
} as const;

function judge(cell: MatrixCell | undefined) {
  const rate = Math.round((cell?.body_health_rate ?? 0) * 100);
  if (cell?.penetrates === false || rate === 0) return { ...CELL_STYLES.bad, rate };
  if (rate >= 90) return { ...CELL_STYLES.ok, rate };
  return { ...CELL_STYLES.warn, rate };
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
            <b className="text-main font-semibold">真实穿透机制</b>
            <span className="text-[12px] text-muted/80">按弹级与甲级的级差判定</span>
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
            数值为肉体伤害保留比例；打不穿时仅消耗护甲耐久。
          </p>
        </div>

        {/* 结论：左侧强调竖条 + 加粗标签，与正文区分层级 */}
        <div className="flex items-start gap-2 mt-3.5 pt-3.5 border-t border-edge">
          <span className="w-[3px] h-4 rounded bg-accent shrink-0 mt-[3px]" aria-hidden="true" />
          <p className="text-main">
            <b className="text-accent font-semibold mr-1.5">结论</b>
            想打得动，弹级必须 ≥ 甲级；同级开始掉血，但伤害只有一半。
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
        单元格数值为命中护甲覆盖部位时的肉体伤害保留比例（实测数据），
        攻击四肢/面部等无防护部位始终为全额伤害。仅供参考，以游戏内实际表现为准。
      </p>
    </div>
  );
}
