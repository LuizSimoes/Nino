# Nino v1 — Primeiro Contato

Protótipo local do Nino: um personagem canino 3D inspirado na memória afetiva de um mestiço de Golden Retriever. A experiência apresenta nove estados emocionais, olhar responsivo, microcomportamentos de repouso, pingente expressivo e uma demonstração controlável de Intuição local.

## Executar no macOS

Requisitos: Node.js 20 ou mais recente e npm.

```bash
npm install
npm run dev
```

Abra o endereço exibido no Terminal (normalmente `http://localhost:5173`).

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

A chave permanece no servidor local e nunca é enviada ao código do navegador. `.env.local` está ignorado pelo Git.

## O que experimentar

- Observe o Nino piscar e olhar ao redor sem precisar interagir.
- Compare as expressões **De boa**, **Curioso**, **Eureca!**, **Pensando** e **Cochilo**.
- Abra **Mais** para testar **Concentrado**, **Confuso**, **Acolhedor** e **Orgulhoso**.
- Passe o ponteiro perto do Nino e observe o acompanhamento sutil do olhar.
- Use **Demonstrar intuição** para exibir uma sugestão lateral que não bloqueia a interface.
- Pause e reative a Intuição no controle **Ativa/Pausada**.
- Confirme no topo que microfone e câmera permanecem desligados.

## Estado atual

- A interface carrega o modelo real [`Nino_v6_complete.glb`](outputs/3d/Nino_v6_complete.glb) com Three.js e mantém a ilustração vetorial como alternativa automática de carregamento.
- Os nove botões controlam as poses corporais, as expressões faciais, o piscar com pálpebras douradas, os olhos fechados do cochilo e os símbolos do pingente no modelo 3D.
- A boca usa uma sequência discreta de visemas sincronizada ao início, aos limites das palavras e ao fim da fala sintetizada.
- O olhar acompanha discretamente o ponteiro por rotação tridimensional do personagem.
- O blockout estabelece proporções, materiais, peças faciais, esqueleto, testes de fala e nove ações emocionais. Escultura, retopologia e pesos finais continuam como etapas posteriores de acabamento.
- A voz tenta usar o modelo neural `gpt-realtime-2.1-mini` por WebRTC quando uma chave local está configurada; sem ela, usa automaticamente o sintetizador do navegador em português.
- O comparador de voz permite ouvir a mesma frase nas interpretações **Garoto brincalhão**, **Pequeno inventor** e **Jovem aventureiro**; a escolhida passa a orientar todas as expressões.
- A interface informa quando a voz é gerada por IA. O áudio é somente de saída: nenhum microfone é ligado ou solicitado.
- Não há conta, memória persistente ou acesso a sensores. A integração externa de voz só é ativada pela configuração local explícita.
- A “Intuição” considera apenas tempo e ações dentro da página e não persiste dados.
- Nenhuma permissão de microfone ou câmera é solicitada.

Consulte [`docs/ESCOPO_ETAPA_1.md`](docs/ESCOPO_ETAPA_1.md) para os critérios de aceite e [`docs/DECISOES_E_LACUNAS.md`](docs/DECISOES_E_LACUNAS.md) para decisões reversíveis e artefatos ausentes.

## Estrutura para versionamento

- `src/`: aplicação React, carregador Three.js do Nino e alternativa vetorial.
- `public/models/nino-v6.glb`: cópia do modelo atual servida pelo aplicativo.
- `docs/`: escopo, decisões e lacunas.
- `outputs/`: relatório e pacote visual/técnico do Nino v1.
- `outputs/3d/`: cenas Blender, GLBs de teste, manifestos e prévias das expressões originais e refinadas.
- `blender/`: scripts reproduzíveis para validar o Blender, reconstruir o blockout, gerar as expressões e criar a variante refinada.
- `scripts/repair_nino_glb_eyes.mjs`: recompõe no GLB atual as peças oculares completas preservadas na versão compatível anterior.
- `package.json` e `package-lock.json`: dependências reproduzíveis.

`node_modules`, `dist` e `work` são recriados localmente e permanecem fora do Git por meio do `.gitignore`.
