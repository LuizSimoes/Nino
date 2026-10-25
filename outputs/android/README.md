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

Próximo marco: refinar formas e painéis faciais para aproximar da referência antes de integrar a troca Cão/Androide. A versão atual do cão permanece intacta.
