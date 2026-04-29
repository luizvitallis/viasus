-- ============================================================================
--  0001_init.sql — schema base do ViaSus
--  Aplicar via: Supabase Dashboard > SQL Editor > New Query > [paste] > Run
--  Idempotência: NÃO. Rodar exatamente uma vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. Enum types (tipos fortes em vez de strings soltas)
-- ----------------------------------------------------------------------------
create type user_role as enum (
  'admin', 'gestor', 'curador', 'publicador', 'profissional'
);

create type protocol_type as enum (
  'linha_cuidado', 'pcdt', 'encaminhamento', 'pop', 'diretriz'
);

create type protocol_status as enum ('draft', 'published', 'archived');

create type node_type as enum (
  'ponto_atencao',
  'decisao',
  'conduta_intermediaria',
  'conduta_terminal',
  'encaminhamento',
  'calculadora'
);

create type edge_style as enum ('normal', 'urgente', 'condicional');

create type audit_action as enum (
  'create', 'update', 'delete_node', 'publish', 'archive', 'fork', 'view'
);

create type usage_action as enum (
  'open_protocol', 'click_node', 'search', 'complete_flow'
);

-- ----------------------------------------------------------------------------
-- 3. Trigger function: atualiza updated_at automaticamente
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Tabelas
-- ----------------------------------------------------------------------------

-- ============= TENANTS =============
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subdomain text unique not null,
  created_at timestamptz not null default now()
);

comment on table public.tenants is
  'Municípios/instituições que hospedam protocolos. Tudo segrega por tenant_id.';

-- ============= PROFILES (1-1 com auth.users) =============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text not null,
  name text,
  role user_role not null default 'profissional',
  created_at timestamptz not null default now()
);

create index idx_profiles_tenant on public.profiles(tenant_id);

comment on table public.profiles is
  'Estende auth.users com tenant + role. Criado no signup, ligado por convite.';

-- ============= PROTOCOLS =============
create table public.protocols (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type protocol_type not null,
  title text not null,
  slug text not null,
  specialty text,
  summary text,
  source_protocol_id uuid references public.protocols(id),
  active_version_id uuid,                    -- FK adicionada após protocol_versions existir
  status protocol_status not null default 'draft',
  tags jsonb not null default '[]'::jsonb,
  owner_curator_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index idx_protocols_tenant on public.protocols(tenant_id);
create index idx_protocols_status on public.protocols(tenant_id, status);

create trigger trg_protocols_updated
  before update on public.protocols
  for each row execute function public.set_updated_at();

comment on table public.protocols is
  'Cabeçalho do protocolo. O conteúdo do grafo vive em nodes/edges (rascunho) e protocol_versions (publicado).';

-- ============= PROTOCOL_VERSIONS (snapshots imutáveis) =============
create table public.protocol_versions (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version_number int not null,
  graph jsonb not null,
  change_note text,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id),
  is_current boolean not null default false,
  unique (protocol_id, version_number)
);

create index idx_versions_current on public.protocol_versions(protocol_id) where is_current;

-- Agora que protocol_versions existe, fechamos a FK em protocols
alter table public.protocols
  add constraint fk_active_version
  foreign key (active_version_id)
  references public.protocol_versions(id)
  on delete set null;

comment on table public.protocol_versions is
  'Snapshot imutável do grafo no momento da publicação. Permite voltar a versões antigas.';

-- ============= NODES (rascunho mutável) =============
create table public.nodes (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type node_type not null,
  label text not null,
  position_x float not null default 0,
  position_y float not null default 0,
  content jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  links_to_protocol_id uuid references public.protocols(id),
  encaminhamento_target_id uuid references public.protocols(id),
  calculator_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_nodes_protocol on public.nodes(protocol_id);

create trigger trg_nodes_updated
  before update on public.nodes
  for each row execute function public.set_updated_at();

comment on table public.nodes is
  'Nó do fluxograma. content é JSONB (TipTap). type determina o estilo visual.';

-- ============= EDGES (rascunho mutável) =============
create table public.edges (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_node_id uuid not null references public.nodes(id) on delete cascade,
  target_node_id uuid not null references public.nodes(id) on delete cascade,
  label text,
  condition_expr jsonb,
  style edge_style not null default 'normal'
);

create index idx_edges_protocol on public.edges(protocol_id);

comment on table public.edges is
  'Aresta entre nós. condition_expr permite avaliação dinâmica em modo passo-a-passo.';

-- ============= ATTACHMENTS =============
create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  source_url text,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create index idx_attachments_protocol on public.attachments(protocol_id);

comment on table public.attachments is
  'PDFs e imagens vinculados a um protocolo. Bucket Supabase Storage: protocol-attachments.';

-- ============= AUDIT LOG =============
create table public.protocol_audit (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  protocol_id uuid references public.protocols(id) on delete set null,
  user_id uuid references public.profiles(id),
  action audit_action not null,
  payload jsonb,
  occurred_at timestamptz not null default now()
);

create index idx_audit_protocol on public.protocol_audit(protocol_id, occurred_at desc);
create index idx_audit_tenant_date on public.protocol_audit(tenant_id, occurred_at desc);

comment on table public.protocol_audit is
  'Trilha de auditoria. Append-only. Nunca atualizar nem deletar linha existente.';

-- ============= USAGE ANALYTICS =============
create table public.protocol_usage (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  version_id uuid references public.protocol_versions(id),
  user_id uuid references public.profiles(id),
  node_id uuid references public.nodes(id),
  action usage_action not null,
  duration_ms int,
  occurred_at timestamptz not null default now()
);

create index idx_usage_protocol_date on public.protocol_usage(protocol_id, occurred_at desc);
create index idx_usage_tenant_date on public.protocol_usage(tenant_id, occurred_at desc);

comment on table public.protocol_usage is
  'Eventos de uso para métricas de adesão. Sem PII de paciente.';
