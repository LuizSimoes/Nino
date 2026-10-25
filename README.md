# Nino v0.1 — Primeiro Contato

Protótipo local do Nino: um personagem canino 3D inspirado na memória afetiva de um mestiço de Golden Retriever. A experiência apresenta nove estados emocionais, olhar responsivo, microcomportamentos de repouso, pingente expressivo e uma demonstração controlável de Intuição local.

## Executar no macOS

Requisitos: Node.js 20 ou mais recente e npm.

```bash
npm install
npm run dev
```

Abra o endereço exibido no Terminal (normalmente `http://localhost:5173`). A interface funciona como um dock compacto e ocupa, no máximo, cerca de um quarto da largura de uma tela desktop.

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

### Ativar a voz neural

O projeto funciona sem configuração, usando a voz local do macOS. Para experimentar a voz neural:

1. Copie `.env.example` para `.env.local`.
2. Preencha `OPENAI_API_KEY` somente no arquivo local.
3. Reinicie `npm run dev`.

A chave permanece no servidor local e nunca é incluída no código enviado ao navegador. `.env.local` está ignorado pelo Git.

## Publicar na Vercel

O projeto inclui uma função segura em `api/realtime-session.js`. Ela recebe apenas a oferta WebRTC, usa a chave no servidor e devolve a resposta SDP; a chave padrão nunca chega ao navegador.

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
- Confirme que nenhuma permissão de microfone ou câmera é solicitada.

## Estado atual

- A interface usa como personagem principal a ilustração vetorial dourada escolhida durante os testes. O modelo [`Nino_v6_complete.glb`](outputs/3d/Nino_v6_complete.glb) permanece preservado como base 3D para evoluções futuras.
- Os nove botões controlam as poses corporais, as expressões faciais, o piscar com pálpebras douradas, os olhos fechados do cochilo e os símbolos do pingente no modelo 3D.
- A boca vetorial acompanha a amplitude real do áudio neural, fecha durante pausas, retoma na frase seguinte e preserva a expressão emocional após a fala.
- O olhar acompanha discretamente o ponteiro por rotação tridimensional do personagem.
- O blockout estabelece proporções, materiais, peças faciais, esqueleto, testes de fala e nove ações emocionais. Escultura, retopologia e pesos finais continuam como etapas posteriores de acabamento.
- A voz tenta usar o modelo neural `gpt-realtime-2.1-mini` por WebRTC quando uma chave local está configurada; sem ela, usa automaticamente o sintetizador do navegador em português.
- O comparador permite ouvir **Nino divertido**, **Nino cartoon**, **Pequeno inventor** e **Jovem aventureiro**. **Nino cartoon** é o perfil padrão: masculino, infantojuvenil, rápido, sorridente e expressivo.
- A interface informa quando a voz é gerada por IA. O áudio é somente de saída: nenhum microfone é ligado ou solicitado.
- Não há conta, memória persistente ou acesso a sensores. A integração externa de voz só é ativada pela configuração local explícita.
- A “Intuição” considera apenas tempo e ações dentro da página e não persiste dados.
- Nenhuma permissão de microfone ou câmera é solicitada.

## Verificação antes de publicar

```bash
npm ci
npm run build
git status --ignored --short
```

Confirme que `.env.local` aparece apenas como ignorado (`!!`) e nunca como arquivo versionado. Se uma chave for publicada acidentalmente, revogue-a imediatamente no painel da OpenAI e crie outra.

Consulte [`docs/ESCOPO_ETAPA_1.md`](docs/ESCOPO_ETAPA_1.md) para os critérios de aceite e [`docs/DECISOES_E_LACUNAS.md`](docs/DECISOES_E_LACUNAS.md) para decisões reversíveis e artefatos ausentes.

## Estrutura para versionamento

- `src/`: aplicação React, carregador Three.js do Nino e alternativa vetorial.
- `api/realtime-session.js`: backend serverless da voz neural para publicação na Vercel.
- `public/models/nino-v6.glb`: cópia do modelo atual servida pelo aplicativo.
- `docs/`: escopo, decisões e lacunas.
- `outputs/`: relatório e pacote visual/técnico do Nino v1.
- `outputs/3d/`: cenas Blender, GLBs de teste, manifestos e prévias das expressões originais e refinadas.
- `blender/`: scripts reproduzíveis para validar o Blender, reconstruir o blockout, gerar as expressões e criar a variante refinada.
- `scripts/repair_nino_glb_eyes.mjs`: recompõe no GLB atual as peças oculares completas preservadas na versão compatível anterior.
- `package.json` e `package-lock.json`: dependências reproduzíveis.
- `vercel.json`: configuração de build, função e cabeçalhos de segurança da publicação.

`node_modules`, `dist` e `work` são recriados localmente e permanecem fora do Git por meio do `.gitignore`.
