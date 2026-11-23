import { getAllAmmo } from '@/lib/db';

export const metadata = { title: '穿甲对照矩阵' };

const ARMOR_LEVELS = [1, 2, 3, 4, 5, 6];

interface MatrixCell {
  body_health_rate?: number;
  helmet_health_rate?: number;
  penetrates?: boolean;
}

// 判定规则（官方机制，已交叉验证萌娘百科/官方教程/tierlist 实测数据三源一致）：
//   弹穿级高2级以上 → 100% 全额；高1级 → 75%；同级 → 50%（部分穿透）；低于 → 0（打不穿，只耗甲耐久）
const CELL_STYLES = {
  ok: { icon: '✅', fg: '#3fbf62', bg: 'rgba(63,191,98,0.10)' },
  warn: { icon: '⚠️', fg: '#f2b23e', bg: 'rgba(242,178,62,0.10)' },
  bad: { icon: '❌', fg: '#e5484d', bg: 'rgba(229,72,77,0.10)' },
} as const;

function judge(cell: MatrixCell | undefined) {
  const rate = Math.round((cell?.body_health_rate ?? 0) * 100);
  if (cell?.penetrates === false || rate === 0) return { ...CELL_STYLES.bad, rate };
  if (rate >= 90) return { ...CELL_STYLES.ok, rate };
  return { ...CELL_STYLES.warn, rate };
}

const RARITY_LABEL: Record<string, string> = { 白: '白弹', 绿: '绿弹', 蓝: '蓝弹', 紫: '紫弹', 橙: '金弹', 金: '金弹' };

export default function MatrixPage() {
  // 排序（第一版）：全局按穿透等级从高到低，同等级按口径字母序
  const sorted = getAllAmmo()
    .map((a) => ({ ...a, m: JSON.parse(a.matrix || '{}') as Record<string, MatrixCell> }))
    .filter((a) => Object.keys(a.m).length > 0)
    .sort((x, y) => y.pen_level - x.pen_level || x.caliber.localeCompare(y.caliber));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">穿甲对照矩阵</h1>
      <p className="text-sm text-muted mb-3">
        弹种 × 护甲等级：✅ 高效穿透 ｜ ⚠️ 可穿但衰减明显 ｜ ❌ 打不动。单元格内为命中身体时保留的生命值伤害比例。
      </p>

      {/* 阅读图例（置顶显眼位置） */}
      <div className="tac-panel px-4 py-3 mb-5 text-xs leading-relaxed">
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-muted">
          <span>
            <b className="text-main">穿N</b> = 穿透等级（0–7），玩家俗称「N级弹」
          </span>
          <span>
            <b className="text-main">品阶徽章</b>：白→绿→蓝→紫→金弹，与游戏内颜色一致
          </span>
          <span>
            <b className="text-danger">穿6/穿7</b> = 狙击枪/重机枪专属弹（红标），不适用常规品阶
          </span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-muted mt-2 pt-2 border-t border-edge">
          <span>
            <b className="text-main">真实穿透机制</b>：高 2 级以上 → ✅ 100% 全额 ｜ 高 1 级 → ⚠️ 75% ｜
            同级 → ⚠️ 50%（部分穿透）｜ 低于 → ❌ 0%（打不穿，只耗护甲耐久）
          </span>
          <span>
            <b className="text-accent">结论</b>：想打得动，弹级必须 ≥ 甲级；同级开始掉血但只有一半
          </span>
        </div>
      </div>

      <div className="overflow-x-auto border border-edge rounded shadow-lg shadow-black/20">
        <table className="matrix-table w-full text-sm min-w-[780px]">
          <thead>
            <tr className="bg-panel">
              <th className="sticky left-0 bg-panel z-10 px-3 py-2.5 text-left min-w-[210px] text-xs tracking-wider text-muted">
                <span className="text-accent">你的子弹</span>（按穿透等级排序）
              </th>
              {ARMOR_LEVELS.map((lv) => (
                <th key={lv} className="num px-3 py-2.5 text-accent">
                  敌人 {lv} 级甲
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              // 品阶色（白绿蓝紫金）；穿 6/7 为狙击/机枪专属弹，无常规品阶，用专属红标识
              const TIER_COLORS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];
              const tierColor =
                a.pen_level >= 6 ? 'var(--danger)' : TIER_COLORS[(a.tier ?? 1) - 1];
              const tierLabel =
                a.pen_level >= 6 ? '专属弹' : `${a.tier ?? '?'} 阶（${a.rarity ?? '—'}）`;
              return (
                <tr key={a.id} className="border-t border-edge hover:bg-panel/60">
                  <td className="sticky left-0 bg-bg z-10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* 品阶色标：与游戏内弹药品质色一致 */}
                      <span
                        className="w-1.5 h-7 rounded-sm shrink-0"
                        style={{ background: tierColor }}
                        title={tierLabel}
                      />
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
                        {a.pen_level >= 6 ? '专属' : RARITY_LABEL[a.rarity] ?? `${a.tier}阶`}
                      </span>
                    </div>
                    <p className="num text-xs text-muted mt-1 ml-3.5">
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
      <p className="text-[11px] text-muted mt-3">
        单元格数值为命中护甲覆盖部位时的肉体伤害保留比例（实测数据），
        攻击四肢/面部等无防护部位始终为全额伤害。仅供参考，以游戏内实际表现为准。
      </p>
    </div>
  );
}
