# LeadPilot

Prospecção de empresas locais para quem vende sites. Encontra empresas pelo Google Places, destaca as que não têm site informado no Google, organiza os leads e acompanha cada negociação até o fechamento.

Fluxo principal: **buscar empresas → salvar lead → registrar a demonstração → preparar a abordagem → abrir o WhatsApp → acompanhar no quadro.**

Stack: Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth), Google Places API (New). Só duas dependências além do Next: `@supabase/supabase-js` e `@supabase/ssr`.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha o que tiver; pode deixar tudo vazio
npm run dev
```

Abra http://localhost:3000.

> **Sem as variáveis do Supabase, a aplicação abre em modo demonstração.** Uma faixa amarela fica fixa em todas as telas, os dados são fictícios (nomes com "(fictícia)", DDD 00, sites `.invalid`) e ficam só na memória do servidor: somem ao reiniciar. Nesse modo nenhuma empresa real é consultada, mesmo que exista chave do Google.

## 1. Banco e autenticação (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com). O plano gratuito atende o uso próprio.
2. No **SQL Editor**, rode o arquivo [supabase/migrations/0001_inicial.sql](supabase/migrations/0001_inicial.sql) inteiro. Ele cria as tabelas, os índices e as políticas de RLS (cada usuário só enxerga as próprias linhas).
3. Em **Authentication → Sign In / Providers**, deixe o e-mail ativo e **desligue "Allow new users to sign up"**. A aplicação não tem tela de cadastro.
4. Em **Authentication → Users → Add user**, crie o seu usuário com e-mail e senha.
5. Em **Project Settings → API Keys**, copie a URL e a chave pública (*publishable* ou *anon*) para `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. Preencha `EMAILS_PERMITIDOS` com o seu e-mail. É a segunda trava: mesmo que alguém consiga criar conta no projeto, não entra.

Nunca use a chave `service_role` nesta aplicação: ela ignora a RLS.

## 2. Google Places (busca de empresas reais)

### Configuração

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e **ative o faturamento**. Sem conta de faturamento a API não responde, mesmo dentro da cota gratuita.
2. Ative a **Places API (New)**. A "Places API" antiga é outro produto e não serve.
3. Em **APIs e serviços → Credenciais**, crie uma chave de API e restrinja:
   - **Restrições de API:** apenas *Places API (New)*.
   - **Restrições de aplicativo:** na Vercel o IP de saída varia, então restrição por IP não funciona no plano comum. Deixe sem restrição de aplicativo e compense com a cota (passo 4) e com o segredo guardado só no servidor.
4. Em **APIs e serviços → Places API (New) → Cotas**, defina um limite diário de requisições. É a trava que vale mesmo se houver bug no código.
5. Coloque a chave em `GOOGLE_PLACES_API_KEY`, **sem** o prefixo `NEXT_PUBLIC_`.

### Custos (referência: tabela do Google, consultada em outubro de 2026)

