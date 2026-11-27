/**
 * @component BuildCodeEntry
 * @description 改枪码录入入口：页面顶部主按钮 + 右侧抽屉内的录入器。
 *              抽屉里填完口令可直接入库（写入成功后列表自动刷新），用户不必离开当前页；
 *              独立页 /builds/new 仍保留，供直接访问。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */
'use client';

import { useCallback, useState } from 'react';
import BuildCodeEditor from '@/components/commons/BuildCodeEditor';
import Drawer from '@/components/commons/Drawer';
import { IconWrench } from '@/components/commons/icons';
import type { BuildCodeRecord, BuildWeaponOption } from '@/types/build-code';

/** BuildCodeEntry 组件入参 */
interface BuildCodeEntryProps {
  /** 武器下拉数据（构建期取好，客户端不再请求接口） */
  weapons: BuildWeaponOption[];
  /** 数据文件已有记录，导出时与本地草稿合并 */
  existing: BuildCodeRecord[];
  /** 默认录入日期（服务端传入，避免客户端时区导致水合前后不一致） */
  defaultDate: string;
  /** 追加样式类（页头操作区按需微调宽度时使用） */
  className?: string;
}

export default function BuildCodeEntry({
  weapons,
  existing,
  defaultDate,
  className = '',
}: BuildCodeEntryProps) {
  const [open, setOpen] = useState(false);

  /** 关闭抽屉 */
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[12px] font-semibold text-[color:var(--on-accent)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:w-auto sm:text-[13px] ${className}`}
      >
        <IconWrench className="h-4 w-4" />
        录入改枪码
      </button>

      {/* 录入器是双栏长表单，抽屉给到接近满宽的尺寸；窄屏退化为整屏 */}
      <Drawer
        open={open}
        onClose={handleClose}
        ariaLabel="录入改枪码"
        overlay="soft"
        panelClassName="sm:w-[min(1120px,94vw)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge/60 py-3 pl-4 pr-14">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-accent">
            <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
            录入改枪码
          </h2>
          <p className="hidden text-[11px] text-muted sm:block">
            填好口令点「直接入库」，方案会立刻出现在列表里
          </p>
        </div>

        {/* 抽屉高度固定，内容区独立滚动，长表单不会把抽屉撑出视口 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <BuildCodeEditor
            weapons={weapons}
            existing={existing}
            defaultDate={defaultDate}
            embedded
          />
        </div>
      </Drawer>
    </>
  );
}
