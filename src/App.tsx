import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Nino3D } from './Nino3D'
import { NinoRealtimeVoice } from './realtimeVoice'

type NinoMood = 'presente' | 'curioso' | 'animado' | 'pensando' | 'cochilando' | 'concentrado' | 'confuso' | 'acolhedor' | 'orgulhoso'
type Gaze = 'esquerda' | 'centro' | 'direita'
type LookOffset = { x: number; y: number }

const expressionOptions: Array<{ mood: NinoMood; label: string; symbol: string }> = [
  { mood: 'presente', label: 'De boa', symbol: '•' },
  { mood: 'curioso', label: 'Curioso', symbol: '?' },
  { mood: 'animado', label: 'Eureca!', symbol: '!' },
  { mood: 'pensando', label: 'Pensando', symbol: '…' },
  { mood: 'cochilando', label: 'Cochilo', symbol: 'z' },
]

const extraExpressionOptions: Array<{ mood: NinoMood; label: string; symbol: string }> = [
  { mood: 'concentrado', label: 'Concentrado', symbol: '◎' },
  { mood: 'confuso', label: 'Confuso', symbol: '¿' },
  { mood: 'acolhedor', label: 'Acolhedor', symbol: '♥' },
  { mood: 'orgulhoso', label: 'Orgulhoso', symbol: '★' },
]

const moodCaptions: Record<NinoMood, string> = {
  presente: 'Oi! Que bom ver você por aqui.',
  curioso: 'Opa… me conta mais?',
  animado: 'Eureca! Tive uma ideia incrível!',
  pensando: 'Hmm… quase peguei a ideia.',
  cochilando: 'Só cinco minutinhos… zzz',
  concentrado: 'Um instante — estou ligando os pontos.',
  confuso: 'Espera… acho que perdi uma peça.',
  acolhedor: 'Estou com você. Vamos no seu ritmo.',
  orgulhoso: 'Olha só o que conseguimos juntos!',
}

const moodColors: Record<NinoMood, string> = {
  presente: '#7ee4d8',
  curioso: '#ffc86b',
  animado: '#ff8fa8',
  pensando: '#aaa4ff',
  cochilando: '#8296c8',
  concentrado: '#76d7ff',
  confuso: '#ffb46b',
  acolhedor: '#ff91b8',
  orgulhoso: '#f6d66b',
}

const chestSymbols: Record<NinoMood, string> = {
  presente: '•',
  curioso: '?',
  animado: '!',
  pensando: '…',
  cochilando: 'Z',
  concentrado: '◎',
  confuso: '¿',
  acolhedor: '♥',
  orgulhoso: '★',
}

const suggestions = [
  {
    eyebrow: 'Você explorou as expressões por um tempinho.',
    title: 'Quer ver o Nino cochilar?',
    detail: 'Posso acelerar o repouso só nesta demonstração.',
    action: 'Cochilar agora',
  },
  {
    eyebrow: 'Percebi uma pausa tranquila por aqui.',
    title: 'Que tal um circuito de LED depois?',
    detail: 'É uma ideia local, sem abrir nada ou interromper você.',
    action: 'Guardar ideia',
  },
]

type VoiceProfile = 'adolescente' | 'cartoon' | 'inventor' | 'aventureiro'
type VoiceEngine = 'conectando' | 'neural' | 'local'

const voiceProfiles: Record<VoiceProfile, { label: string; detail: string; rate: number; pitch: number; preferredVoice: string; neuralStyle: string }> = {
  adolescente: {
    label: 'Nino divertido', detail: 'Infantil, ágil, sorridente e cheio de vida.', rate: 1.22, pitch: 1.38, preferredVoice: 'Eddy',
    neuralStyle: 'Interprete como um garoto infantojuvenil muito simpático e divertido: timbre masculino jovem, leve e um pouco agudo, sorriso perceptível na voz, ritmo ágil e pequenas variações de entonação. Transmita curiosidade e alegria espontânea. Não fale devagar, não use voz adulta grave, não soe como uma mulher adulta e não exagere como um bebê ou desenho caricato.',
  },
  cartoon: {
    label: 'Nino cartoon', detail: 'Elástico, expressivo e com energia de desenho animado.', rate: 1.27, pitch: 1.5, preferredVoice: 'Eddy',
    neuralStyle: 'Interprete como a voz original de um personagem de desenho animado brasileiro: masculina, infantojuvenil, simpática e muito expressiva. Use timbre leve e mais agudo, sorriso claro na voz, ritmo rápido sem atropelar as palavras, ataques vivos e entonação elástica. Dê pequenas ênfases de surpresa e curiosidade, como um mascote aventureiro. Mantenha a fala natural e inteligível; não imite personagem conhecido, não soe como uma mulher adulta, não use voz grave e não infantilize como um bebê.',
  },
  inventor: {
    label: 'Pequeno inventor', detail: 'Curioso, esperto e cheio de energia.', rate: 1.15, pitch: 1.38, preferredVoice: 'Reed',
    neuralStyle: 'Use uma voz masculina infantojuvenil, curiosa e elétrica, como um pequeno inventor que acabou de ter uma ideia. Mantenha a fala clara e natural.',
  },
  aventureiro: {
    label: 'Jovem aventureiro', detail: 'Infantojuvenil, caloroso e confiante.', rate: 1.10, pitch: 1.24, preferredVoice: 'Rocko',
    neuralStyle: 'Use uma voz masculina infantojuvenil, calorosa, confiante e divertida. Fale de modo espontâneo, com energia de aventura e sem exageros.',
  },
}

const voiceSample = 'Oi, eu sou o Nino! Bora descobrir uma ideia juntos?'

function StatusIcon({ kind }: { kind: 'mic' | 'camera' | 'voice' | 'tune' }) {
  return kind === 'mic' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 9.5V6a3 3 0 0 1 6 0v3.5M5 10v1a7 7 0 0 0 11.6 5.3M12 18v3M9 21h6M3 3l18 18" />
    </svg>
  ) : kind === 'camera' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 8h3l4-3v12l-3.2-2.4M4 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6ZM3 3l18 18" />
    </svg>
  ) : kind === 'voice' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 10h3l4-4v12l-4-4H5zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" />
    </svg>
  )
}

