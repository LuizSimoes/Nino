# Nino v1 — especificação para modelagem e rig 3D

## Status e referências

O conceito canino 3D está aprovado. Este pacote define como transformá-lo em uma malha animável sem reinterpretar sua identidade.

Referências visuais obrigatórias:

- `nino-v1-folha-oficial-personagem.png`: identidade, vistas e expressões principais.
- `nino-v1-construcao-rig-3d.png`: vistas ortográficas, articulações, rosto e patas.
- `nino-v1-expressoes-visemas.png`: bocas de expressão e fala.

As imagens são referências de produção; ainda não constituem uma malha 3D.

## Identidade bloqueada

- Cão antropomórfico inspirado em um mestiço de Golden Retriever.
- Cabeça grande e arredondada, orelhas caídas, focinho creme e olhos castanho-escuros.
- Tronco compacto em forma de pera, peito creme e ombros altos.
- Braços curtos terminando próximos ao quadril; patas sempre conectadas.
- Pernas curtas e firmes, pés arredondados com três dedos visíveis.
- Cauda volumosa, elevada e com curva natural.
- Coleira azul-petróleo e pingente circular azul-marinho com brilho ciano.
- Aparência contemporânea, afetuosa e imediatamente simpática; sem elementos retrô ou robóticos.

## Proporções

Use a altura total como 100 unidades:

| Região | Medida de referência |
|---|---:|
| Cabeça, incluindo orelhas | 43 |
| Pescoço e tronco | 31 |
| Pernas e pés | 26 |
| Largura máxima da cabeça | 57 |
| Largura máxima do tronco | 35 |
| Comprimento do braço em repouso | 27 |
| Diâmetro do pingente | 9 |

O centro dos olhos fica ligeiramente acima da metade da cabeça. O focinho ocupa aproximadamente 45% da largura facial. As mãos em repouso terminam na linha superior do quadril.

## Malha

Peças previstas: cabeça, focinho, nariz, globos oculares, pálpebras, orelhas, mandíbula, língua, dentes superiores simplificados, tronco, braços, patas, pernas, pés, cauda, coleira e pingente.

- Silhueta suave, sem arestas duras.
- Pelagem sugerida por material e mapas de normal, sem fios individuais.
- Loops adicionais ao redor de olhos, sobrancelhas, focinho, boca e bochechas para deformação.
- Densidade reforçada nas bases das orelhas e da cauda.
- Separar pingente e coleira para animação secundária.
- Meta para uso interativo: 35–55 mil triângulos no LOD principal.
- Criar LOD intermediário de 18–25 mil e LOD leve de 8–12 mil triângulos.

## Materiais

| Material | Cor-base aproximada | Acabamento |
|---|---|---|
| Pelagem dourada | `#E8AD35` | macio, rugosidade 0,68 |
| Luz da pelagem | `#FFE990` | integrada ao mapa, sem brilho metálico |
| Sombra da pelagem | `#BD7022` | integrada ao mapa |
| Focinho e peito | `#FFF4BF` | macio, rugosidade 0,72 |
| Olhos e nariz | `#2B1B1A` | brilho úmido controlado |
| Coleira | `#2D6177` | tecido emborrachado fosco |
| Pingente | `#102B3F` | resina escura semimetálica |
| Luz do pingente | `#65E5DE` | emissão suave |
| Língua | `#F37D86` | úmida, sem excesso de reflexo |

Texturas recomendadas: 2048 × 2048 para corpo/cabeça e 1024 × 1024 para acessórios, com base color, normal, roughness e emissive.

## Esqueleto

Hierarquia mínima:

- `root` → `pelvis` → `spine_01` → `chest` → `neck` → `head` → `jaw`.
- Braços: clavícula, braço, antebraço e pata para cada lado.
- Pernas: coxa, canela, pé e dedos para cada lado.
- Orelhas: três segmentos por lado para queda, reação e balanço.
- Cauda: cinco segmentos, com o primeiro preservando a base larga.
- Pingente: um osso secundário com limite de oscilação.
- Olhos: controle de direção compartilhado e controles individuais.

O rig deve permitir IK/FK nos braços, IK nas pernas, squash sutil no tronco e animação secundária controlada nas orelhas, cauda e pingente.

## Rosto e fala

Blendshapes mínimos:

- `blink_L`, `blink_R`, `squint`, `brow_up`, `brow_inner_up`, `brow_down`.
- `smile`, `smile_wide`, `frown`, `cheek_up`, `jaw_open`, `tongue_out`.
- Visemas: `REST`, `MBP`, `FV`, `A`, `E`, `O`, `U` e `L`.

Interpole os visemas em vez de alterná-los abruptamente. A mandíbula fornece a abertura principal; lábios e focinho refinam a forma. Durante a fala, mantenha piscadas, microinclinações de cabeça e pequenas reações das orelhas.

## Estados emocionais

| Estado | Corpo e rosto | Pingente |
|---|---|---|
| Presente | sorriso leve, olhar direto, respiração calma | ponto ciano |
| Curioso | cabeça inclinada, olhos assimétricos, uma pata junto ao focinho | `?` |
| Eureca | braços elevados, sorriso aberto, orelhas reativas, cauda rápida | lâmpada dourada com três raios |
| Pensando | olhar lateral, pata no focinho, boca ondulada | reticências |
| Cochilando | olhos fechados, cabeça baixa, respiração lenta | `Z` |
| Concentrado | olhos estreitos, patas próximas ao centro | alvo |
| Confuso | cabeça inclinada para o lado oposto, sobrancelhas assimétricas | `¿` |
| Acolhedor | braços abertos, olhos suaves, sorriso fechado | coração |
| Orgulhoso | peito elevado, sorriso seguro | estrela |

## Animações iniciais

1. `idle` — 6 s, respiração, piscada e balanço discreto.
2. `look_left`, `look_right` — 1,2 s, olhos precedem a cabeça.
3. `tail_wag_soft` e `tail_wag_happy` — ciclos de 1,4 s e 0,55 s.
4. Uma entrada de 1–2 s para cada um dos nove estados emocionais.
5. `talk_idle` — respiração e microgestos compatíveis com visemas em tempo real.
6. `listen` — postura atenta, inclinação pequena e orelhas responsivas.

## Exportação

- Entrega principal: `Nino_v1.glb` com malha, rig, materiais, blendshapes e animações.
- Escala real consistente, origem central entre os pés e personagem apoiado em Y=0.
- Texturas comprimidas para web e animações nomeadas individualmente.
- Meta inicial do GLB otimizado: até 8 MB; ideal abaixo de 5 MB para o painel compacto.
- Validar deformações em ombros, cotovelos, base das orelhas, boca e cauda antes da exportação final.

## Critérios de aceite

- Silhueta reconhecível como o Nino em frente, perfil e costas.
- Proporções consistentes com as pranchas, especialmente cabeça, braços curtos e cauda.
- Nove expressões legíveis na escala compacta da interface.
- Fala sem abertura mecânica da mandíbula e sem atravessamento do focinho.
- Orelhas, cauda e pingente com animação secundária controlada.
- Nenhuma separação entre braços e patas em qualquer pose.
- Desempenho fluido na interface web com o LOD principal ou intermediário.
