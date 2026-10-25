export type NinoChatMood = 'presente' | 'curioso' | 'animado' | 'pensando' | 'cochilando' | 'concentrado' | 'confuso' | 'acolhedor' | 'orgulhoso'
import type { CodeAttachment } from './labAttachment'
export type NinoChatMessage = { role: 'user' | 'assistant'; content: string; image?: string; code?: string; attachmentName?: string }
export type NinoChatReply = { reply: string; mood: NinoChatMood; code?: string }
export type NinoLabContext = { objective: string; platform: string; power: string; instruments: string }

const moods = new Set<NinoChatMood>([
  'presente', 'curioso', 'animado', 'pensando', 'cochilando',
  'concentrado', 'confuso', 'acolhedor', 'orgulhoso',
])

export async function askNino(message: string, history: NinoChatMessage[], context: NinoLabContext, signal?: AbortSignal, image?: string, code?: CodeAttachment): Promise<NinoChatReply> {
  const response = await fetch('/api/nino-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: history.slice(-8).map(({ role, content, code }) => ({ role, content: code ? `${content}\n\n${code}` : content })), context, image, code }),
    signal,
  })
  const data = await response.json().catch(() => ({})) as Partial<NinoChatReply> & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Não foi possível conversar com o Nino.')
  if (typeof data.reply !== 'string' || !data.mood || !moods.has(data.mood)) {
    throw new Error('A resposta do Nino chegou incompleta.')
  }
  return { reply: data.reply, mood: data.mood, code: typeof data.code === 'string' ? data.code : undefined }
}
