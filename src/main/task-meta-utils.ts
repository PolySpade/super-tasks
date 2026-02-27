export type EnergyLevel = 'high' | 'medium' | 'low'

export interface TaskMetadata {
  energyLevel?: EnergyLevel
  timeBoxMinutes?: number
}

const META_REGEX = /\n?\[meta:([^\]]*)\]\s*$/

export function parseMetaTag(notes: string): { cleanNotes: string; meta: TaskMetadata } {
  const match = notes.match(META_REGEX)
  if (!match) return { cleanNotes: notes, meta: {} }

  const cleanNotes = notes.replace(META_REGEX, '')
  const meta: TaskMetadata = {}
  const content = match[1]

  const energyMatch = content.match(/energy=(high|medium|low)/)
  if (energyMatch) meta.energyLevel = energyMatch[1] as EnergyLevel

  const timeboxMatch = content.match(/timebox=(\d+)/)
  if (timeboxMatch) meta.timeBoxMinutes = parseInt(timeboxMatch[1], 10)

  return { cleanNotes, meta }
}

export function appendMetaTag(notes: string, meta: TaskMetadata): string {
  const parts: string[] = []
  if (meta.energyLevel) parts.push(`energy=${meta.energyLevel}`)
  if (meta.timeBoxMinutes) parts.push(`timebox=${meta.timeBoxMinutes}`)
  if (parts.length === 0) return notes
  return `${notes}\n[meta:${parts.join(',')}]`
}
