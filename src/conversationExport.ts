import type { NinoChatMessage } from './ninoChat'

export function responseText(message: NinoChatMessage): string {
  return [message.content, message.code].filter(Boolean).join('\n\n')
}

export function conversationText(messages: NinoChatMessage[]): string {
  return messages.map((message) => [
    message.role === 'assistant' ? 'Nino' : 'Você',
    message.attachmentName ? `Anexo: ${message.attachmentName}` : '',
    responseText(message),
  ].filter(Boolean).join('\n')).join('\n\n────────────────────\n\n')
}

export function downloadConversation(messages: NinoChatMessage[]) {
  const url = URL.createObjectURL(new Blob([conversationText(messages)], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'conversa-nino.txt'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
