import { getSettings, getDecryptedApiKey } from './settings-store'

export interface ParsedCapture {
  title: string
  due?: string
  energyLevel?: 'high' | 'medium' | 'low'
  timeBoxMinutes?: number
  notes?: string
}

const CAPTURE_SYSTEM_PROMPT = `You are a task parser. Given natural language input, extract structured task information.

Rules:
- Extract the task title (the core action)
- Extract due date relative to today if mentioned (tomorrow, next Monday, Friday, etc.)
- Extract energy level if mentioned (high energy, low energy, medium energy, hard, easy, etc.)
- Extract time estimate if mentioned (30min, 1 hour, 2h, 45 minutes, etc.)
- Any remaining context goes into notes
- If no structured data is found, just return the title
- Return ONLY valid JSON, no markdown fences or extra text
- For dates, return ISO format YYYY-MM-DD

Today's date is: DATE_PLACEHOLDER

Return JSON in this exact format:
{
  "title": "The task title",
  "due": "YYYY-MM-DD or null",
  "energyLevel": "high|medium|low or null",
  "timeBoxMinutes": number or null,
  "notes": "any extra context or null"
}`

function tryLocalParse(input: string): ParsedCapture {
  let text = input.trim()
  let due: string | undefined
  let energyLevel: 'high' | 'medium' | 'low' | undefined
  let timeBoxMinutes: number | undefined

  const today = new Date()

  // Extract "tomorrow"
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    due = d.toISOString().split('T')[0]
    text = text.replace(/\btomorrow\b/i, '').trim()
  }

  // Extract "today"
  if (/\btoday\b/i.test(text)) {
    due = today.toISOString().split('T')[0]
    text = text.replace(/\btoday\b/i, '').trim()
  }

  // Extract "next monday", "next tuesday", etc.
  const dayMatch = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if (dayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase())
    const d = new Date(today)
    const diff = (targetDay - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + diff)
    due = d.toISOString().split('T')[0]
    text = text.replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, '').trim()
  }

  // Extract energy level
  if (/\bhigh\s*energy\b/i.test(text) || /\bhard\b/i.test(text)) {
    energyLevel = 'high'
    text = text.replace(/\bhigh\s*energy\b/i, '').replace(/\bhard\b/i, '').trim()
  } else if (/\blow\s*energy\b/i.test(text) || /\beasy\b/i.test(text)) {
    energyLevel = 'low'
    text = text.replace(/\blow\s*energy\b/i, '').replace(/\beasy\b/i, '').trim()
  } else if (/\bmedium\s*energy\b/i.test(text)) {
    energyLevel = 'medium'
    text = text.replace(/\bmedium\s*energy\b/i, '').trim()
  }

  // Extract time estimate
  const timeMatch = text.match(/\b(\d+)\s*(min|mins|minutes|m|hour|hours|h|hr|hrs)\b/i)
  if (timeMatch) {
    const num = parseInt(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()
    if (unit.startsWith('h')) {
      timeBoxMinutes = num * 60
    } else {
      timeBoxMinutes = num
    }
    text = text.replace(timeMatch[0], '').trim()
  }

  // Clean up extra spaces and trailing punctuation
  text = text.replace(/\s+/g, ' ').replace(/^[\s,\-]+|[\s,\-]+$/g, '').trim()

  return {
    title: text || input.trim(),
    due,
    energyLevel,
    timeBoxMinutes
  }
}

export async function parseCapture(input: string): Promise<ParsedCapture> {
  // Try AI parsing first
  try {
    const settings = getSettings()
    const apiKey = getDecryptedApiKey()

    if (apiKey) {
      const today = new Date().toISOString().split('T')[0]
      const systemPrompt = CAPTURE_SYSTEM_PROMPT.replace('DATE_PLACEHOLDER', today)

      let responseText: string
      if (settings.aiProvider === 'openai') {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey })
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ]
        })
        responseText = response.choices[0]?.message?.content || ''
      } else if (settings.aiProvider === 'gemini') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction: systemPrompt
        })
        const result = await model.generateContent(input)
        responseText = result.response.text()
      } else {
        const { default: Anthropic } = await import('@anthropic-ai/sdk')
        const anthropic = new Anthropic({ apiKey })
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: systemPrompt,
          messages: [{ role: 'user', content: input }]
        })
        const textBlock = response.content.find((block) => block.type === 'text')
        responseText = textBlock?.type === 'text' ? textBlock.text : ''
      }

      let cleaned = responseText.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
      }
      const data = JSON.parse(cleaned)
      return {
        title: data.title || input.trim(),
        due: data.due || undefined,
        energyLevel: data.energyLevel || undefined,
        timeBoxMinutes: data.timeBoxMinutes || undefined,
        notes: data.notes || undefined
      }
    }
  } catch {
    // Fall through to local parsing
  }

  return tryLocalParse(input)
}
