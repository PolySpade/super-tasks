import { X } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button className="icon-btn" onClick={onDismiss}>
        <X size={12} />
      </button>
    </div>
  )
}
