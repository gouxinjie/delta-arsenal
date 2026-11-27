/**
 * @component SelectField
 * @description 改枪码录入器的下拉控件：原生 select（全局已去掉浏览器箭头）+ 自绘 SVG 箭头，
 *              原生弹层展开时箭头不会闪；枪械 / 场景两处结构完全一致，抽出来避免几十行 JSX 复制
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

/** SelectField 组件入参 */
interface SelectFieldProps {
  /** 无障碍标签，同时作为 select 的 aria-label */
  label: string;
  /** 当前选中值 */
  value: string;
  /**
   * 值变更回调
   * @param value - 新选中的 option value
   */
  onChange: (value: string) => void;
  /** 选项列表，value / label 成对 */
  options: readonly { value: string; label: string }[];
  /**
   * 首项占位文案
   * @description 传入时在顶部插入一个 value="" 的空选项，用于「请选择…」
   * @default 不插入占位项
   */
  placeholder?: string;
  /**
   * 控件类名
   * @description 字号 / 边框 / 内边距由调用方传入，与同表单其他输入框共用一套样式；右侧留白由组件内部固定
   */
  className: string;
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: SelectFieldProps) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        // pr-9 固定留给右侧自绘箭头，避免长枪名压到图标
        className={`${className} pr-9`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}
