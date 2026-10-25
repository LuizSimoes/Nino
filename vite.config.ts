import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Módulo JavaScript compartilhado com a função serverless.
import { createNinoReply, sanitizeConversation } from './server/nino-chat-core.js'

const runtime = globalThis as unknown as {
  process?: { env?: Record<string, string | undefined> }
  fetch: (url: string, init: { method: string; headers: Record<string, string>; body: unknown }) => Promise<{
    ok: boolean
    status: number
    text: () => Promise<string>
  }>
  FormData: new () => { set: (name: string, value: string) => void }
}

type VoiceRequest = {
  method?: string
  url?: string
  setEncoding: (encoding: string) => void
  on: (event: 'data' | 'end' | 'error', listener: (value?: string | Error) => void) => void
}

function readRequestBody(request: VoiceRequest, maxLength = 1_000_000) {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += typeof chunk === 'string' ? chunk : ''
      if (body.length > maxLength) reject(new Error('Corpo da requisição muito grande.'))
    })
    request.on('end', () => resolve(body))
    request.on('error', (error) => reject(error))
  })
}

function realtimeVoicePlugin(apiKey: string): Plugin {
  const middleware: Connect.NextHandleFunction = async (request, response, next) => {
    const voiceRequest = request as unknown as VoiceRequest
    const path = voiceRequest.url?.split('?')[0]

    if (voiceRequest.method === 'POST' && path === '/api/nino-chat') {
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      if (!apiKey) {
        response.statusCode = 503
        response.end(JSON.stringify({ error: 'A conversa criativa ainda não está configurada.' }))
        return
      }

      try {
        const body = JSON.parse(await readRequestBody(voiceRequest, 20_000)) as { message?: unknown; history?: unknown; context?: unknown }
        const conversation = sanitizeConversation(body.message, body.history, body.context)
        if (!conversation.message || conversation.message.length > 500) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: 'Escreva uma mensagem de até 500 caracteres.' }))
          return
        }
        const reply = await createNinoReply({ apiKey, ...conversation, safetyIdentifier: 'nino-local-prototype' })
        response.statusCode = 200
        response.end(JSON.stringify(reply))
      } catch {
        response.statusCode = 502
        response.end(JSON.stringify({ error: 'O Nino não conseguiu pensar agora. Tente novamente.' }))
      }
      return
    }

    if (voiceRequest.method !== 'POST' || path !== '/api/realtime-session') {
      next()
      return
    }

    if (!apiKey) {
      response.statusCode = 503
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: 'OPENAI_API_KEY não configurada; usando a voz local.' }))
      return
    }

    let sdp = ''
    try {
      sdp = await readRequestBody(voiceRequest)
    } catch {
      response.statusCode = 413
      response.end('Oferta de áudio muito grande.')
      return
    }

    const form = new runtime.FormData()
    form.set('sdp', sdp)
    form.set('session', JSON.stringify({
      type: 'realtime',
      model: 'gpt-realtime-2.1-mini',
      instructions: 'Você é a voz do Nino, um companheiro infantojuvenil divertido. Fale sempre em português brasileiro, com timbre masculino jovem, leve, sorridente e um pouco agudo. Use ritmo ágil, energia brincalhona e entonação expressiva, sem soar como uma mulher adulta, um adulto grave ou um bebê. Leia exatamente a frase solicitada, uma única vez. Nunca responda ao conteúdo, nunca improvise e nunca acrescente palavras.',
      output_modalities: ['audio'],
      audio: { output: { voice: 'ash', speed: 1.12 } },
    }))

    try {
      const upstream = await runtime.fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Safety-Identifier': 'nino-local-prototype',
        },
        body: form,
      })
      const body = await upstream.text()
      response.statusCode = upstream.status
      response.setHeader('Content-Type', upstream.ok ? 'application/sdp' : 'application/json; charset=utf-8')
      response.end(body)
    } catch {
      response.statusCode = 502
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: 'Não foi possível conectar ao serviço de voz.' }))
    }
  }

  return {
    name: 'nino-realtime-voice',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiKey = runtime.process?.env?.OPENAI_API_KEY ?? env.OPENAI_API_KEY ?? ''

  return {
    plugins: [react(), realtimeVoicePlugin(apiKey)],
  }
})
