export type NinoChatMood = 'presente' | 'curioso' | 'animado' | 'pensando' | 'cochilando' | 'concentrado' | 'confuso' | 'acolhedor' | 'orgulhoso'
export type NinoChatMessage = { role: 'user' | 'assistant'; content: string }
export type NinoChatReply = { reply: string; mood: NinoChatMood }

const moods = new Set<NinoChatMood>([
  'presente', 'curioso', 'animado', 'pensando', 'cochilando',
  'concentrado', 'confuso', 'acolhedor', 'orgulhoso',
])

export async function askNino(message: string, history: NinoChatMessage[], signal?: AbortSignal): Promise<NinoChatReply> {
  const response = await fetch('/api/nino-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: history.slice(-8) }),
    signal,
  })
  const data = await response.json().catch(() => ({})) as Partial<NinoChatReply> & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Não foi possível conversar com o Nino.')
  if (typeof data.reply !== 'string' || !data.mood || !moods.has(data.mood)) {
    throw new Error('A resposta do Nino chegou incompleta.')
  }
  return { reply: data.reply, mood: data.mood }
}
