# Decisões e lacunas — Nino v0.1

## Decisões atuais

- **Personagem aprovado:** cão dourado antropomórfico inspirado na memória afetiva de um mestiço de Golden Retriever, sem pretender ser um retrato literal.
- **Visual principal:** ilustração vetorial com volume, luz e sombra que produz leitura 3D em escala pequena. As alternativas anteriores de robô retrô, coruja e pixel art permanecem somente no histórico do código.
- **Proporção:** cabeça grande, corpo compacto, membros finos e cauda volumosa para manter simpatia e boa leitura no dock.
- **Expressividade:** nove estados combinam olhos, boca, cabeça, orelhas, braços, patas, cauda, efeitos e legenda.
- **Pingente:** funciona como expressão secundária. Usa pulso, interrogação, lâmpada, reticências, Z, alvo, interrogação invertida, coração ou estrela.
- **Boca e fala:** a boca reage à amplitude real do áudio neural. Em pausas, a expressão de repouso reaparece; a boca falante volta com a continuação do som.
- **Voz:** Nino cartoon é o padrão. A voz neural WebRTC é somente de saída e cai automaticamente para o sintetizador local quando necessário.
- **Privacidade:** não há captura de microfone ou câmera, conta, cookies, analytics, memória persistente ou armazenamento dos sinais locais.
- **Interface:** dock lateral de até 25% da largura no desktop, limitado a 360 px; em telas estreitas usa até 300 px e não cria rolagem da página.
- **Intuição:** usa somente tempo e ações da sessão atual para simular sugestões locais, sempre dispensáveis e pausáveis.

## Ativos preservados

- `public/models/nino-v6.glb` e `outputs/3d/Nino_v6_complete.glb`: modelo Blender/GLB para evolução futura.
- `outputs/3d/`: cenas, manifestos e prévias das nove expressões produzidas durante a exploração 3D.
- `src/Nino3D.tsx`: carregador Three.js preservado, mas não usado na experiência principal.
- `NinoFacePixel` e `NinoFaceRobot3D` em `src/App.tsx`: conceitos anteriores mantidos como alternativas reversíveis e removidos do pacote final pelo build quando não referenciados.

## Segurança e publicação

- A chave da OpenAI fica apenas em `.env.local` no desenvolvimento e em `OPENAI_API_KEY` na Vercel.
- A função `api/realtime-session.js` aceita somente `POST`, limita origem, tamanho e frequência básica e nunca devolve a chave ao navegador.
- `NINO_ALLOWED_ORIGIN` restringe a origem publicada a `https://nino-phi.vercel.app`.
- Para tráfego público relevante, ainda será necessário acrescentar autenticação e limitação persistente no provedor.

## Lacunas e próximos passos

- Fazer uma rodada curta de teste com usuários para calibrar voz, tempo do cochilo e percepção da Intuição.
- Decidir se o próximo marco evolui a ilustração vetorial ou retoma o modelo Blender para rig, retopologia e acabamento final.
- Adicionar testes automatizados do protocolo WebRTC quando houver infraestrutura de testes no projeto.
- Reconciliar eventuais especificações externas antigas caso sejam recuperadas, preservando as decisões aprovadas durante esta sessão.
