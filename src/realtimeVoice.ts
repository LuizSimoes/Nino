type SpeechCallbacks = {
  onStart: () => void
  onEnd: () => void
  onBeat: () => void
}

export class NinoRealtimeVoice {
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private connecting: Promise<void> | null = null
  private callbacks: SpeechCallbacks | null = null

  private finishSpeech() {
    const callbacks = this.callbacks
    this.callbacks = null
    callbacks?.onEnd()
  }

  private async connect() {
    if (this.channel?.readyState === 'open') return
    if (this.connecting) return this.connecting

    this.connecting = (async () => {
      const peer = new RTCPeerConnection()
      const audio = document.createElement('audio')
      audio.autoplay = true
      audio.setAttribute('aria-hidden', 'true')

      peer.addTransceiver('audio', { direction: 'recvonly' })
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0]
        void audio.play().catch(() => undefined)
      }

      const channel = peer.createDataChannel('oai-events')
      channel.addEventListener('message', (message) => {
        const event = JSON.parse(message.data) as { type?: string }
        if (event.type === 'response.created' || event.type === 'response.output_audio.delta') {
          this.callbacks?.onStart()
          this.callbacks?.onBeat()
        }
        if (event.type === 'response.done' || event.type === 'response.cancelled' || event.type === 'error') {
          this.finishSpeech()
        }
      })

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const response = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })

      if (!response.ok) {
        const detail = await response.text()
        peer.close()
        throw new Error(detail || 'A voz neural não está disponível.')
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() })
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo esgotado ao conectar a voz neural.')), 12000)
        channel.addEventListener('open', () => {
          window.clearTimeout(timeout)
          resolve()
        }, { once: true })
        channel.addEventListener('error', () => {
          window.clearTimeout(timeout)
          reject(new Error('Não foi possível abrir o canal de voz.'))
        }, { once: true })
      })

      this.peer = peer
      this.channel = channel
      this.audio = audio
    })()

    try {
      await this.connecting
    } finally {
      this.connecting = null
    }
  }

  async speak(text: string, style: string, callbacks: SpeechCallbacks) {
    await this.connect()
    this.stop()
    this.callbacks = callbacks

    this.channel?.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    }))
    this.channel?.send(JSON.stringify({
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
        instructions: `${style} Leia somente o texto enviado, sem acrescentar comentários.`,
      },
    }))
  }

  stop() {
    if (this.channel?.readyState === 'open' && this.callbacks) {
      this.channel.send(JSON.stringify({ type: 'response.cancel' }))
    }
    this.finishSpeech()
  }

  close() {
    this.stop()
    this.channel?.close()
    this.peer?.close()
    this.audio?.pause()
    this.channel = null
    this.peer = null
    this.audio = null
  }
}