function NinoFacePixel({ mood, gaze, blinking, look }: { mood: NinoMood; gaze: Gaze; blinking: boolean; look: LookOffset | null }) {
  const asleep = mood === 'cochilando'
  const curious = mood === 'curioso'
  const animated = mood === 'animado'
  const thinking = mood === 'pensando'
  const focused = mood === 'concentrado'
  const confused = mood === 'confuso'
  const comforting = mood === 'acolhedor'
  const proud = mood === 'orgulhoso'
  const autoGaze = gaze === 'esquerda' ? -4 : gaze === 'direita' ? 4 : 0
  const pupilX = thinking ? 5 : confused ? -3 : Math.max(-5, Math.min(5, (look?.x ?? autoGaze) * .5))
  const pupilY = Math.max(-3, Math.min(3, (look?.y ?? 0) * .45))
  const mouthPath = asleep ? 'M146 158h28' :
    thinking ? 'M138 158h13l7-5 9 7 9-5h8' :
    focused ? 'M143 160h34' :
    confused ? 'M137 155h12l8 7 9-7 9 7 9-7' :
    comforting ? 'M137 151h9l14 12 14-12h9' :
    proud ? 'M142 157h14l8 5 15-11' :
    'M139 153h9l12 10 12-10h9'

  return (
    <svg className="nino-face pixel-robot" viewBox="0 0 320 455" role="img" aria-label={`Nino, um robô digital 16-bit tridimensional ${mood}`} shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id="botShell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7fff9" />
          <stop offset=".58" stopColor="#c9f0e8" />
          <stop offset="1" stopColor="#75c9d4" />
        </linearGradient>
        <linearGradient id="botJoint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38cbe1" />
          <stop offset="1" stopColor="#456bc9" />
        </linearGradient>
        <filter id="pixelGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse className="bot-shadow" cx="160" cy="442" rx="92" ry="11" />

      <g className={`bot bot--${mood}`} aria-hidden="true">
        <g className="bot-legs">
          <path className="bot-leg bot-leg--left" d="M115 316h35v99h-35z" />
          <path className="bot-leg bot-leg--right" d="M170 316h35v99h-35z" />
          <path className="bot-leg-side" d="M137 321h13v94h-13zM192 321h13v94h-13z" />
          <path className="bot-leg-light" d="M120 327h12v24h-12zM120 362h12v24h-12zM175 327h12v24h-12zM175 362h12v24h-12z" />
          <path className="bot-boot bot-boot--left" d="M108 402h49l13 23v17H91v-19h17z" />
          <path className="bot-boot bot-boot--right" d="M163 425l13-23h49v21h17v19h-79z" />
          <path className="bot-boot-top" d="M112 407h39l7 12h-50zM180 407h39v12h-46z" />
        </g>

        <g className="bot-arms">
          <g className="bot-limb bot-limb--left">
            <path className="bot-arm bot-arm--left" d="M98 232H78l-27 33v47l16 15 20-19-11-16 16-30 9-5z" />
            <path className="bot-hand bot-hand--left" d="M50 301H36v29h11v15h23v-17H58v-13h12v-14z" />
          </g>
          <g className="bot-limb bot-limb--right">
            <path className="bot-arm bot-arm--right" d="M222 232h20l27 33v47l-16 15-20-19 11-16-16-30-9-5z" />
            <path className="bot-hand bot-hand--right" d="M270 301h14v29h-11v15h-23v-17h12v-13h-12v-14z" />
          </g>
        </g>

        <path className="bot-body-back" d="M113 207h102l28 28v88l-27 27H109l-27-27v-88z" />
        <path className="bot-body" d="M112 213h96l22 22v84l-22 22h-96l-22-22v-84z" />
        <path className="bot-body-side" d="M208 213l22 22v84l-22 22h-14l18-24v-91l-18-19z" />
        <path className="bot-body-highlight" d="M103 239h15v77h72v15h-78l-12-12v-74z" />
        <rect className="bot-chest" x="116" y="241" width="88" height="66" rx="8" />
        <rect className="bot-chest-glow" x="126" y="251" width="68" height="46" rx="5" />
        <text className={`bot-symbol bot-symbol--${mood}`} x="160" y="286" textAnchor="middle">{chestSymbols[mood]}</text>
        <g className="bot-buttons">
          <rect x="116" y="316" width="9" height="9" />
          <rect x="131" y="316" width="9" height="9" />
          <rect x="176" y="316" width="24" height="9" />
        </g>

        <rect className="bot-neck" x="143" y="194" width="34" height="24" />
        <g className="bot-head-group">
        <path className="bot-head-back" d="M90 32h156l30 29v108l-29 30H89l-29-30V61z" />
        <path className="bot-head" d="M82 39h156l30 29v108l-29 30H81l-29-30V68z" />
        <path className="bot-head-top" d="M82 39h156l14 14H96L67 82V68z" />
        <path className="bot-head-side" d="M238 39l30 29v108l-29 30h-16l29-36V76l-26-23z" />
        <path className="bot-head-shade" d="M52 142h18v31l18 18h144l18-18v-31h18v34l-29 30H81l-29-30z" />
        <path className="bot-pod bot-pod--left" d="M52 91H34v62h18l12-13V104z" />
        <path className="bot-pod bot-pod--right" d="M268 91h18v62h-18l-12-13v-36z" />
        <path className="bot-visor" d="M86 72h148l17 18v72l-18 19H87l-18-19V90z" />
        <path className="bot-visor-highlight" d="M88 88h17v58H88zM105 81h45v10h-45z" />

        <g className={`bot-eyes ${blinking ? 'bot-eyes--blink' : ''} ${focused ? 'bot-eyes--focused' : ''} ${comforting ? 'bot-eyes--soft' : ''}`}>
          {asleep ? (
            <>
              <path className="bot-sleep-eye" d="m99 119 25 12 25-12" />
              <path className="bot-sleep-eye" d="m171 119 25 12 25-12" />
            </>
          ) : (animated || proud) ? (
            <>
              <path className="bot-happy-eye" d="m99 128 25-20 25 20" />
              <path className="bot-happy-eye" d="m171 128 25-20 25 20" />
            </>
          ) : (
            <>
              <path className="bot-eye bot-eye--left" d="M96 95h58v43l-12 12h-34l-12-12z" />
              <path className="bot-eye bot-eye--right" d="M166 95h58v43l-12 12h-34l-12-12z" />
              <g className={`bot-pupil bot-pupil--left ${curious ? 'bot-pupil--wide' : ''}`} transform={`translate(${pupilX} ${pupilY})`}>
                <rect x="116" y="105" width={confused ? 17 : 22} height={confused ? 25 : 31} rx="4" />
                <rect className="bot-glint" x="120" y="109" width="7" height="7" />
              </g>
              <g className={`bot-pupil bot-pupil--right ${curious ? 'bot-pupil--wide' : ''}`} transform={`translate(${pupilX} ${pupilY})`}>
                <rect x="184" y="105" width={confused ? 27 : 22} height={confused ? 34 : 31} rx="4" />
                <rect className="bot-glint" x="188" y="109" width="7" height="7" />
              </g>
            </>
          )}
        </g>

        {!asleep && (
          <g className={`bot-cheeks ${(animated || comforting || proud) ? 'bot-cheeks--bright' : ''}`}>
            <rect x="86" y="143" width="25" height="8" />
            <rect x="209" y="143" width="25" height="8" />
          </g>
        )}

        {animated ? (
          <g className="bot-mouth bot-mouth--open">
            <path d="M135 143h50v17l-11 10h-28l-11-10z" />
            <path className="bot-tongue" d="M146 158h28l6 6-7 7h-26l-7-7z" />
            <path className="bot-tooth" d="M141 144h11v7h-11zM168 144h11v7h-11z" />
          </g>
        ) : curious ? (
          <path className="bot-mouth bot-mouth--surprised" d="M149 146h22l7 7v12l-7 7h-22l-7-7v-12z" />
        ) : mood === 'presente' ? (
          <g className="bot-mouth bot-mouth--smile">
            <path d="M140 151h40v10l-9 9h-22l-9-9z" />
            <path className="bot-tongue" d="M149 160h22l5 5-6 6h-20l-6-6z" />
            <path className="bot-tooth" d="M145 152h9v6h-9zM166 152h9v6h-9z" />
          </g>
        ) : (
          <path className={`bot-mouth-line bot-mouth-line--${mood}`} d={mouthPath} />
        )}
        </g>
      </g>

      {animated && (
        <g className="bot-sparks" aria-hidden="true" filter="url(#pixelGlow)">
          <path d="M34 63v-20M24 53h20M276 63l15-15M276 48l15 15" />
        </g>
      )}
      {thinking && (
        <g className="bot-thoughts" aria-hidden="true">
          <rect x="268" y="172" width="8" height="8" />
          <rect x="281" y="153" width="12" height="12" />
          <rect x="292" y="126" width="17" height="17" />
        </g>
      )}

      {asleep && (
        <g className="bot-sleep" aria-hidden="true">
          <text x="260" y="126">z</text>
          <text x="280" y="97">z</text>
          <text x="294" y="62">Z</text>
        </g>
      )}
    </svg>
  )
}

