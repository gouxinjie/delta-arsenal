/**
 * @page BuildCodeNew
 * @description 改枪码录入页：粘贴改枪码自动识别枪械 / 场景，填完即可写入站点数据库（data/builds.db）；
 *              也支持先存本机草稿、稍后导出 JSON 备份
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27（改为动态渲染，读取最新入库结果）
 */

import BuildCodeEditor from '@/components/commons/BuildCodeEditor';
import PageHero from '@/components/commons/PageHero';
import { IconWrench } from '@/components/commons/icons';
import { BUILD_SCENARIOS } from '@/constants/build-code';
import { getBuildCodeRecords, getBuildWeaponOptions } from '@/lib/build-codes';
import { formatTodayDate } from '@/lib/format';

export const metadata = {
  title: '录入改枪码',
  description: '录入三角洲行动改枪码：自动识别枪械与场景，填写口令即可入库，方案立即出现在改枪码列表里。',
};

/**
 * 渲染模式
 * @description 录入页要拿到最新入库结果（去重提示与概览都依赖），
 *              强制动态渲染，避免构建期把旧数据固化成 HTML
 */
export const dynamic = 'force-dynamic';

export default function NewBuildCodePage() {
  // 武器下拉随每次请求读取（页面为动态渲染），客户端表单不再单独请求接口
  const weapons = getBuildWeaponOptions();
  // 已有记录用于导出合并与草稿 id 去重，避免覆盖线上数据
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
            粘贴游戏内复制的改枪码即可自动识别枪械与场景，补齐价格、方案标签与备注后点「直接入库」，
            方案会写入站点数据库并立即出现在列表里。
            <span className="mt-1 block text-[11px] text-muted">
              已收录 {existing.length} 条方案 · 场景支持 {BUILD_SCENARIOS.map((item) => item.label).join(' / ')} ·
              入库需要录入口令，没有口令时可先存为本地草稿并导出 JSON 备份
            </span>
          </>
        }
      />
      <BuildCodeEditor weapons={weapons} existing={existing} defaultDate={defaultDate} />
    </div>
  );
}
