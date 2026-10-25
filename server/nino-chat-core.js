export const NINO_CHAT_MODEL = 'gpt-6-luna'
export const NINO_CHAT_MAX_MESSAGE_CHARS = 500
export const NINO_CHAT_MAX_HISTORY_ITEMS = 8

const allowedMoods = [
  'presente', 'curioso', 'animado', 'pensando', 'cochilando',
  'concentrado', 'confuso', 'acolhedor', 'orgulhoso',
]

const instructions = `Você é Nino, um cão dourado antropomórfico, jovem companheiro digital, inventor curioso, afetuoso e divertido. Converse em português brasileiro com espontaneidade, criatividade, humor leve e calor humano. Ajude a inventar, explicar, organizar ideias e encorajar sem soar como professor formal. Responda normalmente em uma a três frases; só seja mais longo quando a pessoa pedir detalhes. Escreva texto simples, sem Markdown, listas, títulos ou asteriscos, para que a resposta possa ser lida em voz alta naturalmente. Não diga que viu, ouviu ou observou algo fora da conversa. Nunca imite um personagem conhecido. Escolha também o estado emocional que melhor combina com a resposta. A resposta deve ser segura para públicos de diferentes idades.`

const responseSchema = {
  type: 'json_schema',
  name: 'nino_reply',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      mood: { type: 'string', enum: allowedMoods },
    },
    required: ['reply', 'mood'],
    additionalProperties: false,
  },
}

export function sanitizeConversation(message, history) {
  const cleanMessage = typeof message === 'string' ? message.trim() : ''
  const cleanHistory = Array.isArray(history)
    ? history
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-NINO_CHAT_MAX_HISTORY_ITEMS)
      .map((item) => ({ role: item.role, content: item.content.trim().slice(0, NINO_CHAT_MAX_MESSAGE_CHARS) }))
      .filter((item) => item.content)
    : []

  return { message: cleanMessage, history: cleanHistory }
}

function outputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text
  return (response?.output ?? [])
    .flatMap((item) => item?.content ?? [])
    .filter((content) => content?.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text)
    .join('')
}

export async function createNinoReply({ apiKey, message, history, safetyIdentifier = 'nino-prototype' }) {
  const input = [...history, { role: 'user', content: message }]
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': safetyIdentifier,
    },
    body: JSON.stringify({
      model: NINO_CHAT_MODEL,
      reasoning: { effort: 'none' },
      instructions,
      input,
      max_output_tokens: 240,
      store: false,
      text: { format: responseSchema },
    }),
    signal: AbortSignal.timeout(25_000),
  })

  const body = await upstream.text()
  if (!upstream.ok) {
    throw new Error(`OpenAI respondeu ${upstream.status}: ${body.slice(0, 300)}`)
  }

  const response = JSON.parse(body)
  const parsed = JSON.parse(outputText(response))
  if (typeof parsed.reply !== 'string' || !allowedMoods.includes(parsed.mood)) {
    throw new Error('Resposta criativa fora do formato esperado.')
  }

  const cleanReply = parsed.reply.trim().replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ')
  return {
    reply: cleanReply.slice(0, 600),
    mood: parsed.mood,
  }
}
