import { getSettings, getDecryptedApiKey } from './settings-store'
import { getHistoricalData } from './time-tracking-store'
import { getRecentReviews } from './eod-review-store'
import { getPersona, isPersonaConfigured } from './persona-store'

interface PlanTask {
  id: string
  title: string
  notes?: string
  due?: string
}

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
}

interface BlockTask {
  taskId: string
  taskTitle: string
  estimatedMinutes: number
}

interface ContextBlock {
  blockName: string
  start: string
  end: string
  tasks: BlockTask[]
  reason: string
}

interface DayPlan {
  blocks: ContextBlock[]
  summary: string
}

interface PlanRequest {
  date: string
  tasks: PlanTask[]
  existingEvents: CalendarEvent[]
  workingHours: { start: string; end: string }
  lunchBreak: { start: string; end: string }
  breakMinutes: number
  mitTaskIds?: string[]
  taskMetadata?: Record<string, { energyLevel?: 'high' | 'medium' | 'low'; timeBoxMinutes?: number }>
  taskListNames?: Record<string, string>
}

function buildFullPersonaBlock(): string {
  const settings = getSettings()
  const persona = getPersona()
  const lines: string[] = []

  // Identity
  if (persona.name) lines.push(`Name: ${persona.name}`)
  if (persona.role) lines.push(`Role: ${persona.role}`)

  // Work rhythm
  lines.push(`Working hours: ${settings.workingHoursStart} – ${settings.workingHoursEnd}`)
  lines.push(`Lunch break: ${settings.lunchBreakStart} – ${settings.lunchBreakEnd}`)
  lines.push(`Break between blocks: ${settings.breakDurationMinutes} minutes`)

  // Work style & preferences
  if (persona.workStyle) lines.push(`Work style: ${persona.workStyle}`)
  if (persona.preferences) lines.push(`Preferences: ${persona.preferences}`)

  return lines.join('\n')
}

function buildPlannerSystemPrompt(): string {
  const personaBlock = buildFullPersonaBlock()

  return `You are a personal day planner AI that deeply understands the user and creates schedules tailored to how they actually work.

## Who you are planning for
${personaBlock}

## Scheduling rules
- NEVER schedule over existing calendar events
- NEVER schedule over the lunch break period — keep it completely free
- Keep ALL blocks strictly within the user's working hours
- Group related tasks into named contextual blocks (e.g. "Deep Work", "Communication", "Admin", "Creative", "Review", "Planning")
- Each block should contain 1-5 related tasks; a solo task gets its own block
- Include breaks BETWEEN blocks (use the user's configured break duration), not between tasks within a block
- Each block's start/end must cover the total estimated time of its tasks plus transitions

## Task priority & energy
- MIT (Most Important Task) tasks MUST be scheduled first. MIT #1 is the "frog" — always the very first block of the day.
- Tasks marked [energy: high] → schedule during morning peak hours when cognitive energy is highest
- Tasks marked [energy: low] → schedule in the post-lunch dip when energy naturally drops
- Tasks marked [energy: medium] → flexible, fill remaining slots
- Prioritize tasks with closer due dates; tasks without due dates fill gaps sensibly

## Context awareness
- Use [list: ...] tags to understand task domain — group tasks from the same list when contextually sensible
- Tasks marked [subtask of: ...] should be scheduled near their parent task
- If yesterday's review data is provided, calibrate ambition accordingly (low rating = lighter, more buffered schedule)
- If historical time tracking data is provided, use it to adjust duration estimates
- Respect the user's work style and preferences above all — if they prefer deep focus mornings, don't schedule meetings there; if they like short tasks first, front-load quick wins

## Estimation
- Estimate each task's duration based on title, notes, and context (default 30 minutes)
- If a task has a [timebox: Xmin] tag, use that exact duration
- Be realistic — account for context switching between different types of work

## Output format
Return ONLY valid JSON, no markdown fences or extra text:
{
  "blocks": [
    {
      "blockName": "Block Category Name",
      "start": "HH:MM",
      "end": "HH:MM",
      "reason": "Brief reason for grouping and timing",
      "tasks": [
        { "taskId": "task-id-here", "taskTitle": "Task title", "estimatedMinutes": 30 }
      ]
    }
  ],
  "summary": "Brief personalized overview of the planned day"
}`
}

