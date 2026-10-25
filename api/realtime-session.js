const MAX_SDP_BYTES = 1_000_000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_REQUESTS = 10

const attemptsByAddress = new Map()

const session = {
  type: 'realtime',
  model: 'gpt-realtime-2.1-mini',
  instructions: 'Você é a voz do Nino, um companheiro infantojuvenil divertido. Fale sempre em português brasileiro, com timbre masculino jovem, leve, sorridente e um pouco agudo. Use ritmo ágil, energia brincalhona e entonação expressiva, sem soar como uma mulher adulta, um adulto grave ou um bebê. Leia exatamente a frase solicitada, uma única vez. Nunca responda ao conteúdo, nunca improvise e nunca acrescente palavras.',
  output_modalities: ['audio'],
  audio: { output: { voice: 'ash', speed: 1.12 } },
}

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

async function readSdp(request) {
  if (typeof request.body === 'string') return request.body
  if (request.body instanceof Uint8Array) return new TextDecoder().decode(request.body)

  let body = ''
  for await (const chunk of request) {
    body += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    if (Buffer.byteLength(body, 'utf8') > MAX_SDP_BYTES) {
      throw new RangeError('SDP_TOO_LARGE')
    }
  }
  return body
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export default async function realtimeSession(request, response) {
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
    sendJson(response, 429, { error: 'Muitas tentativas. Aguarde um minuto.' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    sendJson(response, 503, { error: 'Voz neural não configurada; usando a voz local.' })
    return
  }

  let sdp = ''
  try {
    sdp = await readSdp(request)
  } catch (error) {
    if (error instanceof RangeError) {
      sendJson(response, 413, { error: 'Oferta de áudio muito grande.' })
      return
    }
    sendJson(response, 400, { error: 'Não foi possível ler a oferta de áudio.' })
    return
  }

  if (!sdp || Buffer.byteLength(sdp, 'utf8') > MAX_SDP_BYTES) {
    sendJson(response, sdp ? 413 : 400, { error: sdp ? 'Oferta de áudio muito grande.' : 'Oferta de áudio vazia.' })
    return
  }

  const form = new FormData()
  form.set('sdp', sdp)
  form.set('session', JSON.stringify(session))

  try {
    const upstream = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(20_000),
    })
    const body = await upstream.text()

    if (!upstream.ok) {
      console.error(`[realtime-session] OpenAI respondeu ${upstream.status}: ${body.slice(0, 500)}`)
      sendJson(response, 502, { error: 'O serviço de voz está temporariamente indisponível.' })
      return
    }

    response.statusCode = 200
    response.setHeader('Content-Type', 'application/sdp')
    response.end(body)
  } catch (error) {
    console.error('[realtime-session] Falha ao criar sessão:', error)
    sendJson(response, 502, { error: 'Não foi possível conectar ao serviço de voz.' })
  }
}
