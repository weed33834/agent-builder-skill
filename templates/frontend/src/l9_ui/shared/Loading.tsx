/**
 * L9 - 加载动画组件
 * 
 * 展示 L1-L10 各层调用时的加载状态。
 */

interface LoadingProps {
  text?: string
  layer?: string
}

export function Loading({ text = '加载中...', layer }: LoadingProps) {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-ring" />
        <div className="spinner-ring spinner-ring-inner" />
      </div>
      <p className="loading-text">
        {layer ? `[${layer}] ` : ''}{text}
      </p>
    </div>
  )
}