function buildPrompt(request: PlanRequest): string {
  const eventsList = request.existingEvents.length > 0
    ? request.existingEvents.map((e) => {
        const startTime = e.start.includes('T') ? e.start.split('T')[1].substring(0, 5) : 'all-day'
        const endTime = e.end.includes('T') ? e.end.split('T')[1].substring(0, 5) : 'all-day'
        return `- ${startTime} to ${endTime}: ${e.summary}`
      }).join('\n')
    : 'No existing events'

  const mitSet = new Set(request.mitTaskIds || [])
  const meta = request.taskMetadata || {}
  const listNames = request.taskListNames || {}

  const tasksList = request.tasks.length > 0
    ? request.tasks.map((t) => {
        let desc = `- [${t.id}]`
        if (mitSet.has(t.id)) desc += ' [MIT]'
        const tm = meta[t.id]
        if (tm?.energyLevel) desc += ` [energy: ${tm.energyLevel}]`
        if (tm?.timeBoxMinutes) desc += ` [timebox: ${tm.timeBoxMinutes}min]`
        if (listNames[t.id]) desc += ` [list: ${listNames[t.id]}]`
        desc += ` "${t.title}"`
        if (t.due) desc += ` (due: ${t.due})`
        if (t.notes) desc += ` — Notes: ${t.notes}`
        return desc
      }).join('\n')
    : 'No tasks to schedule'

  // Include historical time tracking data for better estimates
  const historicalData = getHistoricalData()
  const histMap = new Map(historicalData.map((d) => [d.taskId, d]))
  let historicalNote = ''
  if (historicalData.length > 0) {
    const avgRatios: number[] = []
    for (const d of historicalData) {
      if (d.totalMinutes > 0) avgRatios.push(d.totalMinutes / 30) // vs default 30min
    }
    if (avgRatios.length >= 3) {
      const avg = avgRatios.reduce((a, b) => a + b, 0) / avgRatios.length
      if (avg > 1.2) {
        historicalNote = `\nNote: Historical data shows tasks typically take ${Math.round(avg * 100)}% of estimated time. Adjust your estimates upward.`
      }
    }
  }

  // Fetch yesterday's EOD review for context
  let reviewContext = ''
  try {
    const recentReviews = getRecentReviews(1)
    if (recentReviews.length > 0) {
      const r = recentReviews[0]
      reviewContext = `\nYesterday's review (${r.date}):
- Productivity rating: ${r.rating}/5
- Tasks completed: ${r.completedCount}, carried over: ${r.carriedOverCount}
- Focus minutes: ${r.focusMinutes}
- Reflection: "${r.reflection}"`
    }
  } catch {
    // EOD review data unavailable — skip
  }

  return `Plan my day for ${request.date}.

Working hours: ${request.workingHours.start} to ${request.workingHours.end}
Lunch break: ${request.lunchBreak.start} to ${request.lunchBreak.end} (DO NOT schedule over this)
Break duration between blocks: ${request.breakMinutes} minutes

Existing calendar events (DO NOT schedule over these):
${eventsList}

Tasks to schedule:
${tasksList}
${historicalNote}${reviewContext}

Create an optimal, personalized schedule. Return JSON only.`
}

function parseAiResponse(text: string): DayPlan {
  let cleaned = text.trim()
  // Strip markdown fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  }
  const parsed = JSON.parse(cleaned)
  if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
    throw new Error('Invalid AI response: missing blocks array')
  }
  return {
    blocks: parsed.blocks.map((b: any) => ({
      blockName: b.blockName || 'Untitled Block',
      start: b.start || '',
      end: b.end || '',
      reason: b.reason || '',
      tasks: Array.isArray(b.tasks)
        ? b.tasks.map((t: any) => ({
            taskId: t.taskId || '',
            taskTitle: t.taskTitle || '',
            estimatedMinutes: t.estimatedMinutes || 30
          }))
        : []
    })),
    summary: parsed.summary || ''
  }
}

async function callAnthropic(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt || buildPlannerSystemPrompt(),
    messages: [{ role: 'user', content: prompt }]
  })
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Anthropic')
  }
  return textBlock.text
}

async function callOpenAI(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt || buildPlannerSystemPrompt() },
      { role: 'user', content: prompt }
    ]
  })
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }
  return content
}

async function callGemini(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt || buildPlannerSystemPrompt()
  })
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  if (!text) {
    throw new Error('No response from Gemini')
  }
  return text
}

