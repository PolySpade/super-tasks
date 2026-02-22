import { useState, useRef, useEffect } from 'react'
import { Zap } from 'lucide-react'

export function QuickCaptureInput() {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.api.hideCaptureWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = async () => {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    try {
      await window.api.quickCapture(value.trim())
      setValue('')
      window.api.hideCaptureWindow()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="quick-capture-container">
      <div className="quick-capture-icon">
        <Zap size={16} />
      </div>
      <input
        ref={inputRef}
        className="quick-capture-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
        }}
        placeholder="Quick capture... (e.g., Call dentist tomorrow high energy 30min)"
        disabled={submitting}
        autoFocus
      />
      {submitting && <div className="quick-capture-spinner spinner" />}
    </div>
  )
}
