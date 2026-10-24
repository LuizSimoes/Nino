# Decisões e lacunas — Etapa 1

## Artefatos ausentes

Na inspeção inicial do espaço de trabalho, em 24 de outubro de 2026, não foram encontrados:

- `Plano_Nino_Planejamento_Consolidado_v1_1.md`
- `Kit_Especificacao_Nino_v0_1.zip`
- `Especificacao_Funcional_Tecnica_Nino_v0_1.md`
- `PROMPT_Implementacao_Etapa_1.md`

A especificação incorporada à solicitação foi adotada como fonte de verdade. Quando os arquivos forem anexados, será necessário reconciliar requisitos, nomes, fluxos e critérios de aceite sem presumir conteúdo ausente.

## Decisões reversíveis

- **Variantes preservadas:** o robô Pixel 3D permanece no componente `NinoFacePixel` e o robô 3D suave permanece no componente `NinoFaceRobot3D`, permitindo retorno a qualquer uma das duas direções sem reconstrução.
- **Conceito aprovado — Nino v1:** o personagem principal é um cão 3D inspirado na memória afetiva de um mestiço de Golden Retriever, sem pretender ser um retrato literal: pelagem dourada, peito claro, orelhas caídas, focinho, cauda volumosa e postura antropomórfica.
- **Folha oficial:** a prancha `outputs/nino-v1-folha-oficial-personagem.png` consolida frente, perfil, costas e cinco estudos de expressão para orientar a futura modelagem 3D.
- **Pacote de modelagem:** `outputs/nino-v1-construcao-rig-3d.png`, `outputs/nino-v1-expressoes-visemas.png` e `outputs/NINO_V1_ESPECIFICACAO_MODELAGEM_RIG.md` definem construção, articulações, materiais, visemas, estados e critérios de exportação.
- **Modelagem iniciada no Blender:** a versão 5.2.3 LTS foi detectada e a primeira cena editável foi criada em `outputs/3d/Nino_v1_blockout.blend`, acompanhada de um GLB de teste e uma prévia renderizada.
- **Passagem de expressões 3D concluída:** `outputs/3d/Nino_v1_expressions.blend` e `Nino_v1_expressions.glb` contêm nove ações emocionais, com prévias individuais e manifesto. Cabeça, orelhas, olhos, boca, tronco, braços e cauda variam por estado; o eixo dos braços foi corrigido para manter as patas visíveis e ligadas ao corpo. A interface ainda é vetorial; escultura, retopologia, IK, pesos finais, símbolos 3D do pingente e integração web permanecem pendentes.
- **Refinamento 3D reversível:** `outputs/3d/Nino_v2_refined.blend` preserva a versão anterior e acrescenta controles de pulso por IK, boca menor, sobrancelhas mais finas, microtextura suave de pelagem, volume interno nas orelhas e uma mecha curta assimétrica. A primeira mecha simétrica foi descartada durante a revisão por lembrar a coroa rejeitada no conceito anterior.
- **Diagnóstico do modo background:** neste ambiente protegido, o Blender encerra com código 139 ao inicializar o backend Metal em `--background`. A interface gráfica abre e executa o script de construção normalmente; por isso os artefatos foram gerados pelo console Python interno do Blender.
- **Expressão canina:** olhos grandes com direção variável, inclinações de cabeça e orelhas, nove bocas/poses, língua, cauda abanando e patas conectadas aos braços dão leitura emocional mesmo na escala compacta.
- **Novo conceito:** a referência oitentista foi abandonada para evitar que nostalgia, monitor e fósforo limitassem a simpatia e a expressividade do personagem.
- **Personagem:** Nino voltou a ser um robô digital de estética 16-bit, com proporções próximas à referência: cabeça grande, tronco menor, braços segmentados, mãos geométricas, pernas longas e duas telas. A coruja, a coroa e o conceito de criatura com orelhas foram abandonados.
- **Apelo afetivo:** o visor ocupa quase metade do personagem e concentra grandes olhos, bochechas e boca visível. O estado neutro tem sorriso aberto; surpresa, alegria, dúvida, concentração e carinho usam olhos e bocas próprios.
- **Referência visual:** a nova imagem enviada orientou a hierarquia entre cabeça, visor, corpo quadrado e membros segmentados. Geometria, proporções, paleta, rosto, poses e movimentos foram redesenhados para manter o Nino original.
- **Profundidade:** o pixel é tratado como volume. Cabeça, tronco, pernas e botas possuem face frontal, topo claro, lateral sombreada, extrusão e sombra de contato; o resultado preserva o 16-bit com leitura tridimensional.
- **Movimento:** cada braço e sua mão formam um único conjunto animado, impedindo separações nas poses. Os membros foram afinados e afastados do tronco. Cada estado também usa inclinação e escala do visor, assimetria dos olhos, boca e pequenos acentos cromáticos próprios.
- **Escala facial:** as bocas foram reduzidas para preservar espaço negativo no visor e manter os olhos como elemento expressivo principal.
- **Monitor corporal:** o painel no peito funciona como expressão secundária sincronizada, exibindo pulso, interrogação, exclamação, reticências, coração, estrela ou `z` conforme o estado do Nino.
- **Repertório emocional:** o Nino possui nove estados. Cinco permanecem visíveis na barra principal e quatro ficam em um painel compacto aberto pelo botão `Mais`, evitando aumentar permanentemente a interface.
- **Cor:** fundo índigo profundo, turquesa, lavanda, coral e creme substituem o verde-fósforo e as scanlines.
- **Interface:** a experiência funciona como um painel lateral e ocupa no máximo 25% da largura da tela em desktop e tablet, com exceção responsiva em telas pequenas. A altura acompanha o conteúdo para eliminar o espaço vazio acima do Nino; diálogos e confirmações usam composição compacta e ações empilhadas.
- **Cartão de Intuição:** o cartão é contido pelo próprio dock, com largura calculada internamente, quebra segura de texto e ações empilhadas; não ultrapassa nem é recortado pelas bordas do painel.
- **Repouso:** a piscada ocorre em intervalo regular curto, o olhar alterna entre três posições e o cochilo dura cerca de cinco segundos quando demonstrado.
- **Intuição:** a sugestão é um cartão lateral não modal; pode ser fechada, recusada ou desativada globalmente.
- **Sinais locais:** somente tempo de permanência na tela e interações com controles são representados. Eles não são armazenados nem enviados.
- **Dados:** não há cookies, `localStorage`, analytics ou permissões de dispositivo. Sem uma chave local, a aplicação não faz chamadas externas; com a voz neural ativada, envia somente o texto falado e os metadados técnicos da sessão WebRTC.
- **Voz neural opcional:** a experiência pode abrir uma sessão WebRTC somente de saída com `gpt-realtime-2.1-mini`. A chave fica no servidor local, o navegador recebe apenas o áudio, a interface identifica a voz como gerada por IA e o sintetizador local permanece como alternativa automática.

## Riscos e próximos passos, sem antecipação

- Reconciliar os artefatos originais quando estiverem disponíveis.
- Fazer uma rodada curta de teste com usuários para calibrar frequência, tom e percepção de invasividade da Intuição.
- Antes de ampliar a integração externa além da voz, definir backend, consentimento, tratamento de dados e confirmação de ações sensíveis.
- A voz neural está preparada, mas ainda depende de configuração explícita, autorização para o primeiro teste conectado e avaliação auditiva; identificação de locutor permanece fora do escopo.