async function callOllama(baseUrl: string, model: string, prompt: string, systemPrompt?: string): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ baseURL: `${baseUrl}/v1`, apiKey: 'ollama' })
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt || buildPlannerSystemPrompt() },
      { role: 'user', content: prompt }
    ]
  })
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from Ollama')
  }
  return content
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/tags`)
  if (!res.ok) {
    throw new Error(`Ollama API returned ${res.status}`)
  }
  const data = await res.json()
  return (data.models || []).map((m: any) => m.name as string)
}

export async function validateApiKey(
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama',
  apiKey: string,
  ollamaBaseUrl?: string
): Promise<void> {
  if (provider === 'ollama') {
    const baseUrl = ollamaBaseUrl || 'http://localhost:11434'
    const res = await fetch(`${baseUrl}/api/tags`)
    if (!res.ok) {
      throw new Error(`Cannot connect to Ollama at ${baseUrl}`)
    }
    return
  }
  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey })
    await openai.models.list()
  } else if (provider === 'gemini') {
    // Use a lightweight REST call to list models instead of generating content
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message || `API returned ${res.status}`)
    }
  } else {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey })
    await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4,
      messages: [{ role: 'user', content: 'Say OK' }]
    })
  }
}

// ═══════════════════════════════════════
// Subtask Generation
// ═══════════════════════════════════════

function buildSubtaskSystemPrompt(): string {
  const personaBlock = buildFullPersonaBlock()
  return `You are a task decomposition AI that understands the user and breaks tasks into subtasks sized for how they work.

## Who you are helping
${personaBlock}

## Rules
- Decompose into 3-7 actionable subtasks
- Each subtask should be specific and completable in one sitting
- Estimate minutes realistically (15-120 minutes per subtask) — account for the user's work style and break rhythm
- Order subtasks logically (dependencies first)
- Tailor subtask granularity to the user's role and experience level
- Use language appropriate to the user's domain
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
{
  "subtasks": [
    { "title": "Subtask description", "estimatedMinutes": 30 }
  ]
}`
}

function buildWorkBackwardsSystemPrompt(): string {
  const personaBlock = buildFullPersonaBlock()
  return `You are a project scheduling AI that understands the user and plans backwards from deadlines in a way that fits their rhythm.

## Who you are helping
${personaBlock}

## Rules
- Decompose into 3-7 actionable subtasks
- Schedule subtasks working backwards from the deadline
- NEVER schedule over existing calendar events
- NEVER schedule over the lunch break period — keep it free
- Keep all work within the user's working hours
- Include breaks between tasks matching the user's break duration
- Leave buffer time before the deadline
- Estimate task durations realistically — account for the user's work style
- Schedule high-energy subtasks during the user's peak hours
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
{
  "subtasks": [
    { "title": "Subtask description", "estimatedMinutes": 30 }
  ],
  "schedule": [
    { "subtaskTitle": "Subtask description", "date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM" }
  ]
}`
}

interface SubtaskRequest {
  taskTitle: string
  taskNotes?: string
  deadline: string
}

interface WorkBackwardsRequest {
  taskTitle: string
  taskNotes?: string
  deadline: string
  existingEvents: CalendarEvent[]
  workingHours: { start: string; end: string }
  lunchBreak?: { start: string; end: string }
  breakMinutes: number
}

function buildSubtaskPrompt(request: SubtaskRequest): string {
  return `Break down this task into subtasks:

Task: "${request.taskTitle}"
${request.taskNotes ? `Notes: ${request.taskNotes}` : ''}
Deadline: ${request.deadline}

Return JSON only.`
}

function buildWorkBackwardsPrompt(request: WorkBackwardsRequest): string {
  const eventsList = request.existingEvents.length > 0
    ? request.existingEvents.map((e) => {
        const startTime = e.start.includes('T') ? e.start.split('T')[1].substring(0, 5) : 'all-day'
        const endTime = e.end.includes('T') ? e.end.split('T')[1].substring(0, 5) : 'all-day'
        return `- ${e.start.split('T')[0]} ${startTime}-${endTime}: ${e.summary}`
      }).join('\n')
    : 'No existing events'

  const lunchLine = request.lunchBreak
    ? `Lunch break: ${request.lunchBreak.start} to ${request.lunchBreak.end} (DO NOT schedule over this)`
    : ''

  return `Plan backwards from the deadline for this task:

Task: "${request.taskTitle}"
${request.taskNotes ? `Notes: ${request.taskNotes}` : ''}
Deadline: ${request.deadline}
Working hours: ${request.workingHours.start} to ${request.workingHours.end}
${lunchLine}
Break duration: ${request.breakMinutes} minutes
Today: ${new Date().toISOString().split('T')[0]}

Existing calendar events (DO NOT schedule over these):
${eventsList}

