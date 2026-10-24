# Nino — evolução do personagem e expressões 3D

Este diretório contém a primeira tradução editável das pranchas aprovadas para uma cena 3D real.

## Arquivos

- `Nino_v1_blockout.blend`: cena-fonte do Blender 5.2.3 LTS.
- `Nino_v1_blockout.glb`: exportação de teste para a futura integração web.
- `Nino_v1_blockout_preview.png`: render frontal para revisão visual rápida.
- `Nino_v1_expressions.blend`: cena editável com as nove ações emocionais.
- `Nino_v1_expressions.glb`: exportação com rig, visemas e ações emocionais.
- `Nino_v1_expression_manifest.json`: nomes das ações, rótulos e símbolos previstos para o pingente.
- `expressions/`: nove renders de revisão, um para cada estado.
- `Nino_v2_refined.blend`: variante reversível com refinamento visual e controles de IK dos pulsos.
- `Nino_v2_refined.glb`: exportação da variante refinada com as nove ações.
- `Nino_v2_refined_manifest.json`: relação das melhorias, controles e prévias da variante.
- `refined_expressions/`: nove renders usados para validar a variante refinada.
- `Nino_v4_mouth_rebuild.blend`: candidata baseada na v2, com a boca canina reconstruída em peças independentes.
- `Nino_v4_mouth_rebuild.glb`: exportação da candidata com a nova cavidade e onze controles faciais.
- `Nino_v4_mouth_rebuild_manifest.json`: origem, alterações e relação das nove expressões.
- `mouth_v4_expressions/`: nove renders completos e quatro closes para revisão da nova boca.
- `Nino_v5_runtime_ready.blend`: variante preparada para uso na interface, com fala, olhos realmente fechados no cochilo e ícones do pingente.
- `Nino_v5_runtime_ready.glb`: exportação com as animações e elementos visuais de execução.
- `Nino_v5_runtime_ready_manifest.json`: mapa das ações de fala, olhos, corpo e pingente.
- `runtime_v5_previews/`: prévias dos fonemas, dos nove ícones e da expressão corrigida de cochilo.
- `Nino_v6_pendant_legible.blend`: versão atual, com o visor do pingente ampliado e os nove símbolos reposicionados e reforçados para leitura no corpo inteiro.
- `Nino_v6_pendant_legible.glb`: exportação atual para a futura integração web.
- `Nino_v6_pendant_legible_manifest.json`: escalas e alterações aplicadas aos símbolos.
- `pendant_v6_previews/`: dezoito imagens de validação — nove closes do pingente e nove enquadramentos de corpo inteiro.

Os geradores reproduzíveis estão na pasta `blender/`, incluindo `build_nino_v4_mouth_rebuild.py` para a nova boca.

## O que já está representado

- cabeça grande, orelhas caídas, focinho creme e olhos castanhos;
- tronco compacto em forma de pera, peito claro e ombros altos;
- braços curtos com sobreposição contínua entre antebraços e patas;
- pernas firmes e pés arredondados com três dedos;
- cauda elevada com curva natural;
- coleira azul-petróleo e pingente ampliado com luz ciano;
- armature inicial com hierarquia de corpo, membros, orelhas, cauda, mandíbula e pingente;
- shape keys de piscada, sorriso, abertura de mandíbula e visemas `REST`, `MBP`, `FV`, `A`, `E`, `O`, `U` e `L`;
- ações iniciais `idle`, `look_left`, `look_right`, `tail_wag_soft`, `tail_wag_happy` e `talk_idle`.
- ações emocionais `mood_presente`, `mood_curioso`, `mood_eureka`, `mood_pensando`, `mood_cochilando`, `mood_concentrado`, `mood_confuso`, `mood_acolhedor` e `mood_orgulhoso`;
- variações por estado de cabeça, orelhas, olhos, boca, tronco, braços e cauda;
- braços corrigidos no eixo frontal para que as patas permaneçam conectadas e visíveis nas poses.
- controles `hand_ik_L`, `hand_ik_R`, `elbow_pole_L` e `elbow_pole_R` na variante `v2_refined`;
- boca discretamente menor, sobrancelhas mais finas, mecha assimétrica curta, interior das orelhas e microtextura suave de pelagem na variante refinada.
- boca canina em “W”, cavidade pequena independente e língua reservada às expressões abertas na candidata `v4_mouth_rebuild`.
- ação de fala `talk_idle_v4`, pálpebras próprias para o cochilo e nove ícones luminosos no pingente na variante `v5_runtime_ready`.
- pingente 12% maior, sem o brilho central que encobria os desenhos, com símbolos em alto contraste na variante `v6_pendant_legible`.

## Estado de produção

Este é um **blockout animado avançado**, ainda não a malha final. As peças permanecem separadas para facilitar a revisão. As nove poses emocionais, a fala, o cochilo com olhos fechados e os nove símbolos do pingente já estão modelados e exportados. A `v6_pendant_legible` é a base atual. A próxima passagem deve esculpir e retopologizar, unir as transições anatômicas, pintar pesos, aprimorar cotovelos e controles e, por fim, testar o GLB no painel compacto.

## Blender neste Mac

- Executável: `/Applications/Blender.app/Contents/MacOS/Blender`
- Versão confirmada: Blender 5.2.3 LTS
- Interface gráfica e console Python: funcionais
- `--background` no ambiente protegido: falha na detecção do Metal com código 139 antes de executar Python

