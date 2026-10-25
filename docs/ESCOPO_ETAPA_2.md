# Nino — Etapa 2: conversa criativa

## Objetivo

Validar o Nino como assistente conversacional criativo sem alterar a interface compacta nem comprometer a sincronização da voz.

## Arquitetura

- O cérebro criativo usa a Responses API e escolhe texto e emoção para cada resposta.
- A voz recebe o texto pronto e o lê literalmente, mantendo a boca sincronizada até o áudio terminar.
- O navegador conserva somente os últimos turnos da sessão atual.
- Cada requisição envia um histórico curto com `store: false`; não há memória persistente do Nino.

## Critérios de aceite

1. **Conversar** abre um painel sobreposto sem aumentar o dock ou criar rolagem da página.
2. A pessoa pode enviar texto por botão ou pela tecla Enter; Shift+Enter cria nova linha.
3. O Nino responde em português brasileiro como copiloto técnico adulto: preciso, curioso, proativo, acolhedor e espirituoso.
4. Cada resposta escolhe uma das nove expressões e é reproduzida pela voz quando ela está ligada.
5. A camada de voz não acrescenta conteúdo ao texto criado pelo cérebro.
6. O histórico desaparece ao recarregar a página e não é armazenado pelo aplicativo.
7. Mensagens, histórico, origem e frequência são validados no servidor; a chave permanece secreta.
8. Falhas da API aparecem de forma amigável e não quebram as expressões nem a interface.
