/**
 * @page BuildCodeNew
 * @description 改枪码录入页：粘贴改枪码自动识别枪械 / 场景，生成标准记录 JSON，
 *              草稿存本机浏览器并可导出合并后的 constants/build-codes.json
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

import BuildCodeEditor from '@/components/commons/BuildCodeEditor';
import PageHero from '@/components/commons/PageHero';
import { IconWrench } from '@/components/commons/icons';
import { BUILD_SCENARIOS } from '@/constants/build-code';
import { getBuildCodeRecords, getBuildWeaponOptions } from '@/lib/build-codes';
import { formatTodayDate } from '@/lib/format';

export const metadata = {
  title: '录入改枪码',
  description: '录入三角洲行动改枪码：自动识别枪械与场景，生成可直接写入 build-codes.json 的方案记录。',
};

export default function NewBuildCodePage() {
  // 武器下拉与原厂面板在构建期一次性取好，客户端表单不再请求接口
  const weapons = getBuildWeaponOptions();
  // 已有记录用于导出时合并，避免覆盖线上数据
  const existing = getBuildCodeRecords();

  // 默认录入日期：服务端按本地时区生成，避免客户端时区差异导致水合前后值不同
  const defaultDate = formatTodayDate();

  return (
    <div>
      <PageHero
        title="录入改枪码"
        icon={<IconWrench className="h-6 w-6" />}
        subtitle={
          <>
            粘贴游戏内复制的改枪码即可自动识别枪械与场景，补齐价格、方案标签与备注后生成标准 JSON。
            当前站点为静态站，草稿保存在本机浏览器，导出后覆盖
            <code className="num mx-1 rounded border border-edge bg-panel-hi px-1.5 py-0.5 text-[11px] text-main">
              constants/build-codes.json
            </code>
            并重新构建即可上线。
            <span className="mt-1 block text-[11px] text-muted">
              已收录 {existing.length} 条方案 · 场景支持 {BUILD_SCENARIOS.map((item) => item.label).join(' / ')} ·
              草稿不会上传到服务器
            </span>
          </>
        }
      />
      <BuildCodeEditor weapons={weapons} existing={existing} defaultDate={defaultDate} />
    </div>
  );
}
