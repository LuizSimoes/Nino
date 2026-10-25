# Nino v0.1 — Primeiro Contato

Protótipo do Nino: um personagem canino com aparência 3D inspirado na memória afetiva de um mestiço de Golden Retriever. A experiência apresenta nove estados emocionais, olhar responsivo, microcomportamentos de repouso, pingente expressivo, conversa criativa, voz opcional e uma demonstração controlável de Intuição local.

## Executar no macOS

Requisitos: Node.js 20 ou mais recente e npm.

```bash
npm install
npm run dev
```

Abra o endereço exibido no Terminal (normalmente `http://localhost:5173`). A interface funciona como um dock compacto e ocupa, no máximo, cerca de um quarto da largura de uma tela desktop.

Para validar a versão de produção:

```bash
npm run verify
npm run preview
```

### Ativar a voz neural

O projeto funciona sem configuração, usando a voz local do macOS. Para experimentar a voz neural:

1. Copie `.env.example` para `.env.local`.
2. Preencha `OPENAI_API_KEY` somente no arquivo local.
3. Reinicie `npm run dev`.

A chave permanece no servidor local e nunca é incluída no código enviado ao navegador. `.env.local` está ignorado pelo Git.

## Publicar na Vercel

O projeto inclui funções seguras para voz e conversa. `api/realtime-session.js` recebe apenas a oferta WebRTC e devolve a resposta SDP; `api/nino-chat.js` recebe a mensagem e um histórico curto da sessão. A chave nunca chega ao navegador.

1. Importe o repositório do GitHub na Vercel e mantenha o framework **Vite**.
2. Em **Settings → Environment Variables**, crie `OPENAI_API_KEY` com a chave do projeto.
3. Faça a primeira publicação e copie o endereço final `https://...vercel.app`.
4. Crie `NINO_ALLOWED_ORIGIN` com esse endereço, sem barra no final, e publique novamente.

A rota publicada aceita somente `POST`, limita tamanho, origem e frequência básica, não armazena respostas e usa o fluxo WebRTC unificado recomendado pela OpenAI. Para uma campanha pública com grande tráfego, acrescente autenticação e rate limiting persistente no provedor.

## O que experimentar

- Observe o Nino piscar e olhar ao redor sem precisar interagir.
- Compare as expressões **De boa**, **Curioso**, **Eureca!**, **Pensando** e **Cochilo**.
- Abra **Mais** para testar **Concentrado**, **Confuso**, **Acolhedor** e **Orgulhoso**.
- Passe o ponteiro perto do Nino e observe o acompanhamento sutil do olhar.
- Use **Demonstrar intuição** para exibir uma sugestão lateral que não bloqueia a interface.
- Pause e reative a Intuição no controle **Ativa/Pausada**.
- Teste a voz **Nino cartoon**, escolhida como padrão do personagem.
- Abra **Conversar** e peça uma explicação, uma ideia ou uma invenção ao Nino.
- Confirme que nenhuma permissão de microfone ou câmera é solicitada.

## Estado atual

- A interface usa como personagem principal a ilustração vetorial dourada escolhida durante os testes. O modelo [`Nino_v6_complete.glb`](outputs/3d/Nino_v6_complete.glb) permanece preservado como base 3D para evoluções futuras.
- Os nove botões controlam as poses corporais, as expressões faciais, o piscar com pálpebras douradas, os olhos fechados do cochilo e os símbolos do pingente na ilustração principal.
- A boca vetorial acompanha a amplitude real do áudio neural, fecha durante pausas, retoma na frase seguinte e preserva a expressão emocional após a fala.
- O olhar acompanha discretamente o ponteiro pelo deslocamento das pupilas.
- O blockout estabelece proporções, materiais, peças faciais, esqueleto, testes de fala e nove ações emocionais. Escultura, retopologia e pesos finais continuam como etapas posteriores de acabamento.
- A voz tenta usar o modelo neural `gpt-realtime-2.1-mini` por WebRTC quando uma chave local está configurada; sem ela, usa automaticamente o sintetizador do navegador em português.
- A conversa criativa usa a Responses API com `gpt-6-luna`: o modelo cria texto e emoção; a camada de voz apenas lê a resposta aprovada.
- O histórico fica somente na sessão atual do navegador e as requisições usam `store: false`; não há memória persistente do Nino.
- O comparador permite ouvir **Nino divertido**, **Nino cartoon**, **Pequeno inventor** e **Jovem aventureiro**. **Nino cartoon** é o perfil padrão: masculino, infantojuvenil, rápido, sorridente e expressivo.
- A interface informa quando a voz é gerada por IA. O áudio é somente de saída: nenhum microfone é ligado ou solicitado.
- Não há conta, memória persistente ou acesso a sensores. As integrações externas de conversa e voz só são ativadas pela configuração explícita da chave.
- A “Intuição” considera apenas tempo e ações dentro da página e não persiste dados.
- Nenhuma permissão de microfone ou câmera é solicitada.

## Verificação antes de publicar

```bash
npm ci
npm run verify
npm audit --omit=dev
git status --ignored --short
```

Confirme que `.env.local` aparece apenas como ignorado (`!!`) e nunca como arquivo versionado. Se uma chave for publicada acidentalmente, revogue-a imediatamente no painel da OpenAI e crie outra.

Consulte [`docs/ESCOPO_ETAPA_1.md`](docs/ESCOPO_ETAPA_1.md), [`docs/ESCOPO_ETAPA_2.md`](docs/ESCOPO_ETAPA_2.md) e [`docs/DECISOES_E_LACUNAS.md`](docs/DECISOES_E_LACUNAS.md).

## Estrutura para versionamento

- `src/`: aplicação React, ilustração vetorial principal, integração de voz e carregador Three.js preservado para a futura evolução do modelo.
- `api/realtime-session.js`: backend serverless da voz neural para publicação na Vercel.
- `api/nino-chat.js` e `server/nino-chat-core.js`: conversa criativa, validação e personalidade do Nino.
- `public/models/nino-v6.glb`: cópia do modelo atual servida pelo aplicativo.
- `docs/`: escopo, decisões e lacunas.
- `outputs/`: relatório e pacote visual/técnico do Nino v1.
- `outputs/3d/`: cenas Blender, GLBs de teste, manifestos e prévias das expressões originais e refinadas.
- `blender/`: scripts reproduzíveis para validar o Blender, reconstruir o blockout, gerar as expressões e criar a variante refinada.
- `scripts/repair_nino_glb_eyes.mjs`: recompõe no GLB atual as peças oculares completas preservadas na versão compatível anterior.
- `package.json` e `package-lock.json`: dependências reproduzíveis.
- `vercel.json`: configuração de build, função e cabeçalhos de segurança da publicação.

`node_modules`, `dist` e `work` são recriados localmente e permanecem fora do Git por meio do `.gitignore`.
