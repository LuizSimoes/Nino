# Nino v0.1 — Escopo e critérios de aceite

## Objetivo

Validar a identidade visual, a sensação de presença, a fala expressiva e o princípio de Intuição contextual discreta em um dock compacto no navegador.

## Dentro do escopo

- Aplicação React + TypeScript + Vite publicada na Vercel.
- Nino canino dourado em SVG, com aparência 3D e proporções inspiradas em um mestiço de Golden Retriever.
- Nove estados: presente, curioso, animado, pensando, cochilando, concentrado, confuso, acolhedor e orgulhoso.
- Poses corporais, olhos, boca, cauda, efeitos e pingente próprios para cada estado.
- Piscar com pálpebras, olhar responsivo, cochilo demonstrável e retorno automático ao estado presente.
- Voz neural somente de saída por WebRTC, com alternativa automática pelo sintetizador do navegador.
- Boca sincronizada à amplitude do áudio neural, preservando a expressão de repouso durante pausas.
- Comparador de quatro perfis de voz, com **Nino cartoon** como padrão.
- Intuição local com sugestão não modal, dispensável e pausável.
- Indicadores explícitos de microfone e câmera desligados.
- Dock de até 25% da largura do desktop, com variante estreita sem rolagem da página.
- Respeito à preferência do sistema por movimento reduzido.

## Fora do escopo

- Captura de microfone ou câmera.
- Conversação aberta, identificação de locutor ou escuta contínua.
- Conta, autenticação, memória persistente ou sincronização entre dispositivos.
- Analytics, telemetria, cookies ou armazenamento dos sinais da Intuição.
- Ações sensíveis reais ou integrações externas além da geração opcional de voz.
- Escultura, retopologia e rig final do modelo Blender preservado para uma etapa futura.

## Critérios de aceite

1. A aplicação inicia com `npm run dev` e gera a versão de produção com `npm run build`.
2. O Nino permanece totalmente visível dentro do dock, sem rolagem da página.
3. Os nove controles exibem estado, legenda, pose, rosto e pingente correspondentes.
4. O cochilo fecha os olhos, mantém a boca funcional durante a fala e retorna ao estado presente em cerca de cinco segundos.
5. A boca acompanha o áudio, para nas pausas sem desaparecer e retoma na frase seguinte.
6. Trocas rápidas de expressão cancelam a fala anterior sem misturar animações ou áudio.
7. A voz neural usa a chave somente no servidor e recorre à voz local quando indisponível.
8. A Intuição aparece sem bloquear a interface, pode ser dispensada e pode ser pausada.
9. Microfone e câmera permanecem desligados e nenhuma permissão é solicitada.
10. Os controles possuem nomes acessíveis, foco visível e operação por teclado.
11. A interface permanece utilizável em uma viewport de 390 px sem rolagem horizontal.
12. `.env.local` permanece ignorado e nenhuma chave é versionada.

## Validação manual essencial

- Acionar cada uma das nove expressões e conferir legenda, rosto, pose e pingente.
- Trocar rapidamente entre Pensando, Eureca e Acolhedor enquanto o Nino fala.
- Ouvir uma frase com pausa e confirmar que a boca repousa e volta a mover na continuação.
- Iniciar Cochilo, confirmar olhos fechados e observar o retorno automático.
- Abrir e fechar o comparador de vozes, testar as quatro opções e manter Nino cartoon.
- Demonstrar, aceitar, recusar e pausar a Intuição.
- Navegar por Tab, conferir foco e nomes acessíveis.
- Testar em 1440 × 900 e 390 × 844 e confirmar ausência de rolagem da página.
