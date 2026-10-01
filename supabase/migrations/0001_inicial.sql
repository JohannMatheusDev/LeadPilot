-- LeadPilot: esquema inicial.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (ou com `supabase db push`).
-- Todas as tabelas têm RLS ligada: cada linha pertence a um usuário e só ele lê
-- ou escreve. A aplicação usa a chave pública (anon/publishable) no servidor,
-- então é a RLS — e não o código — que garante que um usuário não veja o lead
-- de outro, mesmo que uma consulta esqueça o filtro por user_id.
--
-- O que é guardado aqui é dado PRÓPRIO de prospecção (status, observações,
-- proposta, histórico). Do Google guardamos o place_id, que os termos da
-- Places API permitem armazenar sem prazo. Nome e telefone ficam no lead como
-- dado de contato que o próprio usuário confirma ao salvar; endereço, site,
-- avaliação e demais campos do Google NÃO são gravados — são consultados ao
-- abrir o lead. Veja README, seção "Google Places".

create extension if not exists pgcrypto;

-- Perfil comercial de quem prospecta. Uma linha por usuário.
create table if not exists public.perfis (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  nome text not null default '',
  empresa text not null default '',
  servicos text[] not null default '{}',
  apresentacao text not null default '',
  mensagem_padrao text not null default '',
  atualizado_em timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- Nulo para lead cadastrado à mão. A unicidade abaixo impede salvar a mesma
  -- empresa duas vezes; nulos não colidem entre si no Postgres.
  place_id text,
  nome text not null,
  telefone text,
  -- Telefone listado no Google não é WhatsApp confirmado. Só o usuário marca.
  whatsapp_confirmado boolean not null default false,
  cidade text,
  segmento text,
  status text not null default 'novo' check (status in (
    'novo', 'em_analise', 'demo_pronta', 'contato_realizado',
    'cliente_respondeu', 'proposta_enviada', 'fechado', 'perdido'
  )),
  favorito boolean not null default false,
  servico text,
  observacoes text not null default '',
  -- Fatos que o usuário conferiu e aceita citar na abordagem. Separado das
  -- observações livres para o gerador de mensagens nunca citar rascunho.
  fatos_verificados text not null default '',
  demo_url text,
  valor_proposta numeric(12, 2) check (valor_proposta is null or valor_proposta >= 0),
  valor_fechado numeric(12, 2) check (valor_fechado is null or valor_fechado >= 0),
  proximo_contato date,
  -- Marcos do funil. Gravados na primeira vez que o lead alcança (ou pula) a
  -- etapa; o dashboard conta por eles e não pelo status atual, senão um lead
  -- que foi de "contato realizado" para "proposta enviada" deixaria de contar
  -- como contato no período.
  contatado_em timestamptz,
  respondeu_em timestamptz,
  proposta_em timestamptz,
  fechado_em timestamptz,
  perdido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, place_id)
);

create index if not exists leads_user_status_idx on public.leads (user_id, status);
create index if not exists leads_user_proximo_idx on public.leads (user_id, proximo_contato);

create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  tipo text not null,
  descricao text not null default '',
  de_status text,
  para_status text,
  criado_em timestamptz not null default now()
);

create index if not exists atividades_lead_idx on public.atividades (lead_id, criado_em desc);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  valor numeric(12, 2) not null check (valor > 0),
  recebido_em date not null,
  descricao text not null default '',
  criado_em timestamptz not null default now()
);

create index if not exists pagamentos_lead_idx on public.pagamentos (lead_id);

-- Registro de cada chamada paga à API do Google, usado para limitar o uso.
-- Sem política de DELETE de propósito: apagar o próprio histórico zeraria o
-- limite.
create table if not exists public.consultas_api (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null,
  criado_em timestamptz not null default now()
);

create index if not exists consultas_api_user_idx on public.consultas_api (user_id, criado_em desc);

-- Mantém atualizado_em sem depender de quem escreve lembrar.
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists leads_atualizado_em on public.leads;
create trigger leads_atualizado_em before update on public.leads
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

alter table public.perfis enable row level security;
alter table public.leads enable row level security;
alter table public.atividades enable row level security;
alter table public.pagamentos enable row level security;
alter table public.consultas_api enable row level security;

drop policy if exists "perfil do proprio usuario" on public.perfis;
create policy "perfil do proprio usuario" on public.perfis
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "leads do proprio usuario" on public.leads;
create policy "leads do proprio usuario" on public.leads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Atividade e pagamento também conferem que o lead é do usuário; sem isso
-- daria para pendurar uma linha própria num lead_id alheio.
drop policy if exists "atividades do proprio usuario" on public.atividades;
create policy "atividades do proprio usuario" on public.atividades
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = auth.uid())
  );

drop policy if exists "pagamentos do proprio usuario" on public.pagamentos;
create policy "pagamentos do proprio usuario" on public.pagamentos
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = auth.uid())
  );

drop policy if exists "consultas: ler as proprias" on public.consultas_api;
create policy "consultas: ler as proprias" on public.consultas_api
  for select using (user_id = auth.uid());

drop policy if exists "consultas: registrar as proprias" on public.consultas_api;
create policy "consultas: registrar as proprias" on public.consultas_api
  for insert with check (user_id = auth.uid());
