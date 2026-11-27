/**
 * @component Icons
 * @description 全站通用内联 SVG 图标库（填充 currentColor，尺寸由 className 控制），避免引入图标依赖
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-25
 */

/** 图标通用入参 */
interface IconProps {
  /** 尺寸/颜色等样式类，如 w-4 h-4 */
  className?: string;
}

/** 搜索（放大镜） */
export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** 盾牌（护甲等级） */
export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l8 3v6.2c0 4.9-3.2 8.7-8 10.8-4.8-2.1-8-5.9-8-10.8V5z" />
    </svg>
  );
}

/** 图表柱（穿甲矩阵页头） */
export function IconChart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="13" width="4.5" height="8" rx="1" />
      <rect x="9.75" y="8" width="4.5" height="13" rx="1" />
      <rect x="16.5" y="3" width="4.5" height="18" rx="1" />
    </svg>
  );
}

/**
 * 子弹（弹药库页头 / 无贴图口径回退）
 * 按真实整装弹结构绘制：弧形弹头 → 弹壳 → 抽壳沟（收窄）→ 底缘（外凸）
 */
export function IconAmmo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* 弹头：锥形收尖，底部略窄于弹壳口，避免整体像一根柱子 */}
      <path d="M12 1.6c1.6 2.5 3.6 4.8 3.6 6.8H8.4c0-2 2-4.3 3.6-6.8z" />
      {/* 弹壳主体 */}
      <path d="M8 8.4h8v10.8H8z" />
      {/* 抽壳沟：比壳身窄，形成真实的分段台阶 */}
      <rect x="9.1" y="19.2" width="5.8" height="1.7" />
      {/* 底缘：比壳身宽，收圆角 */}
      <rect x="7.1" y="20.9" width="9.8" height="2.3" rx="0.6" />
    </svg>
  );
}

/** 书本（武器图鉴页头，打开的书本造型） */
export function IconBook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* 打开的书：左右两页 + 中缝，左右页各带镂空 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5v-14c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"
      />
    </svg>
  );
}

/** 九宫格（分类「全部」） */
export function IconGrid({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

/** 步枪（长枪管 + 弹匣 + 枪托） */
export function IconRifle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1 10h4v5H3l-2-1z" />
      <rect x="5" y="10" width="10" height="3" rx="0.5" />
      <rect x="15" y="10.5" width="8" height="2" />
      <path d="M9 13h2l1 4h-2z" />
      <path d="M13 13h2l1 4h-2z" />
    </svg>
  );
}

/** 冲锋枪（短枪身 + 长弹匣） */
export function IconSmg({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1 11h3v3H1z" />
      <rect x="4" y="10" width="9" height="3" rx="0.5" />
      <rect x="13" y="10.5" width="6" height="2" />
      <path d="M7 13h2l0.5 7h-2z" />
      <path d="M11 13h2l1 4h-2z" />
    </svg>
  );
}

/** 精确射手步枪（带瞄具的步枪） */
export function IconDmr({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="9" y="6.5" width="7" height="2" rx="0.5" />
      <path d="M1 10h4v5H3l-2-1z" />
      <rect x="5" y="10" width="10" height="3" rx="0.5" />
      <rect x="15" y="10.5" width="8" height="2" />
      <path d="M9 13h2l1 4h-2z" />
    </svg>
  );
}

/** 狙击步枪（长枪管 + 高倍瞄具） */
export function IconSniper({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="8" y="5.5" width="8" height="2" rx="0.5" />
      <rect x="11" y="7.5" width="1.5" height="2.5" />
      <path d="M1 9.5h3l1.5 3v2.5H1z" />
      <rect x="4.5" y="10" width="8" height="3" rx="0.5" />
      <rect x="12.5" y="10.8" width="11" height="1.5" />
      <path d="M7 13h2l0.5 3h-2z" />
    </svg>
  );
}

/** 轻机枪（弹箱供弹） */
export function IconLmg({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1 10h3v4H1z" />
      <rect x="4" y="9" width="12" height="4" rx="0.5" />
      <rect x="16" y="10" width="7" height="2" />
      <rect x="7" y="13" width="4" height="5" rx="0.5" />
      <path d="M13 13h2l1 4h-2z" />
    </svg>
  );
}

/** 霰弹枪（粗枪管 + 护木） */
export function IconShotgun({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1 10.5h3l1 3v1.5H1z" />
      <rect x="4.5" y="10" width="9" height="3" rx="0.5" />
      <rect x="13.5" y="10.5" width="9" height="2" />
      <rect x="14.5" y="12.5" width="4" height="1.5" rx="0.5" />
    </svg>
  );
}

/** 手枪 */
export function IconPistol({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="4" y="8" width="17" height="3.5" rx="0.5" />
      <path d="M7 11.5h6l-3.5 8.5h-3z" />
      <path d="M13 11.5h4l-0.5 2h-3z" opacity="0.6" />
    </svg>
  );
}

/** 特殊武器（弓：弓臂 + 弓弦 + 箭） */
export function IconSpecial({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M7 3.5c5 3 5 14 0 17" />
      <path d="M7 3.5v17" />
      <path d="M7 12h11" />
      <path d="m15 9 3 3-3 3" />
    </svg>
  );
}

/** 未知分类（问号圆环） */
export function IconUnknown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.8.5-1.3 1-1.3 1.9" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** 可穿透（对勾） */
export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m4 12.5 5 5 11-11" />
    </svg>
  );
}

/** 可穿但衰减（警告三角） */
export function IconWarn({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3.5 21 20H3z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 打不穿（叉号） */
export function IconCross({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
