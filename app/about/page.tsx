export const metadata = { title: '关于' };

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-6 text-sm leading-relaxed">
      <section>
        <h1 className="text-xl font-bold mb-3">关于本站</h1>
        <p className="text-muted">
          三角洲军械库（Delta Arsenal）是玩家自制的《三角洲行动》非官方数据速查站，
          提供<strong className="text-main">弹药穿透/伤害数据、武器面板图鉴、穿甲对照矩阵</strong>三个核心功能。
          目标很简单：出局之前，查完再走。
        </p>
      </section>
      <section>
        <h2 className="font-bold mb-2">数据来源</h2>
        <ul className="text-muted list-disc pl-5 space-y-1">
          <li>弹药全字段：社区实测整理数据集（delta-gun-tierlist 项目每日校准）</li>
          <li>武器面板与图片：官方小程序数据镜像（DeltaForceData）</li>
          <li>武器补充数据：开源结构化数据集 delta-force-core</li>
        </ul>
        <p className="text-muted mt-2">
          每次赛季版本更新后 72 小时内完成数据同步；页脚展示当前数据版本与更新时间。
        </p>
      </section>
      <section>
        <h2 className="font-bold mb-2">穿甲矩阵判定口径</h2>
        <p className="text-muted">
          单元格为该弹种命中护甲覆盖部位时的肉体伤害保留比例，采用游戏实测数据（已与官方教程及社区机制条目交叉验证）：
          <br />
          弹穿级高于甲级 2 级以上 → 100% 全额；高 1 级 → 75%；同级 → 50%（部分穿透，护甲与肉体同步掉血）；
          低于护甲等级 → 无法穿透，0 肉伤，仅消耗护甲耐久。
          <br />
          攻击四肢/面部等无防护部位始终为全额伤害。仅供参考，以游戏内实际表现为准。
        </p>
      </section>
      <section>
        <h2 className="font-bold mb-2">免责声明</h2>
        <p className="text-muted">
          本站为非官方粉丝站点，与腾讯 / 琳琅天上无关。《三角洲行动》名称、游戏图片及相关素材版权归原权利方所有，
          本站仅在非商业资讯展示范围内合理使用，如收到权利方通知将立即下架相关内容。
          站内数据均为社区整理，可能随版本变动出现滞后或误差。
        </p>
      </section>
    </div>
  );
}
