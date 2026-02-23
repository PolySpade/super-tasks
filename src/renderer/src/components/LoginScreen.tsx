import { LogIn, Loader2 } from 'lucide-react'

interface LoginScreenProps {
  onSignIn: () => void
  loading: boolean
}

export function LoginScreen({ onSignIn, loading }: LoginScreenProps) {
  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#4285f4" strokeWidth="3" fill="none" />
            <path d="M14 24l7 7 13-13" stroke="#4285f4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
        <h2>SuperTasks</h2>
        <p>Sign in to manage your tasks</p>
        <button className="sign-in-btn" onClick={onSignIn} disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <LogIn size={16} />
          )}
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}