function NinoFaceRobot3D({ mood, gaze, blinking, look }: { mood: NinoMood; gaze: Gaze; blinking: boolean; look: LookOffset | null }) {
  const asleep = mood === 'cochilando'
  const curious = mood === 'curioso'
  const animated = mood === 'animado'
  const thinking = mood === 'pensando'
  const focused = mood === 'concentrado'
  const confused = mood === 'confuso'
  const comforting = mood === 'acolhedor'
  const proud = mood === 'orgulhoso'
  const autoGaze = gaze === 'esquerda' ? -5 : gaze === 'direita' ? 5 : 0
  const eyeX = thinking ? 6 : confused ? -4 : Math.max(-6, Math.min(6, (look?.x ?? autoGaze) * .6))
  const eyeY = Math.max(-3, Math.min(3, (look?.y ?? 0) * .45))

  const poses: Record<NinoMood, { arms: [string, string]; hands: [[number, number], [number, number]] }> = {
    presente: { arms: ['M113 278Q76 304 72 351', 'M207 278Q244 304 248 351'], hands: [[71, 361], [249, 361]] },
    curioso: { arms: ['M113 278Q76 304 72 351', 'M207 278Q247 264 229 217'], hands: [[71, 361], [225, 207]] },
    animado: { arms: ['M113 278Q70 245 43 174', 'M207 278Q250 245 277 174'], hands: [[39, 162], [281, 162]] },
    pensando: { arms: ['M113 278Q76 304 72 351', 'M207 278Q244 257 216 207'], hands: [[71, 361], [212, 197]] },
    cochilando: { arms: ['M113 280Q80 314 82 360', 'M207 280Q240 314 238 360'], hands: [[82, 370], [238, 370]] },
    concentrado: { arms: ['M113 280Q101 321 133 337', 'M207 280Q219 321 187 337'], hands: [[141, 338], [179, 338]] },
    confuso: { arms: ['M113 278Q76 304 72 351', 'M207 278Q250 267 240 221'], hands: [[71, 361], [237, 211]] },
    acolhedor: { arms: ['M113 280Q68 280 43 316', 'M207 280Q252 280 277 316'], hands: [[35, 323], [285, 323]] },
    orgulhoso: { arms: ['M113 280Q91 308 119 328', 'M207 280Q229 308 201 328'], hands: [[127, 330], [193, 330]] },
  }
  const pose = poses[mood]
  const mouthPath = asleep ? 'M143 181Q160 176 177 181' :
    thinking ? 'M140 180Q150 171 160 180Q170 189 181 177' :
    focused ? 'M144 180Q160 177 176 180' :
    confused ? 'M139 178Q149 168 159 179Q169 190 181 176' :
    comforting ? 'M137 171Q160 193 183 171' :
    proud ? 'M141 175Q159 188 181 169' :
    'M138 172Q160 193 182 172'

  return (
    <svg className="nino-face realistic-robot" viewBox="0 0 320 455" role="img" aria-label={`Nino, um robô tridimensional ${mood}`}>
      <defs>
        <radialGradient id="realShell" cx="28%" cy="18%" r="92%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".25" stopColor="#d9fbf6" />
          <stop offset=".64" stopColor="#69cad8" />
          <stop offset="1" stopColor="#38538f" />
        </radialGradient>
        <linearGradient id="realLimb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8cf2e2" />
          <stop offset=".45" stopColor="#3db2d4" />
          <stop offset="1" stopColor="#34458a" />
        </linearGradient>
        <linearGradient id="realVisor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#27304f" />
          <stop offset=".52" stopColor="#11162d" />
          <stop offset="1" stopColor="#070914" />
        </linearGradient>
        <radialGradient id="realEye" cx="30%" cy="22%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".28" stopColor="#bffef5" />
          <stop offset=".75" stopColor="#65e4d9" />
          <stop offset="1" stopColor="#2f9fa8" />
        </radialGradient>
        <radialGradient id="realHand" cx="28%" cy="20%" r="82%">
          <stop offset="0" stopColor="#f0ffff" />
          <stop offset=".4" stopColor="#69d6df" />
          <stop offset="1" stopColor="#3b4e91" />
        </radialGradient>
        <filter id="realShadow" x="-50%" y="-50%" width="200%" height="220%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#040714" floodOpacity=".55" />
        </filter>
        <filter id="realGlow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse className="real-ground" cx="160" cy="435" rx="91" ry="12" />

      <g className={`realbot realbot--${mood}`} aria-hidden="true">
        <g className="real-legs">
          <path className="real-leg" d="M128 329Q126 376 118 414" />
          <path className="real-leg" d="M192 329Q194 376 202 414" />
          <path className="real-leg-highlight" d="M125 341Q124 371 120 392M195 341Q196 371 200 392" />
          <path className="real-foot" d="M116 398Q131 394 145 404L154 427Q125 438 93 426L100 409Z" />
          <path className="real-foot" d="M204 398Q189 394 175 404L166 427Q195 438 227 426L220 409Z" />
        </g>

        <g className="real-arms">
          <path className="real-arm" d={pose.arms[0]} />
          <path className="real-arm" d={pose.arms[1]} />
        </g>

        <g className="real-torso" filter="url(#realShadow)">
          <path className="real-torso-shell" d="M119 244Q160 229 201 244L218 320Q160 349 102 320Z" />
          <path className="real-torso-side" d="M199 247Q218 263 218 320Q202 334 185 339L192 260Z" />
          <path className="real-torso-shine" d="M124 258Q148 245 167 250" />
          <rect className="real-screen" x="128" y="270" width="64" height="48" rx="15" />
          <text className={`real-symbol real-symbol--${mood}`} x="160" y="304" textAnchor="middle">{chestSymbols[mood]}</text>
        </g>

        <rect className="real-neck" x="144" y="221" width="32" height="28" rx="12" />

        <g className="real-head" filter="url(#realShadow)">
          <ellipse className="real-ear real-ear--left" cx="67" cy="146" rx="20" ry="36" />
          <ellipse className="real-ear real-ear--right" cx="253" cy="146" rx="20" ry="36" />
          <path className="real-head-shell" d="M160 43Q224 42 253 81Q274 110 268 162Q262 210 221 231Q160 254 99 231Q58 210 52 162Q46 110 67 81Q96 42 160 43Z" />
          <path className="real-head-side" d="M222 62Q266 91 268 143Q272 190 235 220Q219 233 197 239Q227 211 234 171L233 101Q228 78 222 62Z" />
          <path className="real-head-shine" d="M91 80Q120 53 164 58" />
          <path className="real-visor" d="M91 87Q158 65 226 87Q247 97 250 126L247 174Q244 204 220 216Q160 235 100 216Q76 204 73 174L70 126Q73 97 91 87Z" />
          <path className="real-visor-glint" d="M91 102Q80 127 84 157M220 91Q236 105 237 126" />

          <g className={`real-eyes ${blinking ? 'real-eyes--blink' : ''} ${focused ? 'real-eyes--focused' : ''} ${comforting ? 'real-eyes--soft' : ''}`} filter="url(#realGlow)">
            {asleep ? (
              <>
                <path className="real-closed-eye" d="M93 143Q119 162 145 143" />
                <path className="real-closed-eye" d="M175 143Q201 162 227 143" />
              </>
            ) : (animated || proud) ? (
              <>
                <path className="real-happy-eye" d="M93 151Q119 119 145 151" />
                <path className="real-happy-eye" d="M175 151Q201 119 227 151" />
              </>
            ) : (
              <>
                <ellipse className="real-eye real-eye--left" cx="119" cy="143" rx={curious ? 20 : confused ? 15 : 17} ry={curious ? 25 : confused ? 20 : 23} />
                <ellipse className="real-eye real-eye--right" cx="201" cy="143" rx={curious ? 14 : confused ? 21 : 17} ry={curious ? 20 : confused ? 27 : 23} />
                <circle className="real-pupil" cx={119 + eyeX} cy={143 + eyeY} r="6" />
                <circle className="real-pupil" cx={201 + eyeX} cy={143 + eyeY} r="6" />
                <circle className="real-glint" cx={117 + eyeX} cy={140 + eyeY} r="2.5" />
                <circle className="real-glint" cx={199 + eyeX} cy={140 + eyeY} r="2.5" />
              </>
            )}
          </g>

          {!asleep && (
            <g className={`real-cheeks ${(animated || comforting || proud) ? 'real-cheeks--bright' : ''}`}>
              <ellipse cx="91" cy="176" rx="19" ry="8" />
              <ellipse cx="229" cy="176" rx="19" ry="8" />
            </g>
          )}

          {animated ? (
            <g className="real-mouth real-mouth--open">
              <path d="M139 169Q160 188 181 169Q179 201 160 207Q141 201 139 169Z" />
              <path className="real-tongue" d="M148 196Q160 189 172 196Q168 207 160 208Q152 207 148 196Z" />
            </g>
          ) : curious ? (
            <ellipse className="real-mouth real-mouth--surprised" cx="160" cy="181" rx="10" ry="12" />
          ) : (
            <path className={`real-mouth-line real-mouth-line--${mood}`} d={mouthPath} />
          )}
        </g>

        <circle className="real-hand" cx={pose.hands[0][0]} cy={pose.hands[0][1]} r="11" />
        <circle className="real-hand" cx={pose.hands[1][0]} cy={pose.hands[1][1]} r="11" />
      </g>

      {animated && <g className="real-sparks"><path d="M37 105v-17M29 97h17M276 110l13-13M276 97l13 13" /></g>}
      {thinking && <g className="real-thoughts"><circle cx="260" cy="199" r="5" /><circle cx="277" cy="184" r="8" /><circle cx="294" cy="160" r="11" /></g>}
      {asleep && <g className="real-sleep"><text x="258" y="132">z</text><text x="278" y="102">z</text><text x="295" y="66">Z</text></g>}
    </svg>
  )
}