Confira sempre a [tabela vigente](https://developers.google.com/maps/billing-and-pricing/pricing) antes de usar em volume.

| O que a aplicação faz | SKU cobrado | Preço por 1.000 | Gratuito por mês |
| --- | --- | --- | --- |
| Cada busca e cada "carregar mais" (até 20 empresas) | Text Search **Enterprise** | US$ 35 | 1.000 |
| Abrir os detalhes de uma empresa, ou abrir um lead ligado ao Google | Place Details **Enterprise** | US$ 20 | 1.000 |
| Carregar o mapa da busca (opcional) | Maps JavaScript — Dynamic Maps | US$ 7 | 10.000 |

O SKU é Enterprise porque telefone, site e avaliação só vêm nesse nível. Pedir menos campos baratearia a consulta, mas tiraria justamente os dados que qualificam o lead.

O uso é limitado em dois lugares:
- **Na aplicação:** `PLACES_LIMITE_POR_MINUTO` (padrão 10) e `PLACES_LIMITE_POR_DIA` (padrão 150), contados no banco por usuário. A consulta é registrada antes da chamada ao Google.
- **No Google Cloud:** a cota diária do passo 4.

Exemplo: 30 buscas e 30 aberturas de lead por dia dão cerca de 900 de cada por mês, dentro da faixa gratuita de cada SKU.

### Regras de uso respeitadas

- **Armazenamento.** Os termos permitem guardar o `place_id` sem prazo e proíbem guardar o restante do conteúdo. Por isso:
  - os resultados da busca **não são gravados**: ficam só na memória da tela;
  - endereço, site, avaliação e categoria **não são gravados**: são consultados de novo ao abrir o lead (painel "No Google");
  - o lead guarda o `place_id` e os seus dados de prospecção.
  - **Atenção:** ao salvar um lead, o nome e o telefone vão para o lead como dados de contato, editáveis. É uma escolha prática para o CRM funcionar sem consultar o Google a cada listagem. Se você quiser seguir os termos à risca, troque esses dados pelos que você mesmo confirmar com a empresa.
- **Atribuição.** Onde aparecem dados do Google sem um mapa ao lado, há a indicação "Google Maps". O mapa da busca é do próprio Google, como exigem as regras para exibir esses dados sobre um mapa.
- **Linguagem.** A tela diz "Sem site informado no Google", nunca "sem site": a ausência no perfil não prova que a empresa não tenha site. "Oportunidade" quer dizer apenas *sem site informado no Google e com telefone disponível*, e esse critério aparece escrito ao lado dos resultados.

Políticas oficiais: [Places API (New) — políticas](https://developers.google.com/maps/documentation/places/web-service/policies) e [Termos específicos do serviço](https://cloud.google.com/maps-platform/terms/maps-service-terms).

## 3. Mapa para escolher o centro da busca (opcional)

1. No mesmo projeto do Google Cloud, ative a **Maps JavaScript API**.
2. Crie **outra** chave, restrita a:
   - **Referenciadores HTTP:** `https://seu-dominio.vercel.app/*` e `http://localhost:3000/*`;
   - **API:** apenas *Maps JavaScript API*.
3. Coloque a chave em `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`.

Essa chave vai para o navegador, e é por isso que precisa ser separada e restrita por domínio. Sem ela, o centro da busca pode vir de "Usar minha localização", ou a busca pode ser feita só por cidade e estado. O raio precisa de um centro: o Google só aceita círculo como preferência de localização, então a aplicação mede a distância de cada resultado e esconde os que ficam fora, informando quantos foram escondidos.

## 4. Publicar na Vercel

1. Suba o repositório para o GitHub e importe o projeto em [vercel.com/new](https://vercel.com/new). O framework é detectado sozinho.
2. Em **Settings → Environment Variables**, cadastre as variáveis do `.env.example`.
3. Faça o deploy. Depois, inclua o domínio gerado nos referenciadores da chave do mapa (seção 3).
4. No Supabase, em **Authentication → URL Configuration**, ajuste o *Site URL* para o domínio da Vercel.

Variáveis com prefixo `NEXT_PUBLIC_` entram no código no momento do build: se mudar alguma delas, faça um novo deploy.

## Como funciona

| Tela | Rota | O que faz |
| --- | --- | --- |
| Dashboard | `/dashboard?periodo=30` | Métricas do período: leads, contatos, respostas, propostas, fechamentos e os valores proposto, fechado e recebido. Também gráficos e próximos acompanhamentos. |
| Buscar empresas | `/buscar` | Busca por segmento ou termo livre, cidade, estado, centro e raio. Filtros de telefone e de site, cards ou tabela, e as ações salvar, favoritar, observação, detalhes, site e Maps. |
| Meus leads | `/leads`, `/leads/[id]` | Pesquisa e filtros. No detalhe: status, serviço, demonstração, proposta, próximo contato, pagamentos, histórico e o gerador de abordagem. |
| Negociações | `/negociacoes` | Quadro Kanban com 8 etapas. Arrastar no desktop; "Mover para" no celular e pelo teclado. |
| Configurações | `/configuracoes` | Nome, empresa, serviços, apresentação, mensagem padrão e o estado das integrações. |

Regras que valem em todo o sistema:

- **Duplicados:** um lead por `place_id` por usuário, com `unique` no banco. Salvar de novo devolve o lead existente.
- **Abordagem:** a mensagem usa só dados cadastrados. "Montei uma prévia" só aparece com link de demonstração salvo. "Não encontrei site" só aparece se o Google respondeu sem site e você deixou a opção marcada. A observação citada vem de um campo próprio ("Observação verificada"), separado das notas internas.
- **WhatsApp:** abre `wa.me` com o texto preenchido e o envio é sempre seu. Abrir o WhatsApp vai para o histórico como "envio não confirmado". Só o botão "Enviei" registra o contato e, se você quiser, move o lead para "Contato realizado". O telefone do Google nunca é tratado como WhatsApp confirmado; há uma caixa para você confirmar.
- **Marcos do funil:** a primeira vez que o lead chega a contato, resposta ou proposta fica registrada. O dashboard conta por esses marcos, então uma proposta que virou fechamento continua contando como proposta. Fechar pede o valor fechado.
- **Cadastrar a demonstração** move o lead que está em "Novo" ou "Em análise" para "Demonstração pronta".

### Segurança

- Sessão em cookie httpOnly (`@supabase/ssr`). O navegador não recebe cliente de banco.
- `proxy.ts` renova a sessão e redireciona para o login. A verificação que vale está em `obterContexto()`, chamada por toda página e toda Server Action, porque uma Server Action pode receber POST direto.
- RLS em todas as tabelas, além de filtro por `user_id` nas escritas.
- Toda entrada de Server Action é validada no servidor ([app/lib/validacao.ts](app/lib/validacao.ts)). Links aceitam só `http`/`https`.
- Os logs registram só o tipo do erro e o código do banco, sem dados de lead nem chaves.
- Cabeçalhos: `X-Frame-Options: DENY`, `noindex` e `Referrer-Policy` restrita.

### Estrutura

```
app/
  (painel)/          telas autenticadas (layout com menu)
    buscar/ leads/ negociacoes/ dashboard/ configuracoes/
  login/
  components/        componentes usados por mais de uma tela
  lib/
    acoes/           Server Actions (busca, leads, perfil, sessão)
    repositorio/     persistência: supabase.ts (real) e demo.ts (memória)
    leads.ts         regras do funil e do histórico
    places.ts        cliente da Places API (New)
    mensagens.ts     gerador de abordagem por templates
    metricas.ts      cálculo do dashboard
proxy.ts             renovação de sessão e redirecionamento
supabase/migrations/ esquema do banco
```

## Limitações desta versão

- O gerador usa templates locais, sem IA. Se for integrar um modelo de IA, a chamada deve ser feita numa Server Action, com a chave em variável de ambiente sem `NEXT_PUBLIC_`, e com as mesmas regras de só citar dados cadastrados.
- No modo demonstração, numa hospedagem serverless, cada instância tem a própria memória. Serve para conhecer a ferramenta, não para trabalhar.
- Não há planos, assinaturas nem créditos, por decisão desta primeira versão.
