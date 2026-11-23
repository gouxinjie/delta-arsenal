// 路由切换动效：template 在路由变更时重新挂载，触发 CSS 入场动画
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-anim">{children}</div>;
}
