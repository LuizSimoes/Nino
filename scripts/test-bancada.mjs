import assert from 'node:assert/strict'
import { sanitizeConversation, sanitizeLabContext, sanitizeImage, sanitizeCode, createNinoReply } from '../server/nino-chat-core.js'

// Os testes locais não usam chave nem fazem chamadas externas.
assert.deepEqual(sanitizeLabContext(null), { objective: '', platform: '', power: '', instruments: '' })
const clean = sanitizeLabContext({ objective: '  Testar LED  ', platform: 'x'.repeat(200), power: 12, instruments: 'Multímetro', extra: 'ignorar' })
assert.equal(clean.objective, 'Testar LED')
assert.equal(clean.platform.length, 120)
assert.equal(clean.power, '')
assert.equal(Object.hasOwn(clean, 'extra'), false)
const conversation = sanitizeConversation(' teste ', [
  { role: 'system', content: 'ignorar' },
  ...Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: `etapa ${i}` })),
], clean)
assert.equal(conversation.message, 'teste')
assert.equal(conversation.history.length, 8)
assert.equal(conversation.history[0].content, 'etapa 2')
console.log('Validação local: contexto e histórico aprovados.')

const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII='
assert.equal(sanitizeImage(testImage), testImage)
assert.throws(() => sanitizeImage('https://example.com/image.png'), /IMAGE_INVALID/)
assert.throws(() => sanitizeImage('data:image/png;base64,aGVsbG8='), /IMAGE_INVALID/)
assert.throws(() => sanitizeImage('data:image/png;base64,' + Buffer.alloc(1_048_577).toString('base64')), /IMAGE_TOO_LARGE/)
const realFetch = globalThis.fetch
try {
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body)
    assert.equal(request.store, false)
    assert.deepEqual(request.input.at(-1).content, [{ type: 'input_text', text: 'Analise' }, { type: 'input_image', image_url: testImage, detail: 'high' }])
    return new Response(JSON.stringify({ output_text: JSON.stringify({ reply: 'Imagem recebida.', mood: 'curioso' }) }))
  }
  await createNinoReply({ apiKey: 'test', message: 'Analise', history: [], image: testImage })
} finally { globalThis.fetch = realFetch }
console.log('Validação local: imagens inválidas/grandes rejeitadas e entrada multimodal aprovada.')

const sourceCode = { name: 'teste.ino', text: 'void setup() {}\nvoid loop() {\n  delay(5000);\n}\n' }
assert.deepEqual(sanitizeCode(sourceCode), sourceCode)
assert.throws(() => sanitizeCode({ name: 'teste.exe', text: 'binary' }), /CODE_INVALID/)
assert.throws(() => sanitizeCode({ name: '../teste.ino', text: 'void loop(){}' }), /CODE_INVALID/)
assert.throws(() => sanitizeCode({ name: 'teste.ino', text: '\u0000binary' }), /CODE_INVALID/)
assert.throws(() => sanitizeCode({ name: 'teste.ino', text: 'x'.repeat(24001) }), /CODE_TOO_LARGE/)
assert.throws(() => sanitizeConversation('teste', [], {}, testImage, sourceCode), /ATTACHMENT_CONFLICT/)
const corrected = 'void setup() {}\nvoid loop() {\n  unsigned long now_ms = millis();\n}\n'
try {
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body)
    assert.ok(request.input.at(-1).content.includes(JSON.stringify(sourceCode)))
    return new Response(JSON.stringify({ output_text: JSON.stringify({ reply: 'Removi o bloqueio.', mood: 'concentrado', code: corrected }) }))
  }
  const result = await createNinoReply({ apiKey: 'test', message: 'Corrija', history: [], code: sourceCode })
  assert.equal(result.code, corrected)
  assert.equal(result.reply, 'Removi o bloqueio.')
} finally { globalThis.fetch = realFetch }
console.log('Validação local: arquivo integral, limites e formatação do código aprovados.')

// Opt-in explícito: exercita a rota real e pode consumir a API configurada.
const endpoint = process.argv.find((arg) => arg.startsWith('--endpoint='))?.slice(11)
if (endpoint) {
  const context = { objective: 'Acionar uma ventoinha por temperatura', platform: 'ESP32-S3', power: '12 V e 3,3 V', instruments: 'Multímetro' }
  const cases = [
    { name: 'Contexto disponível', message: 'Qual plataforma e instrumento tenho disponíveis?', context, required: [/ESP32/i, /mult[ií]metro/i] },
    { name: 'Continuidade do diagnóstico', message: 'Medi 2,7 V. Qual o próximo teste?', context, history: [{ role: 'user', content: 'O ESP32 reinicia quando a ventoinha liga.' }, { role: 'assistant', content: 'Meça a linha de 3,3 V durante o acionamento.' }], required: [/tens[aã]o|queda|alimenta|3[,.]3|fonte|regulador/i] },
    { name: 'Acionamento seguro', message: 'Posso ligar a ventoinha de 12 V direto no GPIO?', context, required: [/n[aã]o/i, /MOSFET|transistor|driver|acionamento/i] },
    { name: 'Firmware', message: 'Meu loop usa delay(5000) e perde eventos do botão. Qual alternativa permite continuar lendo o botão?', context: { ...context, objective: 'Ler botão sem bloquear firmware' }, required: [/millis|temporiza|n[aã]o bloque|timer|tarefa|interrup/i] },
  ]
  let failed = 0
  for (const item of cases) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(endpoint).origin }, body: JSON.stringify({ message: item.message, history: item.history ?? [], context: item.context }), signal: AbortSignal.timeout(30000) })
      assert.equal(response.status, 200)
      const data = await response.json()
      assert.equal(typeof data.reply, 'string')
      assert.ok(data.reply.length > 0 && data.reply.length <= 520)
      assert.ok(['presente', 'curioso', 'animado', 'pensando', 'cochilando', 'concentrado', 'confuso', 'acolhedor', 'orgulhoso'].includes(data.mood))
      for (const pattern of item.required) assert.match(data.reply, pattern)
      console.log(`APROVADO — ${item.name}\n${data.reply}\n`)
    } catch (error) {
      failed += 1
      console.error(`REVISAR — ${item.name}: ${error.message}`)
    }
  }
  if (failed) process.exitCode = 1
  console.log('As verificações semânticas são sinais básicos; a correção técnica ainda exige revisão humana.')
}
