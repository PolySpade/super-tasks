import { getSettings, getDecryptedApiKey } from './settings-store'

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
}

const PLANNER_SYSTEM_PROMPT = `You are a day planner AI. Given a list of tasks and existing calendar events, create an optimal daily schedule by grouping related tasks into named contextual blocks.

Rules:
- NEVER schedule over existing calendar events
- NEVER schedule over the lunch break period — keep it free
- Group tasks that share similar context into named blocks (e.g. "Communication", "Deep Work", "Admin", "Creative", "Review", "Planning")
- Each block should contain 1-5 tasks; a solo task gets its own block
- Schedule high-effort blocks (Deep Work, Creative) earlier when energy is highest
- Include breaks BETWEEN blocks, not between tasks within a block
- Prioritize tasks with closer due dates
- Tasks without due dates should still be scheduled sensibly
- Keep all blocks within the specified working hours
- Estimate each task's duration based on title and notes (default 30 minutes)
- Each block's start/end should cover the total estimated time of its tasks
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
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
  "summary": "Brief overview of the planned day"
}`

function buildPrompt(request: PlanRequest): string {
  const eventsList = request.existingEvents.length > 0
    ? request.existingEvents.map((e) => {
        const startTime = e.start.includes('T') ? e.start.split('T')[1].substring(0, 5) : 'all-day'
        const endTime = e.end.includes('T') ? e.end.split('T')[1].substring(0, 5) : 'all-day'
        return `- ${startTime} to ${endTime}: ${e.summary}`
      }).join('\n')
    : 'No existing events'

  const tasksList = request.tasks.length > 0
    ? request.tasks.map((t) => {
        let desc = `- [${t.id}] "${t.title}"`
        if (t.due) desc += ` (due: ${t.due})`
        if (t.notes) desc += ` — Notes: ${t.notes}`
        return desc
      }).join('\n')
    : 'No tasks to schedule'

  return `Plan my day for ${request.date}.

Working hours: ${request.workingHours.start} to ${request.workingHours.end}
Lunch break: ${request.lunchBreak.start} to ${request.lunchBreak.end} (DO NOT schedule over this)
Break duration between tasks: ${request.breakMinutes} minutes

Existing calendar events (DO NOT schedule over these):
${eventsList}

Tasks to schedule:
${tasksList}

Create an optimal schedule. Return JSON only.`
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
    system: systemPrompt || PLANNER_SYSTEM_PROMPT,
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
      { role: 'system', content: systemPrompt || PLANNER_SYSTEM_PROMPT },
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
    systemInstruction: systemPrompt || PLANNER_SYSTEM_PROMPT
  })
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  if (!text) {
    throw new Error('No response from Gemini')
  }
  return text
}

export async function validateApiKey(
  provider: 'anthropic' | 'openai' | 'gemini',
  apiKey: string
): Promise<void> {
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

const SUBTASK_SYSTEM_PROMPT = `You are a task decomposition AI. Given a task title, optional notes, and a deadline, break the task into smaller subtasks with time estimates.

Rules:
- Decompose into 3-7 actionable subtasks
- Each subtask should be specific and completable in one sitting
- Estimate minutes realistically (15-120 minutes per subtask)
- Order subtasks logically (dependencies first)
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
{
  "subtasks": [
    { "title": "Subtask description", "estimatedMinutes": 30 }
  ]
}`

const WORK_BACKWARDS_SYSTEM_PROMPT = `You are a project scheduling AI. Given a task with a deadline, break it into subtasks and schedule them across days leading up to the deadline.

Rules:
- Decompose into 3-7 actionable subtasks
- Schedule subtasks working backwards from the deadline
- NEVER schedule over existing calendar events
- NEVER schedule over the lunch break period — keep it free
- Keep all work within specified working hours
- Include breaks between tasks
- Leave buffer time before the deadline
- Estimate task durations realistically
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

Break this into subtasks and schedule them across days. Return JSON only.`
}

async function callAiWithPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
  const settings = getSettings()
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
  const responseText = await callAiWithPrompt(SUBTASK_SYSTEM_PROMPT, prompt)
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
  const responseText = await callAiWithPrompt(WORK_BACKWARDS_SYSTEM_PROMPT, prompt)
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

const RENAME_SYSTEM_PROMPT = `You are a task improvement AI. Given a list of tasks with their current titles and notes, improve them.

Rules:
- Make titles concise, action-oriented, and clear (start with a verb)
- If notes are empty, add a brief 1-line note with context or first step
- If notes exist, clean them up for clarity but preserve meaning
- Do NOT change the meaning or scope of the task
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
{
  "renames": [
    { "taskId": "id-here", "newTitle": "Improved title", "newNotes": "Improved or added notes" }
  ]
}`

interface RenameTask {
  id: string
  title: string
  notes?: string
}

function buildRenamePrompt(tasks: RenameTask[]): string {
  const tasksList = tasks
    .map((t) => {
      let desc = `- [${t.id}] Title: "${t.title}"`
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
  const responseText = await callAiWithPrompt(RENAME_SYSTEM_PROMPT, prompt)
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

export async function generatePlan(request: PlanRequest): Promise<DayPlan> {
  const settings = getSettings()
  const apiKey = getDecryptedApiKey()

  if (!apiKey) {
    throw new Error('No AI API key configured. Go to Settings to add one.')
  }

  const prompt = buildPrompt(request)
  let responseText: string

  if (settings.aiProvider === 'openai') {
    responseText = await callOpenAI(apiKey, prompt)
  } else if (settings.aiProvider === 'gemini') {
    responseText = await callGemini(apiKey, prompt)
  } else {
    responseText = await callAnthropic(apiKey, prompt)
  }

  return parseAiResponse(responseText)
}
