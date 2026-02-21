import { google } from 'googleapis'
import http from 'http'
import { URL } from 'url'
import { shell } from 'electron'
import { saveTokens, loadTokens, clearTokens } from './token-store'

const REDIRECT_PORT = 52836
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`
const SCOPES = ['https://www.googleapis.com/auth/tasks']

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  )
}

let oauth2Client: ReturnType<typeof createOAuth2Client> | null = null

export function getAuthClient() {
  if (!oauth2Client) {
    oauth2Client = createOAuth2Client()
    oauth2Client.on('tokens', (tokens) => {
      const existing = loadTokens()
      saveTokens({
        access_token: tokens.access_token || existing?.access_token || '',
        refresh_token: tokens.refresh_token || existing?.refresh_token || '',
        expiry_date: tokens.expiry_date || existing?.expiry_date || 0
      })
    })
  }
  return oauth2Client
}

export async function signIn(): Promise<boolean> {
  const client = getAuthClient()
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  })

  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`)
        if (url.pathname !== '/callback') return
        const code = url.searchParams.get('code')
        if (!code) {
          res.writeHead(400)
          res.end('No authorization code received.')
          server.close()
          resolve(false)
          return
        }

        const { tokens } = await client.getToken(code)
        client.setCredentials(tokens)
        saveTokens({
          access_token: tokens.access_token || '',
          refresh_token: tokens.refresh_token || '',
          expiry_date: tokens.expiry_date || 0
        })

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Signed in successfully!</h2><p>You can close this tab.</p></body></html>')
        server.close()
        resolve(true)
      } catch {
        res.writeHead(500)
        res.end('Authentication failed.')
        server.close()
        resolve(false)
      }
    })

    server.listen(REDIRECT_PORT, () => {
      shell.openExternal(authUrl)
    })

    // 2-minute timeout
    setTimeout(() => {
      server.close()
      resolve(false)
    }, 120_000)
  })
}

export async function restoreSession(): Promise<boolean> {
  const tokens = loadTokens()
  if (!tokens?.refresh_token) return false
  const client = getAuthClient()
  client.setCredentials(tokens)
  try {
    await client.getAccessToken()
    return true
  } catch {
    clearTokens()
    return false
  }
}

export function signOut(): void {
  oauth2Client = null
  clearTokens()
}

export function isSignedIn(): boolean {
  const tokens = loadTokens()
  return !!(tokens?.refresh_token)
}
