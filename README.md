# Nino v0.2 — Modo Bancada

Protótipo do Nino: um personagem canino com aparência 3D inspirado na memória afetiva de um mestiço de Golden Retriever. Além das nove expressões, voz e Intuição local, o Modo Bancada oferece atalhos técnicos e um contexto temporário para circuitos, firmware e testes.

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
- Use **Demonstrar intuição** para exibir uma sugestão dentro do painel reservado, sem cobrir o Nino ou as expressões.
- Pause e reative a Intuição no controle **Ativa/Pausada**.
- Teste a voz **Nino cartoon**, escolhida como padrão do personagem.
- Abra **Conversar** e peça ao Nino para revisar um circuito, depurar firmware ou planejar um teste de bancada.
- Use os atalhos **Revisar circuito**, **Depurar firmware**, **Planejar teste** e **Escolher componentes** para iniciar uma tarefa com linguagem técnica adequada.
- Abra **Contexto** para informar objetivo, plataforma, alimentação e instrumentos disponíveis; os dados ficam somente na aba atual.
- Confirme que nenhuma permissão de microfone ou câmera é solicitada.

## Estado atual

- Respostas completas e selecionáveis na conversa, com **Copiar resposta** (explicação e código), **Copiar conversa** e **Baixar .txt**. A legenda do personagem é um resumo; quando a conversa estiver fechada, **Ver resposta completa na conversa** reabre o histórico.
- O histórico exibido preserva todas as mensagens desta página até recarregar; somente as oito últimas entram na próxima requisição. Novas respostas aparecem desde o início, e ferramentas/contexto ficam recolhidos para reservar espaço de leitura.
- Comparador de voz, conversa, expressões extras, sugestões e avisos ocupam áreas próprias. Em janelas baixas, há rolagem em vez de sobreposição. Cópia integral validada no navegador; o teste automatizado do download `.txt` foi bloqueado pela política do navegador e precisa de confirmação manual.

- O botão único **+ Anexar** identifica imagem, código/texto ou PDF pela extensão e valida o conteúdo antes do envio. Aceita PNG, JPEG e WebP até 10 MB, PDFs até 2 MB, ou `.ino`, `.c`, `.cpp`, `.h`, `.hpp`, `.py`, `.js`, `.ts`, `.json` e `.txt` em UTF-8 até 64 KB e 24 mil caracteres. Arquivos maiores são recusados por inteiro, sem truncamento.
- A consulta cruzada aceita até três anexos: uma imagem, um código/texto e um PDF, juntos até 2 MB após a preparação da imagem. É possível selecionar os arquivos juntos ou adicioná-los aos poucos; cada anexo tem remoção individual. Seleções duplicadas ou acima do limite são recusadas sem substituir os anexos existentes. Nino é orientado a conferir se os documentos tratam da mesma peça e a separar observações, documentação e hipóteses.
- O PDF é enviado inteiro como `input_file`, conforme a [documentação oficial](https://developers.openai.com/api/docs/guides/file-inputs), sem upload persistente na Files API. Fica selecionado para perguntas seguintes até ser removido ou substituído; é reenviado junto a cada pergunta e descartado ao recarregar a página. A validação local verifica limite, nome, assinatura, base64 e marcador de encerramento; a leitura interna depende do serviço. PDFs protegidos ou ilegíveis podem exigir nova exportação ou seleção de páginas.
- Ao consultar um datasheet, Nino é orientado a citar nome e página física do PDF, declarar informações não confirmadas e distinguir condições recomendadas, valores típicos e limites absolutos. Referências geradas pelo modelo precisam ser conferidas no documento.
- O navegador redimensiona imagens para até 1600 px e as converte para JPEG de até 1 MB; o servidor valida formato, assinatura e tamanho.
- A imagem selecionada acompanha as próximas perguntas até ser removida ou substituída. As miniaturas permanecem apenas no histórico em memória da página; nenhum arquivo é criado no servidor do projeto. Ao recarregar, as imagens são descartadas. O envio à OpenAI ocorre somente ao enviar uma mensagem, inclusive quando há apenas uma imagem selecionada.
- A integração de visão segue o formato `input_image` da Responses API; o usuário validou o envio e a análise de um esquema com dois transistores e três capacitores.
- Código selecionado acompanha as próximas perguntas até ser removido ou substituído, somente em memória da página. Não é executado. A conversa aceita até 4 mil caracteres de mensagem; correções aparecem em bloco separado, com indentação e botão de copiar, e a voz lê apenas a explicação curta. O histórico preserva o código das respostas para revisões seguintes.
- `npm run test:attachments` verifica o leitor real de arquivos, UTF-8, limites individuais/conjunto, tipos únicos, seleção incremental, envelope PDF e preservação integral do conteúdo sem transmissão externa. Os testes da requisição combinada usam serviço simulado. O usuário confirmou a leitura de um PDF real; o envio conjunto ainda precisa de validação manual, pois o upload automatizado foi bloqueado pelo navegador em testes anteriores.

Para conferir contexto e histórico sem chamadas externas, execute `npm run test:bancada`. Para exercitar quatro cenários na API publicada, execute `npm run test:bancada -- --endpoint=https://nino-phi.vercel.app/api/nino-chat`; essa opção usa o serviço configurado e pode gerar consumo. Os cenários verificam contexto, continuidade de diagnóstico, acionamento de carga e firmware sem bloqueio. A avaliação por termos detecta regressões básicas e não certifica a correção de um circuito.

- A interface usa como personagem principal a ilustração vetorial dourada escolhida durante os testes. O modelo [`Nino_v6_complete.glb`](outputs/3d/Nino_v6_complete.glb) permanece preservado como base 3D para evoluções futuras.
- Os nove botões controlam as poses corporais, as expressões faciais, o piscar com pálpebras douradas, os olhos fechados do cochilo e os símbolos do pingente na ilustração principal.
- A boca vetorial acompanha a amplitude real do áudio neural, fecha durante pausas, retoma na frase seguinte e preserva a expressão emocional após a fala.
- O olhar acompanha discretamente o ponteiro pelo deslocamento das pupilas.
- O blockout estabelece proporções, materiais, peças faciais, esqueleto, testes de fala e nove ações emocionais. Escultura, retopologia e pesos finais continuam como etapas posteriores de acabamento.
- A voz tenta usar o modelo neural `gpt-realtime-2.1-mini` por WebRTC quando uma chave local está configurada; sem ela, usa automaticamente o sintetizador do navegador em português.
- A conversa usa a Responses API com `gpt-6-luna`: o Nino atua como copiloto técnico adulto de eletrônica, microcontroladores, programação e prototipagem, enquanto a camada de voz apenas lê a resposta aprovada.
- Em qualquer largura, o dock cresce verticalmente e reserva uma área abaixo do personagem para a conversa; em telas estreitas, o Nino é reduzido, mas permanece visível com suas expressões.
- O histórico fica somente na sessão atual do navegador e as requisições usam `store: false`; não há memória persistente do Nino.
- O contexto da bancada usa `sessionStorage`: sobrevive a um recarregamento na mesma aba e é descartado quando a sessão da aba termina.
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