function NinoFace({ mood, gaze, blinking, look }: { mood: NinoMood; gaze: Gaze; blinking: boolean; look: LookOffset | null }) {
  const asleep = mood === 'cochilando'
  const curious = mood === 'curioso'
  const animated = mood === 'animado'
  const thinking = mood === 'pensando'
  const focused = mood === 'concentrado'
  const confused = mood === 'confuso'
  const comforting = mood === 'acolhedor'
  const proud = mood === 'orgulhoso'
  const autoGaze = gaze === 'esquerda' ? -4 : gaze === 'direita' ? 4 : 0
  const eyeX = thinking ? 5 : confused ? -3 : Math.max(-5, Math.min(5, (look?.x ?? autoGaze) * .55))
  const eyeY = Math.max(-3, Math.min(3, (look?.y ?? 0) * .42))

  const poses: Record<NinoMood, { arms: [string, string]; paws: [[number, number], [number, number]] }> = {
    presente: { arms: ['M112 250Q91 284 83 336', 'M208 250Q229 284 237 336'], paws: [[82, 346], [238, 346]] },
    curioso: { arms: ['M112 250Q91 284 83 336', 'M208 250Q235 247 218 217'], paws: [[82, 346], [214, 207]] },
    animado: { arms: ['M112 250Q81 235 53 192', 'M208 250Q239 235 267 192'], paws: [[48, 181], [272, 181]] },
    pensando: { arms: ['M112 250Q91 284 83 336', 'M208 250Q235 240 205 205'], paws: [[82, 346], [201, 195]] },
    cochilando: { arms: ['M112 252Q95 292 99 342', 'M208 252Q225 292 221 342'], paws: [[99, 352], [221, 352]] },
    concentrado: { arms: ['M112 251Q107 290 141 312', 'M208 251Q213 290 179 312'], paws: [[148, 313], [172, 313]] },
    confuso: { arms: ['M112 250Q91 284 83 336', 'M208 250Q239 247 226 216'], paws: [[82, 346], [223, 206]] },
    acolhedor: { arms: ['M112 252Q75 258 50 299', 'M208 252Q245 258 270 299'], paws: [[43, 307], [277, 307]] },
    orgulhoso: { arms: ['M112 252Q96 281 123 309', 'M208 252Q224 281 197 309'], paws: [[130, 311], [190, 311]] },
  }
  const pose = poses[mood]

  const mouthPath = asleep ? 'M140 190Q160 184 180 190' :
    thinking ? 'M139 190Q150 180 160 190Q170 200 181 187' :
    focused ? 'M144 190Q160 187 176 190' :
    confused ? 'M138 188Q149 177 159 189Q169 201 182 186' :
    comforting ? 'M137 181Q160 202 183 181' :
    proud ? 'M141 185Q159 198 181 179' :
    'M140 183Q160 199 180 183'

  return (
    <svg className="nino-face dog-3d" viewBox="0 0 320 455" role="img" aria-label={`Nino, um cão dourado tridimensional ${mood}`}>
      <defs>
        <radialGradient id="dogFur" cx="30%" cy="18%" r="92%">
          <stop offset="0" stopColor="#ffe990" />
          <stop offset=".32" stopColor="#e8ad35" />
          <stop offset=".72" stopColor="#bd7022" />
          <stop offset="1" stopColor="#673d28" />
        </radialGradient>
        <linearGradient id="dogFurSide" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e1a02f" />
          <stop offset="1" stopColor="#6b3c27" />
        </linearGradient>
        <radialGradient id="dogCream" cx="28%" cy="18%" r="84%">
          <stop offset="0" stopColor="#fff4bf" />
          <stop offset=".65" stopColor="#e8c877" />
          <stop offset="1" stopColor="#a96d32" />
        </radialGradient>
        <radialGradient id="dogEye" cx="28%" cy="22%" r="82%">
          <stop offset="0" stopColor="#916544" />
          <stop offset=".55" stopColor="#432a25" />
          <stop offset="1" stopColor="#170f18" />
        </radialGradient>
        <filter id="dogShadow" x="-55%" y="-55%" width="220%" height="230%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#050713" floodOpacity=".48" />
        </filter>
        <filter id="dogSoftGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse className="dog-ground" cx="160" cy="438" rx="96" ry="12" />

      <g className={`dog dog--${mood}`} aria-hidden="true">
        <g className="dog-tail" filter="url(#dogShadow)">
          <path className="dog-tail-fur" d="M114 319C91 317 75 306 64 288C53 270 38 259 20 266C28 247 47 236 66 241C94 248 113 271 124 297C124 307 121 314 114 319Z" />
          <path className="dog-tail-shine" d="M107 301C91 291 80 278 64 268C51 260 39 263 31 270" />
        </g>

        <g className="dog-legs">
          <path className="dog-leg" d="M127 328Q123 375 112 414" />
          <path className="dog-leg" d="M193 328Q197 375 208 414" />
          <path className="dog-leg-shine" d="M124 344Q123 371 117 394M196 344Q197 371 203 394" />
          <path className="dog-foot" d="M111 398Q128 395 143 407L150 429Q122 442 91 429L96 412Z" />
          <path className="dog-foot" d="M209 398Q192 395 177 407L170 429Q198 442 229 429L224 412Z" />
          <path className="dog-toes" d="M106 420v10M119 418v14M214 420v10M201 418v14" />
        </g>

        <path className="dog-arm" d={pose.arms[0]} />
        <path className="dog-arm" d={pose.arms[1]} />

        <g className="dog-body" filter="url(#dogShadow)">
          <path className="dog-torso" d="M118 231Q160 215 202 231Q221 267 215 324Q187 348 160 351Q133 348 105 324Q99 267 118 231Z" />
          <path className="dog-body-side" d="M191 229Q220 250 215 324Q194 342 179 347Q193 318 192 275Z" />
          <path className="dog-chest" d="M135 236Q160 251 185 236L177 329Q160 345 143 329Z" />
          <path className="dog-body-shine" d="M119 251Q133 235 148 238" />
          <path className="dog-collar" d="M118 230Q160 244 202 230L198 248Q160 260 122 248Z" />
          <circle className="dog-tag" cx="160" cy="258" r="22" />
          {animated ? (
            <g className="dog-bulb">
              <path className="dog-bulb-rays" d="M160 237v-6M146 243l-5-5M174 243l5-5" />
              <path className="dog-bulb-glass" d="M152 254a8 8 0 1 1 16 0c0 4-2 6-4 8h-8c-2-2-4-4-4-8Z" />
              <path className="dog-bulb-base" d="M157 265h6M158 268h4" />
            </g>
          ) : (
            <text className={`dog-symbol dog-symbol--${mood}`} x="160" y={proud ? 264 : 267} textAnchor="middle">{chestSymbols[mood]}</text>
          )}
        </g>

        <g className="dog-head" filter="url(#dogShadow)">
          <path className="dog-ear dog-ear--left" d="M100 80Q67 71 53 97Q46 130 64 166Q78 183 95 168L109 114Z" />
          <path className="dog-ear dog-ear--right" d="M220 80Q253 71 267 97Q274 130 256 166Q242 183 225 168L211 114Z" />
          <path className="dog-head-fur" d="M160 49Q211 47 235 84Q250 111 239 155Q231 194 202 215Q160 236 118 215Q89 194 81 155Q70 111 85 84Q109 47 160 49Z" />
          <path className="dog-head-side" d="M211 66Q243 94 239 142Q239 183 208 208Q193 220 177 225Q203 198 208 163L206 103Z" />
          <path className="dog-head-shine" d="M104 83Q129 58 164 64" />
          <path className="dog-forehead" d="M129 73Q145 86 160 70Q175 86 191 73Q181 102 160 107Q139 102 129 73Z" />

          <g className={`dog-eyes ${blinking ? 'dog-eyes--blink' : ''} ${focused ? 'dog-eyes--focused' : ''} ${comforting ? 'dog-eyes--soft' : ''}`}>
            {asleep ? (
              <>
                <path className="dog-closed-eye" d="M103 133Q124 149 145 133" />
                <path className="dog-closed-eye" d="M175 133Q196 149 217 133" />
              </>
            ) : (animated || proud) ? (
              <>
                <path className="dog-happy-eye" d="M103 140Q124 114 145 140" />
                <path className="dog-happy-eye" d="M175 140Q196 114 217 140" />
              </>
            ) : (
              <>
                <ellipse className="dog-eye" cx="124" cy="133" rx={curious ? 16 : confused ? 12 : 14} ry={curious ? 20 : confused ? 16 : 18} />
                <ellipse className="dog-eye" cx="196" cy="133" rx={curious ? 11 : confused ? 17 : 14} ry={curious ? 16 : confused ? 22 : 18} />
                <circle className="dog-pupil" cx={124 + eyeX} cy={133 + eyeY} r="5" />
                <circle className="dog-pupil" cx={196 + eyeX} cy={133 + eyeY} r="5" />
                <circle className="dog-eye-glint" cx={122 + eyeX} cy={130 + eyeY} r="2.5" />
                <circle className="dog-eye-glint" cx={194 + eyeX} cy={130 + eyeY} r="2.5" />
              </>
            )}
          </g>

          <path className="dog-muzzle" d="M112 155Q130 142 160 156Q190 142 208 155Q217 183 199 207Q179 224 160 215Q141 224 121 207Q103 183 112 155Z" />
          <path className="dog-nose" d="M145 154Q160 145 175 154Q177 166 160 173Q143 166 145 154Z" />
          <path className="dog-nose-glint" d="M150 155Q156 151 161 153" />

          {animated || mood === 'presente' ? (
            <g className={`dog-mouth ${animated ? 'dog-mouth--open' : 'dog-mouth--smile'}`}>
              <path d={animated ? 'M125 177Q160 211 195 177Q194 217 160 229Q126 217 125 177Z' : 'M132 180Q160 207 188 180Q185 211 160 219Q135 211 132 180Z'} />
              <path className="dog-tongue" d={animated ? 'M143 207Q160 196 177 207Q174 231 160 235Q146 231 143 207Z' : 'M147 204Q160 196 173 204Q170 220 160 223Q150 220 147 204Z'} />
            </g>
          ) : curious ? (
            <ellipse className="dog-mouth dog-mouth--surprised" cx="160" cy="192" rx="9" ry="11" />
          ) : (
            <path className={`dog-mouth-line dog-mouth-line--${mood}`} d={mouthPath} />
          )}
        </g>

        <g className="dog-paws">
          <ellipse className="dog-paw" cx={pose.paws[0][0]} cy={pose.paws[0][1]} rx="12" ry="14" />
          <ellipse className="dog-paw" cx={pose.paws[1][0]} cy={pose.paws[1][1]} rx="12" ry="14" />
        </g>
      </g>

      {animated && <g className="dog-sparks"><path d="M43 100v-18M34 91h18M267 105l13-13M267 92l13 13" /></g>}
      {thinking && <g className="dog-thoughts"><circle cx="255" cy="200" r="5" /><circle cx="273" cy="184" r="8" /><circle cx="292" cy="159" r="11" /></g>}
      {asleep && <g className="dog-sleep"><text x="253" y="130">z</text><text x="274" y="100">z</text><text x="292" y="65">Z</text></g>}
    </svg>
  )
}

