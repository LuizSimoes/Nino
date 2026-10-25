import { mergeLabAttachments, type LabAttachment } from './labAttachment'
import type { NinoChatMessage, NinoLabContext } from './ninoChat'

export type LabSnapshot = { messages: NinoChatMessage[]; context: NinoLabContext; attachments: LabAttachment[]; draft: string }
export type SessionMeta = { id: string; name: string; updatedAt: number }
export type SavedSession = SessionMeta & {
  version: 1
  messages: (Omit<NinoChatMessage, 'image'> & { imageId?: number })[]
  images: string[]
  context: NinoLabContext
  attachments: LabAttachment[]
  draft: string
}

// Imagens repetidas no histórico são armazenadas uma única vez por sessão.
export function packSession(snapshot: LabSnapshot, name: string, id: string = crypto.randomUUID()): SavedSession {
  const images: string[] = []
  const messages = snapshot.messages.map(({ image, ...message }) => {
    if (!image) return message
    let imageId = images.indexOf(image)
    if (imageId < 0) { imageId = images.length; images.push(image) }
    return { ...message, imageId }
  })
  return structuredClone({ version: 1, id, name: name.trim().slice(0, 80) || 'Minha bancada', updatedAt: Date.now(), messages, images, context: snapshot.context, attachments: snapshot.attachments, draft: snapshot.draft })
}

export function unpackSession(session: SavedSession): LabSnapshot {
  if (session?.version !== 1 || !Array.isArray(session.messages) || !Array.isArray(session.images) || !Array.isArray(session.attachments) || typeof session.draft !== 'string') throw new Error('A sessão salva tem um formato inválido.')
  const validImage = (value: unknown) => typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  if (!session.images.every(validImage)) throw new Error('Uma imagem da sessão está inválida.')
  const context = session.context
  if (!context || !['objective', 'platform', 'power', 'instruments'].every((key) => typeof context[key as keyof NinoLabContext] === 'string' && context[key as keyof NinoLabContext].length <= 120)) throw new Error('O contexto da sessão está inválido.')
  const messages = session.messages.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Uma mensagem da sessão está inválida.')
    const { imageId, ...message } = entry
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || (message.code !== undefined && typeof message.code !== 'string') || (message.attachmentName !== undefined && typeof message.attachmentName !== 'string')) throw new Error('Uma mensagem da sessão está inválida.')
    if (imageId === undefined) return message
    if (!Number.isInteger(imageId) || imageId < 0 || !session.images[imageId]) throw new Error('Uma imagem da sessão está ausente.')
    return { ...message, image: session.images[imageId] }
  })
  for (const item of session.attachments) {
    if (!item || typeof item.name !== 'string') throw new Error('Anexo salvo inválido.')
    if (item.kind === 'image' ? !validImage(item.image) : item.kind === 'code' ? typeof item.code?.text !== 'string' || typeof item.code?.name !== 'string' : item.kind === 'pdf' ? typeof item.pdf?.data !== 'string' || !/^data:application\/pdf;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.pdf.data) || typeof item.pdf.name !== 'string' : true) throw new Error('Anexo salvo inválido.')
  }
  return structuredClone({ messages, context, attachments: mergeLabAttachments([], session.attachments), draft: session.draft })
}

function storeRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Este navegador não disponibiliza armazenamento local de sessões.')); return }
    const opening = indexedDB.open('nino-lab-sessions', 1)
    let cancelled = false
    opening.onupgradeneeded = () => opening.result.createObjectStore('sessions', { keyPath: 'id' })
    opening.onerror = () => reject(new Error('Não foi possível acessar as sessões deste navegador.'))
    opening.onblocked = () => { cancelled = true; reject(new Error('Feche outras abas do Nino e tente novamente.')) }
    opening.onsuccess = () => {
      const db = opening.result
      if (cancelled) { db.close(); return }
      db.onversionchange = () => db.close()
      let tx: IDBTransaction
      try {
        tx = db.transaction('sessions', mode)
        const request = operation(tx.objectStore('sessions'))
        tx.oncomplete = () => { db.close(); resolve(request.result) }
        tx.onabort = tx.onerror = () => { db.close(); reject(new Error(tx.error?.name === 'QuotaExceededError' ? 'Sem espaço para salvar. Exclua sessões antigas ou libere espaço no navegador.' : 'A operação não foi concluída. A versão salva anterior foi preservada.')) }
      } catch { db.close(); reject(new Error('Não foi possível acessar as sessões.')) }
    }
  })
}

export async function listSessions(): Promise<SessionMeta[]> {
  const sessions = await storeRequest<SavedSession[]>('readonly', (store) => store.getAll())
  return sessions.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })).sort((a, b) => b.updatedAt - a.updatedAt)
}
export async function readSession(id: string): Promise<SavedSession> {
  const saved = await storeRequest<SavedSession | undefined>('readonly', (store) => store.get(id))
  if (!saved) throw new Error('Esta sessão não está mais salva neste navegador.')
  unpackSession(saved)
  return saved
}
export async function writeSession(session: SavedSession): Promise<void> {
  unpackSession(session)
  await storeRequest('readwrite', (store) => store.put(session))
}
export async function deleteSession(id: string): Promise<void> {
  await storeRequest('readwrite', (store) => store.delete(id))
}
