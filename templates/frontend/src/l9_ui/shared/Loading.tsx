/**
 * L9 - Loading Animation Component
 * 
 * Displays the loading state during L1-L10 layer calls.
 */

interface LoadingProps {
  text?: string
  layer?: string
}

export function Loading({ text = 'Loading...', layer }: LoadingProps) {
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