function App() {
  const [mood, setMood] = useState<NinoMood>('presente')
  const [gaze, setGaze] = useState<Gaze>('centro')
  const [blinking, setBlinking] = useState(false)
  const [intuitionOn, setIntuitionOn] = useState(true)
  const [suggestionIndex, setSuggestionIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [lookOffset, setLookOffset] = useState<LookOffset | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('cartoon')
  const [voiceLabOpen, setVoiceLabOpen] = useState(false)
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('local')
  const [speaking, setSpeaking] = useState(false)
  const [speechBeat, setSpeechBeat] = useState(0)
  const activityTimer = useRef<number | null>(null)
  const suggestionTimer = useRef<number | null>(null)
  const speechToken = useRef(0)
  const speechLevel = useRef(-1)
  const neuralVoice = useRef<NinoRealtimeVoice | null>(null)

  const playSpeech = useCallback((text: string, profile: VoiceProfile, nextMood: NinoMood = 'presente') => {
    const token = speechToken.current + 1
    speechToken.current = token
    neuralVoice.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    const profileSettings = voiceProfiles[profile]
    const start = () => {
      if (speechToken.current !== token) return
      setSpeaking(true)
      setSpeechBeat((value) => value + 1)
    }
    const beat = () => {
      if (speechToken.current === token) setSpeechBeat((value) => value + 1)
    }
    const finish = () => {
      if (speechToken.current === token) {
        speechLevel.current = 0
        setSpeaking(false)
      }
    }

    const playLocalFallback = () => {
      if (!('speechSynthesis' in window) || speechToken.current !== token) return
      setVoiceEngine('local')
      speechLevel.current = -1
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'
      const moodRate = nextMood === 'cochilando' ? 0.88 : nextMood === 'animado' ? 1.06 : 1
      const moodPitch = nextMood === 'cochilando' ? 0.88 : nextMood === 'animado' ? 1.04 : 1
      utterance.rate = profileSettings.rate * moodRate
      utterance.pitch = profileSettings.pitch * moodPitch
      utterance.volume = 0.86
      const voices = window.speechSynthesis.getVoices()
      utterance.voice = voices.find((voice) => voice.name.toLowerCase().includes(profileSettings.preferredVoice.toLowerCase()))
        ?? voices.find((voice) => voice.lang.toLowerCase() === 'pt-br' && /eddy|reed|rocko/i.test(voice.name))
        ?? voices.find((voice) => voice.lang.toLowerCase() === 'pt-br')
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('pt'))
        ?? null
      utterance.onstart = start
      utterance.onboundary = beat
      utterance.onend = finish
      utterance.onerror = finish
      window.speechSynthesis.speak(utterance)
    }

    setVoiceEngine('conectando')
    neuralVoice.current ??= new NinoRealtimeVoice()
    void neuralVoice.current.speak(text, profileSettings.neuralStyle, {
      onStart: start,
      onBeat: beat,
      onLevel: (level) => { speechLevel.current = level },
      onEnd: finish,
    }).then(() => {
      if (speechToken.current === token) setVoiceEngine('neural')
    }).catch(playLocalFallback)
  }, [])

  const speakMood = useCallback((nextMood: NinoMood) => {
    if (!voiceOn) return
    playSpeech(moodCaptions[nextMood], voiceProfile, nextMood)
  }, [playSpeech, voiceOn, voiceProfile])

  const previewVoice = (profile: VoiceProfile) => {
    setVoiceOn(true)
    setVoiceProfile(profile)
    setMood('presente')
    setGaze('centro')
    playSpeech(voiceSample, profile)
  }

  const wakeNino = useCallback(() => {
    setMood('curioso')
    speakMood('curioso')
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
    activityTimer.current = window.setTimeout(() => setMood('presente'), 1600)
  }, [speakMood])

  const napNow = useCallback(() => {
    setMood('cochilando')
    setSuggestionIndex(null)
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
    activityTimer.current = window.setTimeout(() => setMood('presente'), 5200)
  }, [])

  const showExpression = useCallback((nextMood: NinoMood) => {
    speakMood(nextMood)
    if (nextMood === 'cochilando') {
      napNow()
      return
    }
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
    setMood(nextMood)
    setGaze(nextMood === 'pensando' ? 'direita' : 'centro')
  }, [napNow, speakMood])

  useEffect(() => {
    let blinkEnd: number
    const blink = window.setInterval(() => {
      if (mood !== 'cochilando') {
        setBlinking(true)
        blinkEnd = window.setTimeout(() => setBlinking(false), 170)
      }
    }, 3900)
    return () => {
      window.clearInterval(blink)
      window.clearTimeout(blinkEnd)
    }
  }, [mood])

  useEffect(() => {
    const gazeOrder: Gaze[] = ['esquerda', 'centro', 'direita', 'centro']
    let gazeIndex = 0
    const lookAround = window.setInterval(() => {
      if (mood !== 'cochilando') {
        gazeIndex = (gazeIndex + 1) % gazeOrder.length
        setGaze(gazeOrder[gazeIndex])
      }
    }, 2800)
    return () => window.clearInterval(lookAround)
  }, [mood])

  useEffect(() => {
    if (!intuitionOn) {
      setSuggestionIndex(null)
      return
    }
    suggestionTimer.current = window.setTimeout(() => setSuggestionIndex(0), 7200)
    return () => {
      if (suggestionTimer.current) window.clearTimeout(suggestionTimer.current)
    }
  }, [intuitionOn])

  useEffect(() => {
    if (!feedback) return
    const feedbackTimer = window.setTimeout(() => setFeedback(null), 4200)
    return () => window.clearTimeout(feedbackTimer)
  }, [feedback])

  useEffect(() => () => {
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
    speechToken.current += 1
    neuralVoice.current?.close()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const toggleVoice = () => {
    if (voiceOn) {
      speechToken.current += 1
      neuralVoice.current?.stop()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      setSpeaking(false)
    }
    setVoiceOn((value) => !value)
  }

  const suggestion = suggestionIndex === null ? null : suggestions[suggestionIndex]
  const extraMoodActive = extraExpressionOptions.some((option) => option.mood === mood)

  const handleSuggestionAction = () => {
    if (suggestionIndex === 0) {
      speakMood('cochilando')
      napNow()
      setFeedback('Demonstração iniciada. O Nino acorda sozinho em alguns segundos.')
    } else {
      setSuggestionIndex(null)
      setFeedback('Ideia guardada apenas durante esta sessão.')
    }
  }

  const dismissSuggestion = () => {
    setSuggestionIndex(null)
    setFeedback('Tudo bem — a sugestão saiu do caminho.')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Nino, início">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>
            <strong>NINO</strong>
            <small>COMPANHEIRO DIGITAL</small>
          </span>
        </a>
        <div className="privacy-status" aria-label="Privacidade">
          <span><StatusIcon kind="mic" /> Microfone desligado</span>
          <span><StatusIcon kind="camera" /> Câmera desligada</span>
          <button
            className={`voice-toggle ${voiceOn ? 'voice-toggle--on' : ''}`}
            type="button"
            aria-pressed={voiceOn}
            aria-label={voiceOn ? 'Desligar voz do Nino' : 'Ligar voz do Nino'}
            title={voiceOn ? 'Voz ligada' : 'Voz desligada'}
            onClick={toggleVoice}
          >
            <StatusIcon kind="voice" />
            {voiceOn ? 'Voz ligada' : 'Voz desligada'}
          </button>
          <button
            className="voice-toggle voice-lab-trigger"
            type="button"
            aria-label="Comparar vozes do Nino"
            title="Comparar vozes"
            onClick={() => setVoiceLabOpen(true)}
          >
            <StatusIcon kind="tune" />
            Comparar vozes
          </button>
        </div>
      </header>

      {voiceLabOpen && (
        <section className="voice-lab" role="dialog" aria-modal="true" aria-labelledby="voice-lab-title">
          <div className="voice-lab-heading">
            <div>
              <p>TESTE DE PERSONALIDADE</p>
              <h2 id="voice-lab-title">Qual é a voz do Nino?</h2>
            </div>
            <button type="button" aria-label="Fechar comparador de vozes" onClick={() => setVoiceLabOpen(false)}>×</button>
          </div>
          <p className="voice-lab-intro">Quatro interpretações masculinas, rápidas e infantis. A escolhida será aplicada às expressões.</p>
          <blockquote>“{voiceSample}”</blockquote>
          <div className="voice-options" role="group" aria-label="Opções de voz">
            {(Object.entries(voiceProfiles) as Array<[VoiceProfile, typeof voiceProfiles[VoiceProfile]]>).map(([key, profile]) => (
              <button
                type="button"
                key={key}
                className={voiceProfile === key ? 'voice-option voice-option--active' : 'voice-option'}
                aria-pressed={voiceProfile === key}
                onClick={() => previewVoice(key)}
              >
                <span className="voice-option-play" aria-hidden="true">▶</span>
                <span><strong>{profile.label}</strong><small>{profile.detail}</small></span>
              </button>
            ))}
          </div>
          <button className="voice-confirm" type="button" onClick={() => setVoiceLabOpen(false)}>
            Usar voz {voiceProfiles[voiceProfile].label.toLowerCase()}
          </button>
          <small className={`voice-lab-note voice-lab-note--${voiceEngine}`}>
            {voiceEngine === 'neural' && 'Voz neural gerada por IA · microfone desligado'}
            {voiceEngine === 'conectando' && 'Preparando a voz neural…'}
            {voiceEngine === 'local' && 'Prévia local · configure a voz neural para ouvir a versão natural'}
          </small>
        </section>
      )}

      <section className="hero" id="inicio">
        <div className="intro-copy">
          <p className="kicker"><span /> PRESENÇA ATIVA</p>
          <h1>Olá, eu sou<br /><em>Nino.</em></h1>
          <p className="lead">
            Seu amigão cientista, pronto para inventar, explicar e perceber quando uma ideia pode ajudar.
          </p>
          <div className="presence-note">
            <span className="presence-dot" />
            <p><strong>Presença tranquila</strong><br />Estou por aqui. Sem escutar, sem observar você.</p>
          </div>
        </div>

        <div
          className={`nino-stage nino-stage--${mood}`}
          style={{ '--face-accent': moodColors[mood] } as CSSProperties}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 20
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12
            setLookOffset({ x: Math.max(-10, Math.min(10, x)), y: Math.max(-6, Math.min(6, y)) })
          }}
          onPointerLeave={() => setLookOffset(null)}
          aria-live="polite"
        >
          <div className="ambient ambient--one" />
          <div className="ambient ambient--two" />
          <div className="mood-aura" aria-hidden="true" />
          <Nino3D
            mood={mood}
            look={lookOffset}
            speaking={speaking}
            speechBeat={speechBeat}
            speechLevel={speechLevel}
            fallback={<NinoFace key={mood} mood={mood} gaze={gaze} blinking={blinking} look={lookOffset} />}
          />
          <div className={moreOpen ? 'nino-caption nino-caption--raised' : 'nino-caption'}>
            <span className="caption-indicator" />
            <span className="caption-text">{moodCaptions[mood]}</span>
          </div>
          {moreOpen && (
            <div className="expression-more" id="mais-expressoes" role="group" aria-label="Mais expressões do Nino">
              {extraExpressionOptions.map((option) => (
                <button
                  type="button"
                  key={option.mood}
                  className={mood === option.mood ? 'expression-button expression-button--active' : 'expression-button'}
                  aria-pressed={mood === option.mood}
                  onClick={() => { showExpression(option.mood); setMoreOpen(false) }}
                >
                  <span aria-hidden="true">{option.symbol}</span>
                  {option.label}
                </button>
              ))}
            </div>
          )}
          <div className="expression-controls" role="group" aria-label="Expressões do Nino">
            {expressionOptions.map((option) => (
              <button
                type="button"
                key={option.mood}
                className={mood === option.mood ? 'expression-button expression-button--active' : 'expression-button'}
                aria-pressed={mood === option.mood}
                onClick={() => showExpression(option.mood)}
              >
                <span aria-hidden="true">{option.symbol}</span>
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className={(moreOpen || extraMoodActive) ? 'expression-button expression-button--more expression-button--active' : 'expression-button expression-button--more'}
              aria-expanded={moreOpen}
              aria-controls="mais-expressoes"
              onClick={() => setMoreOpen((value) => !value)}
            >
              <span aria-hidden="true">+</span>
              Mais
            </button>
          </div>
        </div>

        <div className="control-panel" aria-label="Painel de demonstração">
          <div className="panel-heading">
            <div>
              <p className="panel-label">INTUIÇÃO LOCAL</p>
              <h2>Discreta por escolha.</h2>
            </div>
            <button
              className={`toggle ${intuitionOn ? 'toggle--on' : ''}`}
              type="button"
              role="switch"
              aria-checked={intuitionOn}
              onClick={() => setIntuitionOn((value) => !value)}
            >
              <span />
              {intuitionOn ? 'Ativa' : 'Pausada'}
            </button>
          </div>

          <p className="panel-description">
            Nesta versão, o Nino usa somente o tempo e as ações desta tela para ensaiar sugestões. Nada sai do navegador.
          </p>

          <div className="signal-row">
            <span>Sinais usados agora</span>
            <span className="local-badge">● 2 locais</span>
          </div>
          <div className="signal-list">
            <span>Tempo nesta tela</span>
            <span>Interações com o Nino</span>
          </div>

          <div className="demo-actions">
            <button className="primary-button" type="button" onClick={() => { setSuggestionIndex(1); wakeNino() }} disabled={!intuitionOn}>
              <span aria-hidden="true">✦</span> Demonstrar intuição
            </button>
          </div>
        </div>
      </section>

      <section className="principles" aria-label="Princípios desta versão">
        <article>
          <span className="principle-number">01</span>
          <div><h3>Sem sustos</h3><p>Sugestões aparecem na lateral e nunca bloqueiam sua tela.</p></div>
        </article>
        <article>
          <span className="principle-number">02</span>
          <div><h3>Você no comando</h3><p>Pausar a intuição é sempre uma escolha visível.</p></div>
        </article>
        <article>
          <span className="principle-number">03</span>
          <div><h3>Privado por padrão</h3><p>Microfone e câmera continuam desligados nesta etapa.</p></div>
        </article>
      </section>

      {suggestion && intuitionOn && (
        <aside className="intuition-card" aria-live="polite" aria-label="Sugestão do Nino">
          <div className="intuition-head">
            <span className="spark">✦</span>
            <span>PALPITE DO NINO</span>
            <button type="button" aria-label="Fechar sugestão" onClick={dismissSuggestion}>×</button>
          </div>
          <p>{suggestion.eyebrow}</p>
          <h2>{suggestion.title}</h2>
          <small>{suggestion.detail}</small>
          <div className="intuition-actions">
            <button type="button" onClick={handleSuggestionAction}>{suggestion.action}</button>
            <button type="button" onClick={dismissSuggestion}>Agora não</button>
          </div>
        </aside>
      )}

      {feedback && (
        <div className="feedback-toast" role="status">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <footer>
        <span>NINO / PRESENÇA + EXPRESSÕES</span>
        <span>PROTÓTIPO LOCAL · 2026</span>
      </footer>
    </main>
  )
}

export default App
