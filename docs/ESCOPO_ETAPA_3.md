# Nino — Etapa 3: Modo Bancada

## Objetivo

Transformar a conversa do Nino em uma ferramenta de trabalho para eletrônica, microcontroladores, firmware e prototipagem, preservando a interface compacta e a privacidade por padrão.

## Entregue neste incremento

- Quatro atalhos editáveis: revisar circuito, depurar firmware, planejar teste e escolher componentes.
- Contexto técnico temporário com objetivo, plataforma, alimentação e instrumentos disponíveis.
- Contexto armazenado apenas em `sessionStorage` e enviado somente junto às perguntas da sessão.
- Limites e saneamento independentes para cada campo antes de chegar ao modelo.
- Interface responsiva com o Nino e as expressões sempre visíveis acima da conversa.

## Critérios de validação

1. Um atalho preenche o campo de mensagem e permite edição antes do envio.
2. O contexto informado influencia a resposta sem ser repetido desnecessariamente.
3. Fechar a aba encerra o contexto; nenhuma informação é persistida pelo servidor.
4. A conversa continua utilizável em 390 px, 540 px e 760 px de largura.
5. A resposta respeita limites elétricos e solicita confirmação quando faltarem dados críticos.

## Próximos incrementos

- Casos de teste técnicos automatizados para respostas, segurança e continuidade.
- Análise de imagens de esquemas e da bancada.
- Leitura assistida de arquivos de código e documentação de componentes.
