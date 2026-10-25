# Androide alternativo — em desenvolvimento

## Referência aprovada

- `conceito/android-base-v1.png`: retrato inicial da mescla, antes dos ajustes finos dos olhos e sinais.
- `conceito/android-expressoes-aprovadas-v1.png`: prancha mais recente e referência principal aprovada, incluindo desligado no cochilo, equações em Pensando, ondas em Concentrado, medalha e olhos sem cílios.
- Requisitos completos: `docs/ANDROID_DIRECAO_APROVADA.md` na raiz do projeto.

## Primeiro modelo técnico

`blockout/Android_v1_blockout.blend` contém geometria 3D editável, não uma projeção das imagens. É um **blockout de montagem e articulação**, com formas simplificadas e sem o acabamento/silhueta final da referência. Não foi integrado ao site.

- Quadro 1: montagem neutra e linha quase reta na testa.
- Quadro 30: teste de cobertura das lentes pelas duas pálpebras opacas.
- Quadro 60: teste de abertura da mandíbula.
- Cabeça, mandíbula, pálpebras e monitor têm hierarquia e nomes próprios.
- Nesta etapa, apenas a linha de repouso está modelada na tela; os outros oito conteúdos e as nove poses ainda serão implementados.

Reproduzir a partir da raiz do projeto:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python blender/build_android_v1.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python blender/verify_android_v1.py
```

Os PNGs neutro/piscar/mandíbula são verificações técnicas, não propostas de substituição do conceito aprovado. O script de verificação reabre o arquivo e confere controles, cobertura das pálpebras e direção da abertura da mandíbula. Não certifica acabamento artístico, sincronização com áudio ou desempenho no navegador.

## Segundo estudo geométrico

`refinement-v2/Android_v2_refinement.blend` preserva o primeiro modelo e substitui seus blocos faciais por painéis moldados, contorno da mandíbula, monitor integrado, circuitos e quatro obturadores curvos (duas peças por olho). O quadro 30 exibe o sinal de desligado na testa e fecha as lentes. O quadro 60 exercita a mandíbula; o 90 retorna ao repouso. PNGs neutro/cochilo/mandíbula acompanham o arquivo.

Ainda é uma aproximação geométrica simplificada: não possui o acabamento realista do conceito, nem as nove expressões completas, rastreamento de olhar, fala sincronizada, exportação final ou seletor no site. Formas e silhueta precisam de nova avaliação antes de declarar a aparência pronta.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python blender/build_android_v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python blender/verify_android_v2.py
```

Próximo marco: avaliar o segundo estudo e continuar refinando a fidelidade ao conceito antes de integrar a troca Cão/Androide. A versão atual do cão permanece intacta.
