# Androide — direção aprovada

Referências preservadas em `outputs/android/conceito/`. A prancha de expressões é a referência mais recente e prevalece sobre o retrato inicial, especialmente para os olhos sem cílios. São imagens de conceito, não modelos animáveis.

## Identidade

- Alternativa visual ao cão Nino, nunca substituição obrigatória.
- Parceiro de laboratório adulto, máquina sem pele/cabelo, simpático e competente.
- Placas claras, metal escuro, detalhes dourados, circuitos nas bochechas, olhos ópticos turquesa sem cílios.
- Testa: monitor integrado e legível. Peito: sinalização secundária discreta.
- Mesma conversa, anexos, contexto e sessões ao trocar de aparência. A escolha visual não deve apagar nem reiniciar o trabalho.

## Estados

| Estado | Testa | Rosto/peito |
| --- | --- | --- |
| De boa | Linha verde praticamente reta | Relaxado |
| Curioso | ? | Inclinação e olhar atento |
| Eureca | Lâmpada dourada com raios | Olhos abertos, reação positiva |
| Pensando | Equações complexas de eletrônica | Olhar deslocado |
| Cochilo | Símbolo de desligado ⏻, não ZZ | Pálpebras totalmente fechadas; peito discreto |
| Concentrado | Ondas senoidais verdes | Olhar firme |
| Confuso | ? e ondas desencontradas | Sobrancelhas assimétricas |
| Acolhedor | Sinal suave | Coração no peito, olhar gentil |
| Orgulhoso | Medalha dourada, não estrela | Cabeça erguida |

As equações devem ser desenhadas com texto/geometria determinísticos na versão final, não copiadas como fonte técnica da imagem gerada. Candidatas: impedância RLC, função de transferência de segunda ordem e transformada de Fourier com limites corretos.

## Etapas e limites

1. Conceito estático aprovado e preservado.
2. Blockout editável no Blender: proporções, montagem mecânica, peças móveis e teste de fechamento ocular/mandíbula. Não representa o acabamento final.
3. Refinar silhueta, peças faciais e materiais para aproximar da referência; validar antes da integração.
4. Preparar nove poses e sinais das telas, piscar, olhar e fala guiada pela amplitude do áudio.
5. Integrar seletor Cão/Androide com carregamento sob demanda, sem alterar o padrão atual, e testar celular/desktop.

O blockout não é apresentado como aparência pronta. A prévia técnica v2 pode ser escolhida como **Teslo** no seletor visual, enquanto seu acabamento continua em desenvolvimento. O cão e sua versão 3D anterior permanecem preservados.

## Integração da prévia Teslo

- Um único estado de conversa, voz, emoções e ações alimenta os dois visuais. Trocar não aborta pedidos, para áudio, recria sessões ou altera anexos/contexto.
- Preferência visual em `localStorage`, com padrão Nino e funcionamento sem persistência caso o navegador bloqueie o armazenamento.
- Componente Three.js e GLB carregados apenas sob demanda. Cena descartada ao voltar ao Nino; erro de WebGL/carregamento oferece retorno explícito.
- Monitor da testa e peito usam desenho determinístico, independente das texturas das imagens de conceito. A mandíbula recebe a mesma amplitude já disponível para o cão, inclusive silêncio e retomada; a voz local mantém a aproximação por tempo que já existia.
- São nove apresentações dos estados existentes, não nove novas personalidades. A inteligência e os parâmetros da voz permanecem inalterados.
- Testes locais cobrem o modelo, as telas e o cálculo de abertura; sincronização perceptiva com voz real e acabamento artístico ainda dependem de avaliação de uso.
