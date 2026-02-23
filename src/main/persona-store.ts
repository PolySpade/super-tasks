import Store from 'electron-store'

export interface Persona {
  name: string
  role: string
  workStyle: string
  preferences: string
}

const DEFAULTS: Persona = {
  name: '',
  role: '',
  workStyle: '',
  preferences: ''
}

const store = new Store({ name: 'persona' })

export function getPersona(): Persona {
  const saved = store.get('persona') as Partial<Persona> | undefined
  return { ...DEFAULTS, ...saved }
}

export function setPersona(partial: Partial<Persona>): Persona {
  const current = store.get('persona') as Partial<Persona> | undefined
  const updated = { ...DEFAULTS, ...current, ...partial }
  store.set('persona', updated)
  return updated
}

export function isPersonaConfigured(): boolean {
  const persona = getPersona()
  return persona.name.trim() !== '' && persona.role.trim() !== ''
}
