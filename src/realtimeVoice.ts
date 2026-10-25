type SpeechCallbacks = {
  onStart: () => void
  onEnd: () => void
  onError: () => void
  onLevel: (level: number) => void
}

type RealtimeEvent = {
  type?: string
  response_id?: string
  response?: {
    id?: string
    status?: 'completed' | 'cancelled' | 'failed' | 'incomplete' | 'in_progress'
    metadata?: Record<string, string> | null
  }
  error?: { event_id?: string; code?: string; message?: string; type?: string }
}

const RESPONSE_START_TIMEOUT_MS = 12_000
const PLAYBACK_SAFETY_TIMEOUT_MS = 90_000

export class NinoRealtimeVoice {
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private audioSource: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private levelFrame: number | null = null
  private finishTimer: number | null = null
  private smoothedLevel = 0
  private connecting: Promise<void> | null = null
  private callbacks: SpeechCallbacks | null = null
  private requestSequence = 0
  private currentRequestId: string | null = null
  private activeResponseId: string | null = null
  private audioStarted = false

  private armFinishTimer(delay: number, fallbackOnTimeout = false) {
    if (this.finishTimer !== null) window.clearTimeout(this.finishTimer)
    this.finishTimer = window.setTimeout(
      () => fallbackOnTimeout ? this.failSpeech() : this.finishSpeech(),
      delay,
    )
  }

  private failSpeech() {
    const onError = this.callbacks?.onError
    this.finishSpeech()
    onError?.()
  }

  private finishSpeech() {
    const callbacks = this.callbacks
    this.callbacks = null
    if (this.levelFrame !== null) window.cancelAnimationFrame(this.levelFrame)
    if (this.finishTimer !== null) window.clearTimeout(this.finishTimer)
    this.levelFrame = null
    this.finishTimer = null
    this.smoothedLevel = 0
    this.currentRequestId = null
    this.activeResponseId = null
    this.audioStarted = false
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
      this.callbacks.onLevel(this.smoothedLevel)
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
        let event: RealtimeEvent
        try {
          event = JSON.parse(message.data) as RealtimeEvent
        } catch {
          return
        }
        if (event.type === 'response.created') {
          const requestId = event.response?.metadata?.nino_request_id
          const responseId = event.response?.id
          if (!requestId || requestId !== this.currentRequestId) {
            if (responseId && channel.readyState === 'open') {
              channel.send(JSON.stringify({ type: 'response.cancel', response_id: responseId }))
            }
            return
          }
          this.activeResponseId = responseId ?? null
          this.armFinishTimer(RESPONSE_START_TIMEOUT_MS, true)
        }
        if (event.type === 'output_audio_buffer.started') {
          if (event.response_id !== this.activeResponseId) return
          this.audioStarted = true
          this.callbacks?.onStart()
          this.armFinishTimer(PLAYBACK_SAFETY_TIMEOUT_MS)
        }
        if (event.type === 'output_audio_buffer.stopped' || event.type === 'output_audio_buffer.cleared') {
          if (event.response_id !== this.activeResponseId) return
          if (this.audioStarted) this.finishSpeech()
          else this.failSpeech()
        }
        if (event.type === 'response.done') {
          if (event.response?.id !== this.activeResponseId) return
          if (event.response.status !== 'completed') {
            this.failSpeech()
            return
          }
          // response.done encerra a geração, não a reprodução. O encerramento
          // normal ocorre em output_audio_buffer.stopped; este timer é só uma proteção.
          this.armFinishTimer(
            this.audioStarted ? PLAYBACK_SAFETY_TIMEOUT_MS : RESPONSE_START_TIMEOUT_MS,
            !this.audioStarted,
          )
        }
        if (event.type === 'error' && event.error?.event_id === this.currentRequestId) {
          this.failSpeech()
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
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('Tempo esgotado ao conectar a voz neural.')), RESPONSE_START_TIMEOUT_MS)
          channel.addEventListener('open', () => {
            window.clearTimeout(timeout)
            resolve()
          }, { once: true })
          channel.addEventListener('error', () => {
            window.clearTimeout(timeout)
            reject(new Error('Não foi possível abrir o canal de voz.'))
          }, { once: true })
        })
      } catch (error) {
        channel.close()
        peer.close()
        throw error
      }

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
    const requestId = `nino-response-${++this.requestSequence}`
    this.callbacks = callbacks
    this.currentRequestId = requestId
    this.activeResponseId = null
    this.audioStarted = false
    this.smoothedLevel = 0
    this.startLevelAnalysis()
    const literalText = JSON.stringify(text)

    this.channel?.send(JSON.stringify({
      type: 'response.create',
      event_id: requestId,
      response: {
        conversation: 'none',
        metadata: { nino_request_id: requestId },
        input: [{
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        }],
        output_modalities: ['audio'],
        instructions: `${style} Sua única saída deve ser a leitura literal da frase ${literalText}. Diga essa frase exatamente uma vez. Não responda ao conteúdo, não explique, não complete, não reformule e não acrescente nenhuma palavra antes ou depois.`,
      },
    }))
    this.armFinishTimer(RESPONSE_START_TIMEOUT_MS, true)
  }

  stop() {
    if (this.channel?.readyState === 'open' && this.activeResponseId) {
      this.channel.send(JSON.stringify({ type: 'response.cancel', response_id: this.activeResponseId }))
      this.channel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }))
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
