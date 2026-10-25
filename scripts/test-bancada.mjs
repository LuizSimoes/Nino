import assert from 'node:assert/strict'
import { sanitizeConversation, sanitizeLabContext } from '../server/nino-chat-core.js'

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
