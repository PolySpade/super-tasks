import Store from 'electron-store'
import { google } from 'googleapis'
import { net } from 'electron'
import { getAuthClient } from './google-auth'
import { Readable } from 'stream'

// --- Sync metadata store ---
interface StoreSyncMeta {
  localUpdatedAt: string | null
  driveFileId: string | null
  lastSyncedAt: string | null
}

const metaStore = new Store({ name: 'drive-sync-meta' })

function getMeta(name: string): StoreSyncMeta {
  return (metaStore.get(name) as StoreSyncMeta) || {
    localUpdatedAt: null,
    driveFileId: null,
    lastSyncedAt: null
  }
}

function setMeta(name: string, partial: Partial<StoreSyncMeta>): void {
  const current = getMeta(name)
  metaStore.set(name, { ...current, ...partial })
}

// --- Registered stores ---
interface RegisteredStore {
  name: string
  store: Store
  excludeKeys?: string[]
}

const registeredStores: Map<string, RegisteredStore> = new Map()
let suppressChangeTracking = false
let syncInterval: ReturnType<typeof setInterval> | null = null

export function registerSyncableStore(
  name: string,
  store: Store,
  opts?: { excludeKeys?: string[] }
): void {
  registeredStores.set(name, { name, store, excludeKeys: opts?.excludeKeys })
}

export function markStoreModified(name: string): void {
  if (suppressChangeTracking) return
  setMeta(name, { localUpdatedAt: new Date().toISOString() })
}

// --- Drive API helpers ---
function getDrive() {
  return google.drive({ version: 'v3', auth: getAuthClient() })
}

async function findDriveFile(fileName: string): Promise<string | null> {
  const meta = getMeta(fileName.replace('.json', ''))
  if (meta.driveFileId) return meta.driveFileId

  const drive = getDrive()
  const res = await drive.files.list({
    spaces: 'appDataFolder',
    q: `name = '${fileName}'`,
    fields: 'files(id)',
    pageSize: 1
  })
  return res.data.files?.[0]?.id || null
}

async function readDriveFile(fileId: string): Promise<{ data: any; updatedAt: string }> {
  const drive = getDrive()
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  )
  return JSON.parse(res.data as string)
}

async function writeDriveFile(fileId: string, content: { data: any; updatedAt: string }): Promise<void> {
  const drive = getDrive()
  const body = JSON.stringify(content)
  await drive.files.update({
    fileId,
    media: {
      mimeType: 'application/json',
      body: Readable.from(body)
    }
  })
}

async function createDriveFile(fileName: string, content: { data: any; updatedAt: string }): Promise<string> {
  const drive = getDrive()
  const body = JSON.stringify(content)
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: ['appDataFolder']
    },
    media: {
      mimeType: 'application/json',
      body: Readable.from(body)
    },
    fields: 'id'
  })
  return res.data.id!
}

// --- Core sync logic ---
function getStoreData(reg: RegisteredStore): any {
  const data = reg.store.store
  if (!reg.excludeKeys?.length) return data
  const filtered = { ...data }
  for (const key of reg.excludeKeys) {
    delete filtered[key]
  }
  return filtered
}

function applyRemoteData(reg: RegisteredStore, remoteData: any): void {
  suppressChangeTracking = true
  try {
    if (reg.excludeKeys?.length) {
      // Preserve excluded keys locally
      const preserved: Record<string, any> = {}
      for (const key of reg.excludeKeys) {
        const val = reg.store.get(key)
        if (val !== undefined) preserved[key] = val
      }
      reg.store.store = { ...remoteData, ...preserved }
    } else {
      reg.store.store = remoteData
    }
  } finally {
    suppressChangeTracking = false
  }
}

async function syncStore(reg: RegisteredStore): Promise<void> {
  const meta = getMeta(reg.name)
  const fileName = `${reg.name}.json`
  const now = new Date().toISOString()

  // Find or create the Drive file
  let fileId = await findDriveFile(fileName)

  if (!fileId) {
    // No remote file — push local data
    const localData = getStoreData(reg)
    const content = { data: localData, updatedAt: meta.localUpdatedAt || now }
    fileId = await createDriveFile(fileName, content)
    setMeta(reg.name, {
      driveFileId: fileId,
      lastSyncedAt: now,
      localUpdatedAt: null
    })
    return
  }

  // Cache the file ID
  if (!meta.driveFileId) {
    setMeta(reg.name, { driveFileId: fileId })
  }

  const remote = await readDriveFile(fileId)
  const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0
  const localTime = meta.localUpdatedAt ? new Date(meta.localUpdatedAt).getTime() : 0

  if (localTime > remoteTime) {
    // Local is newer — push
    const localData = getStoreData(reg)
    await writeDriveFile(fileId, { data: localData, updatedAt: meta.localUpdatedAt! })
    setMeta(reg.name, { lastSyncedAt: now, localUpdatedAt: null })
  } else if (remoteTime > localTime) {
    // Remote is newer — pull
    applyRemoteData(reg, remote.data)
    setMeta(reg.name, { lastSyncedAt: now, localUpdatedAt: null })
  } else {
    // Same timestamps — no action needed
    setMeta(reg.name, { lastSyncedAt: now })
  }
}

export async function syncAllStores(): Promise<void> {
  if (!net.isOnline()) return

  const results = await Promise.allSettled(
    Array.from(registeredStores.values()).map((reg) => syncStore(reg))
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[drive-sync] Store sync failed:', result.reason?.message || result.reason)
    }
  }
}

export function startPeriodicSync(): void {
  if (syncInterval) return
  // Initial sync after 5s delay
  setTimeout(() => {
    syncAllStores().catch(() => {})
  }, 5_000)
  // Then every 5 minutes
  syncInterval = setInterval(() => {
    syncAllStores().catch(() => {})
  }, 5 * 60 * 1000)
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

export function getLastSyncTime(): string | null {
  // Return the most recent lastSyncedAt across all stores
  let latest: string | null = null
  for (const [name] of registeredStores) {
    const meta = getMeta(name)
    if (meta.lastSyncedAt) {
      if (!latest || meta.lastSyncedAt > latest) {
        latest = meta.lastSyncedAt
      }
    }
  }
  return latest
}
