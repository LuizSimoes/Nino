import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformWithOxc } from 'vite'

// Executa o leitor real do cliente sem navegador e sem transmitir arquivos.
const compile = async (path) => (await transformWithOxc(readFileSync(new URL(path, import.meta.url), 'utf8'), path, { lang: 'ts' })).code
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const imageUrl = moduleUrl(await compile('../src/labImage.ts'))
const attachmentSource = (await compile('../src/labAttachment.ts')).replace(/['"]\.\/labImage['"]/, JSON.stringify(imageUrl))
const { prepareLabAttachment } = await import(moduleUrl(attachmentSource))
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
await assert.rejects(prepareLabAttachment(new File(['texto'], 'documento.pdf')), /Formato/)
console.log('Anexos: identificação por extensão, conteúdo integral, UTF-8, formatos e limites aprovados.')

const { responseText, conversationText } = await import(moduleUrl(await compile('../src/conversationExport.ts')))
const answer = { role: 'assistant', content: 'Botão pressionado = LOW.\nUse debounce.', code: 'void loop() {\n  ler_botao();\n}\n' }
assert.equal(responseText(answer), `${answer.content}\n\n${answer.code}`)
const messages = [{ role: 'user', content: 'Corrija o contador.', attachmentName: 'teste.ino' }, answer]
const exported = conversationText(messages)
assert.ok(exported.includes('Você\nAnexo: teste.ino\nCorrija o contador.'))
assert.ok(exported.includes(`Nino\n${answer.content}\n\n${answer.code}`))
assert.equal(conversationText([]), '')
console.log('Revisão: exportação preserva resposta, código, indentação, acentos e ordem da conversa.')
