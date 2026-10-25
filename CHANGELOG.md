# Histórico de versões

## Próxima atualização

- Sessões de bancada salvas explicitamente neste navegador: conversa completa, contexto, anexos e rascunho, com reabertura, renomeação e exclusão confirmada.
- Aviso antes de trocar de bancada com alterações não salvas; painel integrado ao fluxo, sem sobrepor o personagem. Sem sincronização ou armazenamento de sessões no servidor.

- Consulta cruzada com imagem, código e PDF na mesma pergunta; seleção múltipla/incremental e remoção individual pelo botão unificado.
- Limite total de 2 MB após preparação, validado no navegador e servidor; seleção inválida preserva os anexos anteriores.
- Nino orientado a confrontar fontes, conferir a identificação dos componentes e citar páginas do PDF.

- Botão **+ Anexar** aceita PDF de até 2 MB para consultar datasheets, com identificação e tamanho antes do envio.
- PDF acompanha perguntas seguintes até ser removido ou substituído; instruções pedem referência de arquivo/página e distinção entre valores típicos, recomendados e limites absolutos.
- Limites, envelope PDF e construção da entrada documental cobertos por testes locais sem transmissão externa.

- Revisão de todas as caixas de interação: comparador de voz e avisos deixam de flutuar; estilos antigos da legenda e expressões extras removidos do posicionamento.
- Respostas abertas desde o começo, com ferramentas recolhidas e botões para copiar resposta, copiar conversa e baixar texto integral.
- Histórico da página preserva toda a sessão para revisão e exportação; código mantém indentação e quebras de linha.

- Botão unificado **+ Anexar** aceita imagens e arquivos de código/texto, com identificação automática e limites explícitos.
- Código recebido integralmente até 64 KB/24 mil caracteres; correções formatadas em bloco próprio, com cópia e preservação no histórico. A voz lê a explicação.
- Campo da conversa ampliado de 500 para 4000 caracteres.

- Anexos de imagem com prévia, troca e remoção, preparação local e validação no servidor.
- Imagem selecionada acompanha perguntas seguintes; Nino orientado a distinguir observações visuais de hipóteses e medições.
- Layout em janelas baixas ajustado para preservar cabeçalho e área de escrita com o novo controle.

- Validação reproduzível do contexto e histórico, com quatro cenários opcionais na API real para contexto, diagnóstico, acionamento e firmware.

- Modo Bancada iniciado com quatro atalhos técnicos para tarefas recorrentes.
- Ficha temporária adicionada para objetivo, plataforma, alimentação e instrumentos disponíveis.
- Contexto técnico enviado em cada pergunta quando relevante, sem memória permanente ou armazenamento no servidor.
- Breakpoint estreito corrigido: reduzir a largura da janela não esconde mais o Nino atrás da conversa.
- Durante a conversa, o painel de demonstração dá lugar ao diálogo; personagem e expressões permanecem visíveis.
- Tipografia da conversa ampliada para melhorar a leitura em janelas estreitas e telas de alta resolução.
- Dock passa a crescer verticalmente quando a conversa é aberta, aproveitando o espaço acima e abaixo sem cobrir o Nino.
- Página principal deixa de ser armazenada em cache para evitar que o navegador preserve uma interface anterior após novas publicações.
- Conversa reposicionada ao lado do dock em telas largas e transformada em tela dedicada no modo estreito, sem cobrir o Nino.
- Sugestões de Intuição incorporadas ao painel inferior, sem esconder as expressões.
- Personalidade revisada para um copiloto de laboratório adulto, técnico, proativo e espirituoso.
- Textos de demonstração atualizados para circuitos, firmware, medições e testes de bancada.
- Conversa criativa adicionada com personalidade própria, histórico apenas da sessão e emoção escolhida por resposta.
- Separação formal entre o cérebro criativo e a camada de voz, que continua lendo o texto fielmente.
- Fala literal reforçada para evitar complementos improvisados.
- Sincronização da boca preservada em falas longas até o áudio terminar de fato.
- Novos símbolos ambientais para Curioso, Concentrado, Confuso, Acolhedor e Orgulhoso.
- Concentrado agora exibe `+`, `−`, `×`, `÷` e `√` em ondas que avançam e desaparecem.
- Anatomia atual das orelhas mantida por decisão de design.
- Primeiro teste de usuário registrado em `docs/FEEDBACK_TESTES.md`.

## 0.1.0 — Primeiro Contato

Versão validada em celular e desktop em 25 de outubro de 2026.

### Entregue

- Nino canino dourado com aparência 3D e nove expressões.
- Poses, olhos, boca, cauda, efeitos e pingente próprios para cada estado.
- Voz Nino cartoon por WebRTC, com alternativa automática pelo navegador.
- Boca sincronizada ao áudio, incluindo pausas e trocas rápidas de expressão.
- Cochilo com olhos fechados e retorno automático.
- Comparador de quatro perfis de voz.
- Demonstração de Intuição local, dispensável e pausável.
- Dock responsivo de até 360 px no desktop e 300 px em telas estreitas.
- Publicação em `https://nino-phi.vercel.app/`.

### Validação

- Build de produção aprovado.
- Nove expressões e símbolos conferidos.
- Funcionamento confirmado em celular e desktop.
- Auditoria de dependências sem vulnerabilidades conhecidas.
- `.env.local` ignorado e chave da API restrita ao servidor.