Break this into subtasks and schedule them across days.

Return JSON only.`
}

async function callAiWithPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
  const settings = getSettings()

  if (settings.aiProvider === 'ollama') {
    if (!settings.ollamaModel) {
      throw new Error('No Ollama model selected. Go to Settings to pick one.')
    }
    return callOllama(settings.ollamaBaseUrl, settings.ollamaModel, userPrompt, systemPrompt)
  }

  const apiKey = getDecryptedApiKey()
  if (!apiKey) {
    throw new Error('No AI API key configured. Go to Settings to add one.')
  }

  if (settings.aiProvider === 'openai') {
    return callOpenAI(apiKey, userPrompt, systemPrompt)
  } else if (settings.aiProvider === 'gemini') {
    return callGemini(apiKey, userPrompt, systemPrompt)
  } else {
    return callAnthropic(apiKey, userPrompt, systemPrompt)
  }
}

export async function generateSubtasks(request: SubtaskRequest): Promise<{ subtasks: { title: string; estimatedMinutes: number }[] }> {
  const prompt = buildSubtaskPrompt(request)
  const responseText = await callAiWithPrompt(buildSubtaskSystemPrompt(), prompt)
  const parsed = parseAiResponse(responseText)
  // parseAiResponse returns DayPlan shape, but we need subtask shape — re-parse
  let cleaned = responseText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  }
  const data = JSON.parse(cleaned)
  return {
    subtasks: (data.subtasks || []).map((s: any) => ({
      title: s.title || '',
      estimatedMinutes: s.estimatedMinutes || 30
    }))
  }
}

export async function workBackwards(request: WorkBackwardsRequest): Promise<{ subtasks: { title: string; estimatedMinutes: number }[]; schedule: { subtaskTitle: string; date: string; start: string; end: string }[] }> {
  const prompt = buildWorkBackwardsPrompt(request)
  const responseText = await callAiWithPrompt(buildWorkBackwardsSystemPrompt(), prompt)
  let cleaned = responseText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  }
  const data = JSON.parse(cleaned)
  return {
    subtasks: (data.subtasks || []).map((s: any) => ({
      title: s.title || '',
      estimatedMinutes: s.estimatedMinutes || 30
    })),
    schedule: (data.schedule || []).map((s: any) => ({
      subtaskTitle: s.subtaskTitle || '',
      date: s.date || '',
      start: s.start || '',
      end: s.end || ''
    }))
  }
}

// ═══════════════════════════════════════
// AI Rename & Improve Tasks
// ═══════════════════════════════════════

function buildRenameSystemPrompt(): string {
  const personaBlock = buildFullPersonaBlock()
  const settings = getSettings()
  const tags = settings.renameTags || []
  const tagInstruction = tags.length > 0
    ? `\n## Title Tags
- Prefix each task title with a [Tag] from this allowed set: ${tags.join(', ')}
- Pick the single most relevant tag based on the task content, list name, and notes
- If no tag fits well, omit the bracket and return a clean title
- The tag replaces the leading verb — e.g. [Review] PR #42 feedback, not [Review] Review PR #42 feedback`
    : ''

  return `You are a task improvement AI that understands the user and rewrites tasks in their voice and domain.

## Who you are helping
${personaBlock}

## Rules
- Make titles concise, action-oriented, and clear
- Adapt language and tone to match the user's role and domain
- If notes are empty, add a brief 1-line note with context or first step
- If notes exist, you MUST preserve ALL existing content — URLs, links, numbers, dates, references, and any structured data must remain exactly as-is. Only rephrase surrounding prose for clarity.
- NEVER remove or shorten URLs, numeric values, IDs, phone numbers, or any reference data from notes
- Do NOT change the meaning or scope of the task
- Use the list name as domain context (e.g. a task in "Work" should use professional language, a task in "Health" should use wellness language)
- Consider due dates to add urgency cues in notes when appropriate
- For subtasks, ensure the title is clear even without seeing the parent task
- Return ONLY valid JSON, no markdown fences or extra text
${tagInstruction}

Return JSON in this exact format:
{
  "renames": [
    { "taskId": "id-here", "newTitle": "Improved title", "newNotes": "Improved or added notes" }
  ]
}`
}

interface RenameTask {
  id: string
  title: string
  notes?: string
  listName?: string
  due?: string
  energyLevel?: string
  parentTitle?: string
  hasSubtasks?: boolean
}

