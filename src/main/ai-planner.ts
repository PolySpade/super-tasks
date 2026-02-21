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

interface TimeBlock {
  taskId: string
  taskTitle: string
  start: string
  end: string
  reason: string
}

interface DayPlan {
  blocks: TimeBlock[]
  summary: string
}

interface PlanRequest {
  date: string
  tasks: PlanTask[]
  existingEvents: CalendarEvent[]
  workingHours: { start: string; end: string }
  breakMinutes: number
}

const PLANNER_SYSTEM_PROMPT = `You are a day planner AI. Given a list of tasks and existing calendar events, create an optimal daily schedule.

Rules:
- NEVER schedule over existing calendar events
- Schedule high-effort or complex tasks earlier in the day when energy is highest
- Include breaks between tasks (use the specified break duration)
- Prioritize tasks with closer due dates
- Tasks without due dates should still be scheduled sensibly
- Keep all tasks within the specified working hours
- Estimate task duration based on the title and notes (default 30-60 minutes)
- Return ONLY valid JSON, no markdown fences or extra text

Return JSON in this exact format:
{
  "blocks": [
    {
      "taskId": "task-id-here",
      "taskTitle": "Task title",
      "start": "HH:MM",
      "end": "HH:MM",
      "reason": "Brief reason for this time slot"
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
      taskId: b.taskId || '',
      taskTitle: b.taskTitle || '',
      start: b.start || '',
      end: b.end || '',
      reason: b.reason || ''
    })),
    summary: parsed.summary || ''
  }
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: PLANNER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  })
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Anthropic')
  }
  return textBlock.text
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  })
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }
  return content
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: PLANNER_SYSTEM_PROMPT
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
