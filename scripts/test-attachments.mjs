import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformWithOxc } from 'vite'

// Executa o leitor real do cliente sem navegador e sem transmitir arquivos.
const compile = async (path) => (await transformWithOxc(readFileSync(new URL(path, import.meta.url), 'utf8'), path, { lang: 'ts' })).code
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const imageUrl = moduleUrl(await compile('../src/labImage.ts'))
const attachmentSource = (await compile('../src/labAttachment.ts')).replace(/['"]\.\/labImage['"]/, JSON.stringify(imageUrl))
const { prepareLabAttachment, mergeLabAttachments, attachmentBytes } = await import(moduleUrl(attachmentSource))
const source = 'void setup() {}\nvoid loop() {\n  delay(5000);\n}\n'
const result = await prepareLabAttachment(new File([source], 'teste.ino', { type: 'application/octet-stream' }))
assert.equal(result.kind, 'code')
assert.equal(result.code.text, source)
assert.equal(result.code.name, 'teste.ino')
await assert.rejects(prepareLabAttachment(new File(['x'.repeat(24001)], 'longo.py')), /24 mil/)
await assert.rejects(prepareLabAttachment(new File([new Uint8Array(65537)], 'grande.cpp')), /64 KB/)
await assert.rejects(prepareLabAttachment(new File([new Uint8Array([255, 255])], 'invalido.ino')), /UTF-8/)
await assert.rejects(prepareLabAttachment(new File(['\u0000binary'], 'binario.c')), /texto válido/)
await assert.rejects(prepareLabAttachment(new File([''], 'vazio.h')), /vazio/)
await assert.rejects(prepareLabAttachment(new File(['texto'], 'documento.docx')), /Formato/)
console.log('Anexos: identificação por extensão, conteúdo integral, UTF-8, formatos e limites aprovados.')

// Envelope sintético: valida transporte, não certifica a estrutura interna do PDF.
const pdfEnvelope = '%PDF-1.4\n% synthetic transport fixture\n%%EOF\n'
const preparedPdf = await prepareLabAttachment(new File([pdfEnvelope], 'teste.pdf', { type: 'application/pdf' }))
assert.equal(preparedPdf.kind, 'pdf')
assert.equal(preparedPdf.pdf.data, `data:application/pdf;base64,${Buffer.from(pdfEnvelope).toString('base64')}`)
assert.equal(preparedPdf.size, Buffer.byteLength(pdfEnvelope))
await assert.rejects(prepareLabAttachment(new File(['texto'], 'falso.pdf')), /PDF completo/)
await assert.rejects(prepareLabAttachment(new File(['%PDF-1.4\ntruncado'], 'incompleto.pdf')), /PDF completo/)
await assert.rejects(prepareLabAttachment(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.pdf')), /2 MB/)
console.log('PDF: identificação, envelope, conteúdo integral e limite de 2 MB aprovados.')

const imageAttachment = { kind: 'image', name: 'esquema.png', image: 'data:image/png;base64,iVBORw0KGgo=' }
const originals = [preparedPdf]
const combined = mergeLabAttachments(originals, [result, imageAttachment])
assert.equal(combined.length, 3)
assert.equal(originals.length, 1)
assert.equal(attachmentBytes(result), Buffer.byteLength(source))
assert.equal(attachmentBytes(preparedPdf), Buffer.byteLength(pdfEnvelope))
assert.equal(attachmentBytes(imageAttachment), 8)
assert.throws(() => mergeLabAttachments(originals, [preparedPdf]), /arquivo de cada tipo/)
assert.throws(() => mergeLabAttachments(combined, [result]), /até três/)
const fullPdfBytes = Buffer.alloc(2 * 1024 * 1024, 32)
fullPdfBytes.write('%PDF-1.4\n')
fullPdfBytes.write('%%EOF\n', fullPdfBytes.length - 6)
const fullPdf = await prepareLabAttachment(new File([fullPdfBytes], 'limite.pdf'))
assert.equal(mergeLabAttachments([], [fullPdf]).length, 1)
assert.throws(() => mergeLabAttachments([fullPdf], [result]), /juntos devem ter até 2 MB/)
assert.deepEqual(originals, [preparedPdf])
console.log('Anexos conjuntos: seleção incremental, tipos únicos, limite total e preservação da seleção aprovados.')

const { responseText, conversationText } = await import(moduleUrl(await compile('../src/conversationExport.ts')))
const answer = { role: 'assistant', content: 'Botão pressionado = LOW.\nUse debounce.', code: 'void loop() {\n  ler_botao();\n}\n' }
assert.equal(responseText(answer), `${answer.content}\n\n${answer.code}`)
const messages = [{ role: 'user', content: 'Corrija o contador.', attachmentName: 'teste.ino' }, answer]
const exported = conversationText(messages)
assert.ok(exported.includes('Você\nAnexo: teste.ino\nCorrija o contador.'))
assert.ok(exported.includes(`Nino\n${answer.content}\n\n${answer.code}`))
assert.equal(conversationText([]), '')
console.log('Revisão: exportação preserva resposta, código, indentação, acentos e ordem da conversa.')

const sessionsSource = (await compile('../src/labSessions.ts')).replace(/['"]\.\/labAttachment['"]/, JSON.stringify(moduleUrl(attachmentSource)))
const { packSession, unpackSession } = await import(moduleUrl(sessionsSource))
const snapshot = {
  messages: [{ role: 'user', content: 'Veja o esquema.', image: imageAttachment.image }, { role: 'assistant', content: 'Primeira análise.', image: imageAttachment.image, code: answer.code }],
  context: { objective: 'Controlar temperatura', platform: 'ESP32', power: '3,3 V', instruments: 'Multímetro' },
  attachments: combined,
  draft: 'x'.repeat(4100),
}
const savedSession = packSession(snapshot, '  Bancada de teste  ', 'test-session')
assert.equal(savedSession.images.length, 1)
assert.equal(savedSession.name, 'Bancada de teste')
assert.deepEqual(unpackSession(savedSession), snapshot)
savedSession.context.platform = 'RP2040'
assert.equal(snapshot.context.platform, 'ESP32')
assert.throws(() => unpackSession({ ...savedSession, version: 9 }), /formato inválido/)
assert.throws(() => unpackSession({ ...savedSession, images: ['https://example.com/remote.png'] }), /imagem da sessão/)
assert.throws(() => unpackSession({ ...savedSession, images: [] }), /imagem da sessão/)
assert.throws(() => unpackSession({ ...savedSession, context: { ...savedSession.context, power: null } }), /contexto da sessão/)
console.log('Sessões: conversa, contexto, rascunho e três anexos preservados; imagens deduplicadas e dados inválidos rejeitados.')
