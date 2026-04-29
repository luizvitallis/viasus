-- ============================================================================
--  0004_public_read_policies.sql — leitura pública de conteúdo publicado
--  Aplicar APÓS 0001/0002/0003.
--
--  Mudança de modelo (decidida no início da Fase 2):
--    - Visualizador é PÚBLICO por tenant. Anônimo lê protocolos com
--      status='published'. Drafts seguem privados.
--    - Tenant é resolvido pela URL: /[tenant-subdomain]/...
--    - Edição/admin continua exigindo login.
--
--  Por que liberar leitura: o conteúdo é referência clínica pública (Linhas
--  de Cuidado, PCDTs, etc) — Caucaia já distribui esses PDFs publicamente.
--  Tornar indexável por Google ajuda profissional na ponta.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TENANTS — anon precisa ler para resolver subdomain → tenant_id
-- ----------------------------------------------------------------------------
create policy tenants_select_anon on public.tenants
  for select to anon
  using (true);

-- ----------------------------------------------------------------------------
-- 2. PROTOCOLS — anon vê APENAS published
-- ----------------------------------------------------------------------------
create policy protocols_select_published_anon on public.protocols
  for select to anon
  using (status = 'published');

-- ----------------------------------------------------------------------------
-- 3. PROTOCOL_VERSIONS — anon vê apenas a versão CURRENT de protocolos publicados
--    (visualizador renderiza a partir do snapshot JSONB; nodes/edges
--    não precisam ser expostos publicamente)
-- ----------------------------------------------------------------------------
create policy versions_select_published_anon on public.protocol_versions
  for select to anon
  using (
    is_current
    and exists (
      select 1 from public.protocols p
      where p.id = protocol_versions.protocol_id
        and p.status = 'published'
    )
  );

-- ----------------------------------------------------------------------------
-- 4. ATTACHMENTS — anon vê anexos de protocolos publicados
-- ----------------------------------------------------------------------------
create policy attachments_select_published_anon on public.attachments
  for select to anon
  using (
    exists (
      select 1 from public.protocols p
      where p.id = attachments.protocol_id
        and p.status = 'published'
    )
  );

-- ----------------------------------------------------------------------------
-- 5. PROTOCOL_USAGE — anon pode INSERIR eventos de visualização (analytics)
--    Restrições:
--      - user_id deve ser null (anônimo)
--      - protocol deve estar publicado
--      - tenant_id deve casar com o do protocolo (não pode forjar)
-- ----------------------------------------------------------------------------
create policy usage_insert_anon on public.protocol_usage
  for insert to anon
  with check (
    user_id is null
    and exists (
      select 1 from public.protocols p
      where p.id = protocol_usage.protocol_id
        and p.tenant_id = protocol_usage.tenant_id
        and p.status = 'published'
    )
  );

-- ----------------------------------------------------------------------------
-- Notas:
--   - profiles, protocol_audit, nodes, edges (rascunho) NÃO foram tocados —
--     continuam só para usuários autenticados do tenant.
--   - As policies do tenant_isolation autenticado (em 0002) seguem intactas;
--     RLS soma policies via OR, então auth user vê seu tenant + público vê
--     publicados, sem conflito.
-- ----------------------------------------------------------------------------
