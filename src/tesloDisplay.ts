import type { NinoChatMood } from './ninoChat'

export const tesloSignals: Record<NinoChatMood, string> = {
  presente: 'Linha de repouso', curioso: 'Interrogação', animado: 'Lâmpada',
  pensando: 'Equações complexas', cochilando: 'Desligado', concentrado: 'Ondas senoidais',
  confuso: 'Interrogação e ondas desencontradas', acolhedor: 'Coração no peito', orgulhoso: 'Medalha',
}

export function tesloJawAngle(speaking: boolean, measured: number, time: number, mood: NinoChatMood) {
  const energy = speaking ? Math.max(0, Math.min(1, measured < 0 ? .45 + Math.sin(time * .018) * .3 : measured)) : 0
  return Math.min(.28, Math.max(0, energy - .015) * .5) + (!speaking && mood === 'animado' ? .055 : 0)
}

function power(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath(); c.arc(x, y, r, -.32 * Math.PI, 1.32 * Math.PI); c.stroke()
  c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x, y); c.stroke()
}
function bulb(c: CanvasRenderingContext2D) {
  c.beginPath(); c.arc(256, 105, 43, .18 * Math.PI, .82 * Math.PI, true)
  c.lineTo(234, 169); c.lineTo(278, 169); c.closePath(); c.stroke()
  for (const y of [181, 193]) { c.beginPath(); c.moveTo(236, y); c.lineTo(276, y); c.stroke() }
  c.beginPath(); c.moveTo(256, 163); c.lineTo(256, 117); c.lineTo(241, 105); c.moveTo(256, 117); c.lineTo(271, 105); c.stroke()
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    c.beginPath(); c.moveTo(256 + Math.cos(a) * 65, 105 + Math.sin(a) * 65)
    c.lineTo(256 + Math.cos(a) * 84, 105 + Math.sin(a) * 84); c.stroke()
  }
}
function medal(c: CanvasRenderingContext2D) {
  c.beginPath(); c.moveTo(214, 28); c.lineTo(244, 92); c.lineTo(269, 92); c.lineTo(298, 28); c.stroke()
  c.beginPath(); c.arc(256, 145, 55, 0, Math.PI * 2); c.stroke()
  c.beginPath(); c.arc(256, 145, 44, 0, Math.PI * 2); c.stroke()
  c.font = 'bold 58px system-ui'; c.fillText('1', 256, 164)
}
export function drawTesloDisplay(c: CanvasRenderingContext2D, mood: NinoChatMood, time: number, chest = false) {
  c.clearRect(0, 0, 512, 256); c.fillStyle = '#05131a'; c.fillRect(0, 0, 512, 256)
  const color = mood === 'animado' || mood === 'orgulhoso' || mood === 'confuso' ? '#ffcf67' : mood === 'cochilando' ? '#6199b0' : '#72ffae'
  c.strokeStyle = '#193735'; c.lineWidth = 1
  if (!chest) {
    for (let x = 0; x <= 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke() }
    for (let y = 0; y <= 256; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke() }
  }
  c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'
  c.shadowColor = color; c.shadowBlur = 9; c.textAlign = 'center'
  if (chest) {
    c.strokeStyle = mood === 'acolhedor' ? '#ff91b8' : '#63dae0'; c.fillStyle = c.strokeStyle
    if (mood === 'acolhedor') {
      c.beginPath(); c.moveTo(256, 188); c.bezierCurveTo(95, 95, 194, 25, 256, 83)
      c.bezierCurveTo(318, 25, 417, 95, 256, 188); c.fill()
    } else if (mood === 'cochilando') power(c, 256, 135, 52)
    else { c.beginPath(); c.arc(256, 128, 35 + Math.sin(time * 2) * 3, 0, Math.PI * 2); c.stroke() }
  } else if (mood === 'cochilando') power(c, 256, 136, 60)
  else if (mood === 'curioso') { c.font = 'bold 164px system-ui'; c.fillText('?', 256, 187) }
  else if (mood === 'animado') bulb(c)
  else if (mood === 'orgulhoso') medal(c)
  else if (mood === 'pensando') {
    c.font = '24px monospace'
    c.fillText('Z(ω) = R + j(ωL − 1/ωC)', 256, 69)
    c.fillText('H(s) = ω₀²/(s²+2ζω₀s+ω₀²)', 256, 130)
    c.font = '25px monospace'; c.fillText('X(ω) = ∫₋∞⁺∞ x(t)e⁻ʲωᵗ dt', 256, 196)
  } else {
    for (let wave = 0; wave < (mood === 'concentrado' || mood === 'confuso' ? 2 : 1); wave++) {
      c.beginPath()
      for (let x = 20; x <= 492; x += 3) {
        const amplitude = mood === 'presente' ? 1.5 : mood === 'acolhedor' ? 12 : 40
        const y = 128 + Math.sin(x * (mood === 'confuso' ? .025 + wave * .014 : .025) - time * 2 + wave * 1.8) * amplitude
        if (x === 20) c.moveTo(x, y); else c.lineTo(x, y)
      }
      c.stroke()
    }
    if (mood === 'confuso') { c.font = 'bold 72px system-ui'; c.fillText('?', 75, 92) }
  }
  c.shadowBlur = 0
}
