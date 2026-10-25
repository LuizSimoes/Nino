import { prepareLabImage } from './labImage'

export type CodeAttachment = { name: string; text: string }
export type LabAttachment = { kind: 'image'; image: string; name: string } | { kind: 'code'; code: CodeAttachment; name: string }
export const attachmentAccept = 'image/png,image/jpeg,image/webp,.ino,.c,.cpp,.h,.hpp,.py,.js,.ts,.json,.txt'

export async function prepareLabAttachment(file: File): Promise<LabAttachment> {
  if (/\.(png|jpe?g|webp)$/i.test(file.name) || file.type.startsWith('image/')) {
    return { kind: 'image', image: await prepareLabImage(file), name: file.name }
  }
  if (!/\.(ino|c|cpp|h|hpp|py|js|ts|json|txt)$/i.test(file.name)) throw new Error('Formato ainda não aceito. Use uma imagem ou arquivo de código/texto.')
  if (file.name.length > 180 || /[/\\\u0000-\u001f]/.test(file.name)) throw new Error('Use um nome de arquivo menor, sem caracteres especiais de controle.')
  if (file.size > 64 * 1024) throw new Error('O arquivo de código deve ter até 64 KB. Separe o trecho relevante em um arquivo menor.')
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) }
  catch { throw new Error('Salve o arquivo como texto UTF-8 e tente novamente.') }
  if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error('O arquivo está vazio ou não contém texto válido.')
  if (text.length > 24000) throw new Error('Use um arquivo com até 24 mil caracteres. O conteúdo não será cortado.')
  return { kind: 'code', name: file.name, code: { name: file.name, text } }
}
