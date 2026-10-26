import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformWithOxc } from 'vite'

const compile = async (path) => {
  const source = (await transformWithOxc(readFileSync(new URL(path, import.meta.url), 'utf8'), path, { lang: 'ts' })).code
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}
const { storedAppearance, appearanceKey } = await compile('../src/appearance.ts')
for (const [stored, expected] of [[null,'nino'],['bad','nino'],['nino','nino'],['teslo','teslo']]) {
  globalThis.localStorage = { getItem(key) { assert.equal(key, appearanceKey); return stored } }
  assert.equal(storedAppearance(), expected)
}
globalThis.localStorage = { getItem() { throw new Error('blocked') } }
assert.equal(storedAppearance(), 'nino')
delete globalThis.localStorage
const { tesloSignals, drawTesloDisplay, tesloJawAngle, tesloModelUrl } = await compile('../src/tesloDisplay.ts')
assert.equal(Object.keys(tesloSignals).length, 9)
assert.match(tesloSignals.pensando,/Equações/)
assert.match(tesloSignals.concentrado,/senoidais/)
assert.equal(tesloSignals.cochilando,'Desligado')
assert.equal(tesloSignals.orgulhoso,'Medalha')
for (const mood of Object.keys(tesloSignals)) {
  const texts = []
  const context = new Proxy({}, { get(_obj, key) { return key==='fillText' ? (text) => texts.push(text) : () => {} }, set() { return true } })
  drawTesloDisplay(context, mood, 1)
  drawTesloDisplay(context, mood, 1, true)
  if (mood === 'pensando') assert.ok(texts.some((text) => text.includes('∫')))
  assert.equal(tesloJawAngle(true,0,100,mood),0,'Silêncio fecha boca em todos os estados')
  assert.ok(tesloJawAngle(true,.6,100,mood)>0,'Áudio retoma movimento')
  assert.ok(tesloJawAngle(true,1,100,mood)<=.28,'Limite mecanico')
}
assert.equal(tesloJawAngle(false,1,100,'presente'),0)
const bytes = readFileSync(new URL(`../public${tesloModelUrl}`,import.meta.url))
assert.equal(bytes.toString('utf8',0,4),'glTF')
assert.ok(bytes.length < 3*1024*1024)
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)))
for (const name of ['Head_Pivot','Jaw_Pivot','Forehead_Display']) assert.ok(gltf.nodes.some((n)=>n.name===name))
const lids=gltf.nodes.filter((n)=>n.name?.startsWith('Shutter_'))
assert.equal(lids.length,4)
for (const lid of lids) assert.ok(gltf.meshes[lid.mesh].extras.targetNames.includes('Closed'))
assert.equal(gltf.animations?.length ?? 0,0,'Runtime deve controlar as poses')
assert.ok(!gltf.nodes.some(n=>n.name?.startsWith('Cochilo_Off_')),'Sinais antigos nao devem sobrepor os do runtime')
console.log('Aparência: padrão, escolha persistida e armazenamento bloqueado aprovados.')
console.log('Teslo: nove telas, silêncio/retomada da boca, modelo leve e quatro obturadores aprovados.')