function buildRenamePrompt(tasks: RenameTask[]): string {
  const tasksList = tasks
    .map((t) => {
      let desc = `- [${t.id}]`
      if (t.listName) desc += ` [list: ${t.listName}]`
      if (t.due) desc += ` [due: ${t.due}]`
      if (t.energyLevel) desc += ` [energy: ${t.energyLevel}]`
      if (t.parentTitle) desc += ` [subtask of: "${t.parentTitle}"]`
      if (t.hasSubtasks) desc += ` [has subtasks]`
      desc += ` Title: "${t.title}"`
      if (t.notes) desc += ` | Notes: "${t.notes}"`
      else desc += ` | Notes: (empty)`
      return desc
    })
    .join('\n')

  return `Improve these task titles and notes:\n\n${tasksList}\n\nReturn JSON only.`
}

export async function renameTasks(request: {
  tasks: RenameTask[]
}): Promise<{ taskId: string; newTitle: string; newNotes: string }[]> {
  const prompt = buildRenamePrompt(request.tasks)
  const responseText = await callAiWithPrompt(buildRenameSystemPrompt(), prompt)
  let cleaned = responseText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  }
  const data = JSON.parse(cleaned)
  return (data.renames || []).map((r: any) => ({
    taskId: r.taskId || '',
    newTitle: r.newTitle || '',
    newNotes: r.newNotes || ''
  }))
}

// ═══════════════════════════════════════
// AI Sort Tasks to Lists
// ═══════════════════════════════════════

interface SortTask {
  id: string
  title: string
  notes?: string
  due?: string
  currentListId: string
  currentListName: string
}

function buildSortSystemPrompt(lists: { id: string; title: string }[]): string {
  const personaBlock = buildFullPersonaBlock()
  const listDescriptions = lists.map((l) => `- "${l.title}" (id: ${l.id})`).join('\n')

  return `You are a task organization AI that understands the user and identifies tasks that are in the wrong list.

## Who you are helping
${personaBlock}

## Available lists
${listDescriptions}

## Rules
- Only propose moves for tasks that are clearly in the wrong list
- Use list names as semantic categories to determine where tasks belong
- Provide a brief reason for each proposed move
- If a task is already in the correct list, do NOT include it
- Consider the user's domain, role, and how they likely organize work
- When in doubt, leave the task where it is — only move when confident
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
{
  "moves": [
    { "taskId": "id-here", "targetListId": "list-id-here", "reason": "Brief reason for moving" }
  ]
}`
}

function buildSortPrompt(tasks: SortTask[]): string {
  const tasksList = tasks
    .map((t) => {
      let desc = `- [${t.id}] [list: ${t.currentListName}]`
      desc += ` Title: "${t.title}"`
      if (t.due) desc += ` (due: ${t.due})`
      if (t.notes) desc += ` | Notes: "${t.notes}"`
      return desc
    })
    .join('\n')

  return `Analyze these tasks and identify any that are in the wrong list. Only propose moves for tasks that clearly belong in a different list:\n\n${tasksList}\n\nReturn JSON only.`
}

export async function sortTasksToLists(request: {
  tasks: SortTask[]
  lists: { id: string; title: string }[]
}): Promise<{ taskId: string; targetListId: string; reason: string }[]> {
  const prompt = buildSortPrompt(request.tasks)
  const responseText = await callAiWithPrompt(buildSortSystemPrompt(request.lists), prompt)
  let cleaned = responseText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  }
  const data = JSON.parse(cleaned)
  return (data.moves || []).map((m: any) => ({
    taskId: m.taskId || '',
    targetListId: m.targetListId || '',
    reason: m.reason || ''
  }))
}

export async function generatePlan(request: PlanRequest): Promise<DayPlan> {
  const settings = getSettings()
  const prompt = buildPrompt(request)
  let responseText: string

  if (settings.aiProvider === 'ollama') {
    if (!settings.ollamaModel) {
      throw new Error('No Ollama model selected. Go to Settings to pick one.')
    }
    responseText = await callOllama(settings.ollamaBaseUrl, settings.ollamaModel, prompt)
  } else {
    const apiKey = getDecryptedApiKey()
    if (!apiKey) {
      throw new Error('No AI API key configured. Go to Settings to add one.')
    }

    if (settings.aiProvider === 'openai') {
      responseText = await callOpenAI(apiKey, prompt)
    } else if (settings.aiProvider === 'gemini') {
      responseText = await callGemini(apiKey, prompt)
    } else {
      responseText = await callAnthropic(apiKey, prompt)
    }
  }

  return parseAiResponse(responseText)
}
