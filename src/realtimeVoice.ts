type SpeechCallbacks = {
  onStart: () => void
  onEnd: () => void
  onBeat: () => void
  onLevel: (level: number) => void
}

export class NinoRealtimeVoice {
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private audioSource: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private levelFrame: number | null = null
  private finishTimer: number | null = null
  private responseFinished = false
  private silentSince: number | null = null
  private smoothedLevel = 0
  private hasAudibleLevel = false
  private connecting: Promise<void> | null = null
  private callbacks: SpeechCallbacks | null = null

  private finishSpeech() {
    const callbacks = this.callbacks
    this.callbacks = null
    if (this.levelFrame !== null) window.cancelAnimationFrame(this.levelFrame)
    if (this.finishTimer !== null) window.clearTimeout(this.finishTimer)
    this.levelFrame = null
    this.finishTimer = null
    this.responseFinished = false
    this.silentSince = null
    this.smoothedLevel = 0
    this.hasAudibleLevel = false
    callbacks?.onLevel(0)
    callbacks?.onEnd()
  }

  private ensureAudioAnalysis() {
    if (this.audioContext) {
      void this.audioContext.resume().catch(() => undefined)
      return
    }
    try {
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.42
      this.audioContext = context
      this.analyser = analyser
      void context.resume().catch(() => undefined)
    } catch {
      this.audioContext = null
      this.analyser = null
    }
  }

  private startLevelAnalysis() {
    if (!this.analyser || this.levelFrame !== null) return
    const samples = new Uint8Array(this.analyser.fftSize)
    const analyse = () => {
      if (!this.callbacks || !this.analyser) {
        this.levelFrame = null
        return
      }

      this.analyser.getByteTimeDomainData(samples)
      let energy = 0
      for (const sample of samples) {
        const normalized = (sample - 128) / 128
        energy += normalized * normalized
      }
      const rms = Math.sqrt(energy / samples.length)
      const measured = Math.min(1, Math.max(0, (rms - 0.012) / 0.12))
      const shaped = Math.pow(measured, 0.68)
      const smoothing = shaped > this.smoothedLevel ? 0.48 : 0.24
      this.smoothedLevel += (shaped - this.smoothedLevel) * smoothing
      if (this.smoothedLevel > 0.035) this.hasAudibleLevel = true
      this.callbacks.onLevel(this.smoothedLevel)

      const now = performance.now()
      if (this.responseFinished && this.hasAudibleLevel && this.smoothedLevel < 0.025) {
        this.silentSince ??= now
        if (now - this.silentSince > 1100) {
          this.finishSpeech()
          return
        }
      } else {
        this.silentSince = null
      }
      this.levelFrame = window.requestAnimationFrame(analyse)
    }
    this.levelFrame = window.requestAnimationFrame(analyse)
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
        if (this.audioContext && this.analyser) {
          this.audioSource?.disconnect()
          this.audioSource = this.audioContext.createMediaStreamSource(event.streams[0])
          this.audioSource.connect(this.analyser)
        }
      }

      const channel = peer.createDataChannel('oai-events')
      channel.addEventListener('message', (message) => {
        const event = JSON.parse(message.data) as { type?: string }
        if (event.type === 'response.created') {
          this.responseFinished = false
          this.silentSince = null
          this.callbacks?.onStart()
        }
        if (event.type === 'response.output_audio.delta') {
          this.callbacks?.onStart()
          this.callbacks?.onBeat()
        }
        if (event.type === 'response.done') {
          this.responseFinished = true
          // O evento indica que a geração acabou, mas o navegador ainda pode ter
          // vários segundos de áudio no buffer. O analisador encerra antes quando
          // detectar silêncio real; este timer é apenas uma proteção de emergência.
          this.finishTimer = window.setTimeout(() => this.finishSpeech(), this.analyser ? 12000 : 700)
        }
        if (event.type === 'response.cancelled' || event.type === 'error') {
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
    this.ensureAudioAnalysis()
    await this.connect()
    this.stop()
    this.callbacks = callbacks
    this.responseFinished = false
    this.silentSince = null
    this.smoothedLevel = 0
    this.hasAudibleLevel = false
    this.startLevelAnalysis()

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
    this.audioSource?.disconnect()
    void this.audioContext?.close()
    this.channel = null
    this.peer = null
    this.audio = null
    this.audioSource = null
    this.audioContext = null
    this.analyser = null
  }
}
