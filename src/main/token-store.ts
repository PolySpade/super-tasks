import Store from 'electron-store'
import { safeStorage } from 'electron'

interface TokenData {
  access_token: string
  refresh_token: string
  expiry_date: number
  scope?: string
}

const store = new Store({ name: 'google-tasks-auth' })

export function saveTokens(tokens: TokenData): void {
  const json = JSON.stringify(tokens)
  const encrypted = safeStorage.encryptString(json)
  store.set('tokens', encrypted.toString('base64'))
}

export function loadTokens(): TokenData | null {
  const data = store.get('tokens') as string | undefined
  if (!data) return null
  try {
    const buffer = Buffer.from(data, 'base64')
    const json = safeStorage.decryptString(buffer)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function clearTokens(): void {
  store.delete('tokens')
}

export function loadGrantedScopes(): string[] {
  const tokens = loadTokens()
  if (!tokens?.scope) return []
  return tokens.scope.split(' ')
}
