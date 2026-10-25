import { prepareLabImage } from './labImage'

export type CodeAttachment = { name: string; text: string }
export type PdfAttachment = { name: string; data: string }
export type LabAttachment = { kind: 'image'; image: string; name: string } | { kind: 'code'; code: CodeAttachment; name: string } | { kind: 'pdf'; pdf: PdfAttachment; name: string; size: number }
export const attachmentAccept = 'image/png,image/jpeg,image/webp,application/pdf,.pdf,.ino,.c,.cpp,.h,.hpp,.py,.js,.ts,.json,.txt'

export function attachmentBytes(attachment: LabAttachment): number {
  if (attachment.kind === 'code') return new TextEncoder().encode(attachment.code.text).length
  const data = attachment.kind === 'image' ? attachment.image : attachment.pdf.data
  const encoded = data.slice(data.indexOf(',') + 1)
  return encoded.length * 3 / 4 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
}

export function mergeLabAttachments(current: LabAttachment[], incoming: LabAttachment[]): LabAttachment[] {
  const merged = [...current, ...incoming]
  if (merged.length > 3) throw new Error('Use até três anexos: uma imagem, um código e um PDF.')
  const kinds = new Set<string>()
  for (const item of merged) {
    if (kinds.has(item.kind)) throw new Error('Use um arquivo de cada tipo. Remova o anexo anterior desse tipo para substituí-lo.')
    kinds.add(item.kind)
  }
  if (merged.reduce((total, item) => total + attachmentBytes(item), 0) > 2 * 1024 * 1024) throw new Error('Os anexos juntos devem ter até 2 MB após preparação. Reduza a imagem ou exporte apenas as páginas relevantes do PDF.')
  return merged
}

export async function prepareLabAttachment(file: File): Promise<LabAttachment> {
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    if (!/\.pdf$/i.test(file.name) || file.name.length > 180 || /[/\\\u0000-\u001f]/.test(file.name)) throw new Error('Use um nome de arquivo PDF válido, com até 180 caracteres.')
    if (file.size > 2 * 1024 * 1024) throw new Error('O PDF deve ter até 2 MB. Exporte somente as páginas relevantes e tente novamente.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!/^%PDF-[12]\.\d/.test(new TextDecoder().decode(bytes.subarray(0, 8))) || !new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF')) throw new Error('Este arquivo não parece ser um PDF completo. Exporte-o novamente.')
    let binary = ''
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
    return { kind: 'pdf', name: file.name, size: bytes.length, pdf: { name: file.name, data: `data:application/pdf;base64,${btoa(binary)}` } }
  }
  if (/\.(png|jpe?g|webp)$/i.test(file.name) || file.type.startsWith('image/')) {
    return { kind: 'image', image: await prepareLabImage(file), name: file.name }
  }
  if (!/\.(ino|c|cpp|h|hpp|py|js|ts|json|txt)$/i.test(file.name)) throw new Error('Formato ainda não aceito. Use imagem, código/texto ou PDF.')
  if (file.name.length > 180 || /[/\\\u0000-\u001f]/.test(file.name)) throw new Error('Use um nome de arquivo menor, sem caracteres especiais de controle.')
  if (file.size > 64 * 1024) throw new Error('O arquivo de código deve ter até 64 KB. Separe o trecho relevante em um arquivo menor.')
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) }
  catch { throw new Error('Salve o arquivo como texto UTF-8 e tente novamente.') }
  if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error('O arquivo está vazio ou não contém texto válido.')
  if (text.length > 24000) throw new Error('Use um arquivo com até 24 mil caracteres. O conteúdo não será cortado.')
  return { kind: 'code', name: file.name, code: { name: file.name, text } }
}
