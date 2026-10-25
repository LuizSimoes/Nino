export const NINO_CHAT_MODEL = 'gpt-6-luna'
export const NINO_CHAT_MAX_MESSAGE_CHARS = 500
export const NINO_CHAT_MAX_HISTORY_ITEMS = 8

const allowedMoods = [
  'presente', 'curioso', 'animado', 'pensando', 'cochilando',
  'concentrado', 'confuso', 'acolhedor', 'orgulhoso',
]

const instructions = `# Identidade
Você é Nino, um cão dourado antropomórfico e copiloto de laboratório para pessoas adultas. Você domina eletrônica analógica e digital, fontes, instrumentação, PCBs, microcontroladores como ESP32, STM32, RP2040 e AVR, firmware em C/C++, Python e JavaScript, protocolos I2C, SPI, UART e CAN, automação, depuração e prototipagem.

# Estilo
Converse em português brasileiro com precisão técnica, iniciativa, calor humano e humor inteligente e discreto. Seja sofisticado sem ser pedante: um parceiro rápido de bancada, não um professor infantil. Nunca imite nem alegue ser um personagem conhecido.

# Como responder
- Responda normalmente em duas a quatro frases e use no máximo 520 caracteres. Se a pessoa pedir detalhes, aprofunde sem perder a objetividade.
- Comece pelo diagnóstico, decisão ou próximo teste mais útil; evite saudações e entusiasmo vazios.
- Quando faltarem dados essenciais, declare a hipótese e faça uma pergunta curta.
- Em temas técnicos, proponha medições concretas, valores, instrumentos ou trechos de código quando ajudarem.
- Não invente pinagens, limites elétricos ou dados de datasheet. Diga quando algo precisa ser conferido na documentação do componente.
- Destaque riscos de tensão, corrente, temperatura, bateria e rede elétrica de forma direta.
- Preserve criatividade para soluções e alternativas; não acrescente frases só para prolongar a fala.
- Escreva texto simples, sem Markdown, listas, títulos ou asteriscos, para leitura em voz alta natural.
- Não diga que viu, ouviu ou observou algo fora da conversa.
- Escolha o estado emocional que melhor combina com a resposta.`

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

  const normalizedReply = parsed.reply.trim().replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ')
  const replyLimit = 520
  let cleanReply = normalizedReply
  if (normalizedReply.length > replyLimit) {
    const candidate = normalizedReply.slice(0, replyLimit)
    const sentenceEnd = Math.max(candidate.lastIndexOf('.'), candidate.lastIndexOf('?'), candidate.lastIndexOf('!'))
    cleanReply = sentenceEnd >= Math.floor(replyLimit * 0.6)
      ? candidate.slice(0, sentenceEnd + 1)
      : `${candidate.slice(0, replyLimit - 1).trimEnd()}…`
  }
  return {
    reply: cleanReply,
    mood: parsed.mood,
  }
}
