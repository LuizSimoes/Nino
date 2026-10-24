# Nino v0.1 — Escopo e critérios de aceite da Etapa 1

## Objetivo

Validar a identidade visual, a sensação de presença e o princípio de Intuição contextual discreta em uma experiência totalmente local no navegador do MacBook.

## Dentro do escopo

- Aplicação React + TypeScript + Vite.
- Rosto original do Nino desenhado em SVG e adaptável a telas menores.
- Estética retrô verde-fósforo com texto legível e foco visível.
- Repouso com piscar, olhar ao redor e cochilo demonstrável.
- Seletor direto de expressões com estados visuais claramente distintos.
- Intuição local com sugestão não modal, dispensável e pausável.
- Indicadores explícitos de microfone e câmera desligados.
- Respeito à preferência do sistema por movimento reduzido.
- Instruções locais de execução e build.

## Fora do escopo

- Backend Node, integração com modelos de IA ou armazenamento remoto.
- Voz, conversação por áudio, câmera ou identificação de locutor.
- Memória persistente e sincronização entre dispositivos.
- Modo visitante completo, autenticação ou ações sensíveis reais.
- Publicação, telemetria, analytics ou envio de dados.

## Extensão experimental posterior

Após a validação visual inicial, foi acrescentada uma voz de saída opcional. Ela usa uma sessão WebRTC somente de recepção quando há configuração local explícita, mantém o microfone desligado e volta automaticamente ao sintetizador do navegador quando a integração neural não está disponível. Conversação por áudio, captura de voz e identificação de locutor continuam fora do escopo.

## Critérios de aceite

1. A aplicação inicia localmente com `npm run dev` e gera produção com `npm run build`.
2. A primeira tela identifica claramente “Nino v0.1 — Primeiro Contato”.
3. O rosto SVG permanece visível em repouso e realiza piscadas e mudanças de olhar automáticas.
4. O usuário consegue alternar entre cinco expressões, iniciar um cochilo curto e observar o retorno automático ao estado presente.
5. Uma sugestão de Intuição aparece sem modal, pode ser dispensada e nunca executa uma ação externa.
6. A Intuição pode ser pausada e, pausada, não exibe nem permite novas sugestões.
7. A interface explica quais sinais locais a demonstração utiliza.
8. Microfone e câmera aparecem como desligados e a aplicação não solicita suas permissões.
9. Controles essenciais são operáveis por teclado, têm foco visível e nomes acessíveis.
10. A experiência principal cabe na viewport de referência sem rolagem, permanece utilizável em tela móvel e respeita `prefers-reduced-motion`.

## Validação manual essencial

- Aguardar cerca de oito segundos e confirmar a sugestão automática.
- Fechar a sugestão com “Agora não” e confirmar que a tela continua utilizável.
- Pausar a Intuição e confirmar que “Demonstrar intuição” fica indisponível.
- Reativar, demonstrar a Intuição e aceitar a sugestão.
- Selecionar as cinco expressões, iniciar “Cochilo” e confirmar o retorno automático em aproximadamente cinco segundos.
- Navegar por Tab e verificar o foco nos controles.
- Reduzir a janela para largura próxima de 390 px e verificar ausência de rolagem horizontal de conteúdo.
