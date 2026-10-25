import {
  NINO_CHAT_MAX_MESSAGE_CHARS,
  NINO_CHAT_MAX_BODY_BYTES,
  createNinoReply,
  sanitizeConversation,
} from '../server/nino-chat-core.js'

const MAX_BODY_BYTES = NINO_CHAT_MAX_BODY_BYTES
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_REQUESTS = 12
const attemptsByAddress = new Map()

function normalizeOrigin(value) {
  return value?.trim().replace(/\/$/, '') ?? ''
}

function headerValue(request, name) {
  const value = request.headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

function isAllowedOrigin(request) {
  const origin = normalizeOrigin(headerValue(request, 'origin'))
  if (!origin) return true

  const configured = (process.env.NINO_ALLOWED_ORIGIN ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)

  if (configured.length > 0) return configured.includes(origin)
  const host = headerValue(request, 'x-forwarded-host') ?? headerValue(request, 'host')
  const protocol = headerValue(request, 'x-forwarded-proto') ?? 'https'
  return Boolean(host && origin === `${protocol}://${host}`)
}

function clientAddress(request) {
  const forwarded = headerValue(request, 'x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.socket?.remoteAddress || 'unknown'
}

function isRateLimited(request) {
  const now = Date.now()
  const address = clientAddress(request)
  const previous = attemptsByAddress.get(address)
  if (!previous || now - previous.startedAt >= RATE_LIMIT_WINDOW_MS) {
    attemptsByAddress.set(address, { count: 1, startedAt: now })
    return false
  }
  previous.count += 1
  return previous.count > RATE_LIMIT_REQUESTS
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object' && !(request.body instanceof Uint8Array)) {
    if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > MAX_BODY_BYTES) throw new RangeError('BODY_TOO_LARGE')
    return request.body
  }
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body, 'utf8') > MAX_BODY_BYTES) throw new RangeError('BODY_TOO_LARGE')
    return JSON.parse(request.body)
  }
  if (request.body instanceof Uint8Array) {
    if (request.body.byteLength > MAX_BODY_BYTES) throw new RangeError('BODY_TOO_LARGE')
    return JSON.parse(new TextDecoder().decode(request.body))
  }

  let body = ''
  for await (const chunk of request) {
    body += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) throw new RangeError('BODY_TOO_LARGE')
  }
  return JSON.parse(body)
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export default async function ninoChat(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'Método não permitido.' })
    return
  }
  if (!isAllowedOrigin(request)) {
    sendJson(response, 403, { error: 'Origem não autorizada.' })
    return
  }
  if (isRateLimited(request)) {
    response.setHeader('Retry-After', '60')
    sendJson(response, 429, { error: 'Muitas mensagens. Aguarde um minuto.' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    sendJson(response, 503, { error: 'A conversa criativa ainda não está configurada.' })
    return
  }

  try {
    const payload = await readJson(request)
    const conversation = sanitizeConversation(payload?.message, payload?.history, payload?.context, payload?.image, payload?.code, payload?.pdf)
    if (!conversation.message || conversation.message.length > NINO_CHAT_MAX_MESSAGE_CHARS) {
      sendJson(response, 400, { error: 'Escreva uma mensagem de até 4000 caracteres.' })
      return
    }

    const reply = await createNinoReply({ apiKey, ...conversation })
    sendJson(response, 200, reply)
  } catch (error) {
    if (error instanceof TypeError && ['PDF_INVALID', 'PDF_UNREADABLE'].includes(error.message)) {
      sendJson(response, 400, { error: 'Não consegui ler o PDF. Use um documento completo, sem senha, ou exporte somente as páginas relevantes.' })
      return
    }
    if (error instanceof TypeError && ['CODE_INVALID', 'ATTACHMENT_CONFLICT'].includes(error.message)) {
      sendJson(response, 400, { error: 'Anexo inválido. Envie somente uma imagem, código/texto UTF-8 ou PDF.' })
      return
    }
    if (error instanceof TypeError && error.message === 'IMAGE_INVALID') {
      sendJson(response, 400, { error: 'Imagem inválida. Use PNG, JPEG ou WebP.' })
      return
    }
    if (error instanceof RangeError) {
      sendJson(response, 413, { error: error.message === 'PDF_TOO_LARGE' ? 'O PDF deve ter até 2 MB. Exporte somente as páginas relevantes.' : 'Mensagem ou anexo muito grande.' })
      return
    }
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: 'Mensagem inválida.' })
      return
    }
    console.error('[nino-chat] Falha ao criar resposta:', error)
    sendJson(response, 502, { error: 'O Nino não conseguiu pensar agora. Tente novamente.' })
  }
}
