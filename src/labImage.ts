export async function prepareLabImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem PNG, JPEG ou WebP.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Escolha uma imagem de até 10 MB.')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Não consegui abrir essa imagem. Tente outro arquivo.') })
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.9, 0.75, 0.6]) {
      const image = canvas.toDataURL('image/jpeg', quality)
      if (image.length < 1_398_100) return image
    }
    throw new Error('A imagem ainda está grande. Recorte a região do circuito e tente novamente.')
  } finally {
    bitmap.close()
  }
}
