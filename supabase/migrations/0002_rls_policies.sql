-- ============================================================================
--  0002_rls_policies.sql — Row Level Security para todas as tabelas
--  Aplicar APÓS 0001_init.sql.
--
--  Estratégia:
--   - Todas as tabelas com tenant_id têm RLS ON.
--   - Helpers public.user_tenant_id() e public.user_role() são SECURITY
--     DEFINER (rodam como postgres) e bypassam RLS para evitar deadlock.
--   - service_role (usado em scripts/seed.ts) bypassa RLS por design.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helpers (SECURITY DEFINER + search_path travado)
-- ----------------------------------------------------------------------------
create or replace function public.user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- 2. Habilitar RLS em todas as tabelas de domínio
-- ----------------------------------------------------------------------------
alter table public.tenants            enable row level security;
alter table public.profiles           enable row level security;
alter table public.protocols          enable row level security;
alter table public.protocol_versions  enable row level security;
alter table public.nodes              enable row level security;
alter table public.edges              enable row level security;
alter table public.attachments        enable row level security;
alter table public.protocol_audit     enable row level security;
alter table public.protocol_usage     enable row level security;

-- ----------------------------------------------------------------------------
-- 3. Policies — TENANTS
--    Usuário lê apenas o próprio tenant. Criação só via service_role.
-- ----------------------------------------------------------------------------
create policy tenants_select_own on public.tenants
  for select
  using (id = public.user_tenant_id());

-- ----------------------------------------------------------------------------
-- 4. Policies — PROFILES
--    Usuário lê o próprio profile e os colegas do mesmo tenant.
--    Atualiza apenas o próprio profile (campos não-sensíveis).
--    Insert via service_role no signup; admin pode inserir manualmente.
-- ----------------------------------------------------------------------------
create policy profiles_select_same_tenant on public.profiles
  for select
  using (tenant_id = public.user_tenant_id());

create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and tenant_id = public.user_tenant_id());

create policy profiles_insert_admin on public.profiles
  for insert
  with check (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('admin', 'gestor')
  );

-- ----------------------------------------------------------------------------
-- 5. Policies — PROTOCOLS
--    SELECT: qualquer usuário do tenant.
--    INSERT: curador, gestor, publicador, admin.
--    UPDATE: dono curador (em draft) ou gestor/publicador/admin.
--    DELETE: gestor ou admin.
-- ----------------------------------------------------------------------------
create policy protocols_select_tenant on public.protocols
  for select
  using (tenant_id = public.user_tenant_id());

create policy protocols_insert_curator on public.protocols
  for insert
  with check (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

create policy protocols_update_curator on public.protocols
  for update
  using (
    tenant_id = public.user_tenant_id()
    and (
      (status = 'draft' and (owner_curator_id = auth.uid() or public.user_role() in ('gestor', 'publicador', 'admin')))
      or public.user_role() in ('gestor', 'publicador', 'admin')
    )
  );

create policy protocols_delete_admin on public.protocols
  for delete
  using (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('gestor', 'admin')
  );

-- ----------------------------------------------------------------------------
-- 6. Policies — PROTOCOL_VERSIONS (imutável após criação)
--    SELECT: tenant. INSERT: gestor/publicador/admin (publicação).
--    Sem UPDATE nem DELETE — versões nunca mudam.
-- ----------------------------------------------------------------------------
create policy versions_select_tenant on public.protocol_versions
  for select
  using (tenant_id = public.user_tenant_id());

create policy versions_insert_publisher on public.protocol_versions
  for insert
  with check (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('gestor', 'publicador', 'admin')
  );

-- ----------------------------------------------------------------------------
-- 7. Policies — NODES e EDGES
--    Mesmo padrão de protocols: leitura por tenant; mutação por curador+.
-- ----------------------------------------------------------------------------
create policy nodes_select_tenant on public.nodes
  for select
  using (tenant_id = public.user_tenant_id());

create policy nodes_mutate_curator on public.nodes
  for all
  using (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  )
  with check (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

create policy edges_select_tenant on public.edges
  for select
  using (tenant_id = public.user_tenant_id());

create policy edges_mutate_curator on public.edges
  for all
  using (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  )
  with check (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

-- ----------------------------------------------------------------------------
-- 8. Policies — ATTACHMENTS
-- ----------------------------------------------------------------------------
create policy attachments_select_tenant on public.attachments
  for select
  using (tenant_id = public.user_tenant_id());

create policy attachments_insert_curator on public.attachments
  for insert
  with check (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

create policy attachments_delete_curator on public.attachments
  for delete
  using (
    tenant_id = public.user_tenant_id()
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

-- ----------------------------------------------------------------------------
-- 9. Policies — PROTOCOL_AUDIT (append-only)
--    SELECT: tenant. INSERT: usuário autenticado do tenant (server actions).
--    Sem UPDATE nem DELETE — auditoria é imutável.
-- ----------------------------------------------------------------------------
create policy audit_select_tenant on public.protocol_audit
  for select
  using (tenant_id = public.user_tenant_id());

create policy audit_insert_authenticated on public.protocol_audit
  for insert
  with check (
    tenant_id = public.user_tenant_id()
    and user_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 10. Policies — PROTOCOL_USAGE (append-only)
-- ----------------------------------------------------------------------------
create policy usage_select_tenant on public.protocol_usage
  for select
  using (tenant_id = public.user_tenant_id());

create policy usage_insert_authenticated on public.protocol_usage
  for insert
  with check (
    tenant_id = public.user_tenant_id()
    and (user_id = auth.uid() or user_id is null)
  );
