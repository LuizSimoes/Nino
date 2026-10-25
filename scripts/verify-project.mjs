import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (path) => readFileSync(join(root, path), 'utf8')
const fail = (message) => {
  console.error(`Falha: ${message}`)
  process.exitCode = 1
}

const moods = [
  'presente', 'curioso', 'animado', 'pensando', 'cochilando',
  'concentrado', 'confuso', 'acolhedor', 'orgulhoso',
]
const app = read('src/App.tsx')
const voice = read('src/realtimeVoice.ts')
const api = read('api/realtime-session.js')
const ninoFace = app.slice(app.indexOf('function NinoFace('), app.indexOf('function App()'))

for (const mood of moods) {
  if (!app.includes(`'${mood}'`)) fail(`estado ${mood} ausente do tipo NinoMood`)
  if (!app.includes(`${mood}: '`)) fail(`legenda do estado ${mood} ausente`)
  if (!ninoFace.includes(`${mood}: { arms:`)) fail(`pose do estado ${mood} ausente`)
}

for (const event of [
  'response.created',
  'output_audio_buffer.started',
  'output_audio_buffer.stopped',
  'response.done',
  'response.cancel',
  'output_audio_buffer.clear',
  'nino_request_id',
]) {
  if (!voice.includes(event)) fail(`evento de voz ${event} ausente`)
}

for (const safeguard of [
  'OPENAI_API_KEY',
  'NINO_ALLOWED_ORIGIN',
  'Cache-Control',
  'no-store',
  'RATE_LIMIT_REQUESTS',
  'MAX_SDP_BYTES',
]) {
  if (!api.includes(safeguard)) fail(`proteção da API ${safeguard} ausente`)
}

const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)

if (tracked.includes('.env.local')) fail('.env.local está versionado')

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.ts', '.tsx'])
for (const path of tracked) {
  const extension = path.slice(path.lastIndexOf('.'))
  if (!textExtensions.has(extension)) continue
  if (/\bsk-[A-Za-z0-9_-]{20,}\b/.test(read(path))) fail(`possível chave exposta em ${path}`)
}

if (!process.exitCode) {
  console.log('Verificação do Nino concluída: 9 expressões, voz, API e segredos conferidos.')
}
