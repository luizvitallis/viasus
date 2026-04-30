-- ============================================================================
--  0005_storage_attachments.sql — bucket Supabase Storage para anexos
--  Aplicar APÓS 0001..0004.
--
--  Estratégia:
--    - Bucket `protocol-attachments` PÚBLICO (qualquer um com URL acessa).
--    - Não há policy SELECT — listagem do bucket é negada por padrão.
--    - Listagem do conteúdo é controlada pela tabela `attachments` (RLS).
--    - INSERT e DELETE restritos a curador+ do tenant correto.
--    - Path pattern: {tenant_id}/{protocol_id}/{uuid}.{ext}
--
--  Limites:
--    - Tamanho máximo por arquivo: 25 MB.
--    - Tipos aceitos: PDF, PNG, JPEG, WebP.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Criar bucket público com limites
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'protocol-attachments',
  'protocol-attachments',
  true,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. Policy de INSERT — apenas curador+ no próprio tenant
-- ----------------------------------------------------------------------------
create policy "attachments_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'protocol-attachments'
    and (storage.foldername(name))[1] = public.user_tenant_id()::text
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

-- ----------------------------------------------------------------------------
-- 3. Policy de DELETE — apenas curador+ no próprio tenant
-- ----------------------------------------------------------------------------
create policy "attachments_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'protocol-attachments'
    and (storage.foldername(name))[1] = public.user_tenant_id()::text
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

-- ----------------------------------------------------------------------------
-- 4. Policy de UPDATE — mesma regra (raramente usada — replace de arquivo)
-- ----------------------------------------------------------------------------
create policy "attachments_storage_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'protocol-attachments'
    and (storage.foldername(name))[1] = public.user_tenant_id()::text
    and public.user_role() in ('curador', 'gestor', 'publicador', 'admin')
  );

-- ----------------------------------------------------------------------------
-- Notas:
--   - Não há policy SELECT em storage.objects para o bucket: bucket público
--     responde via URL direta (CDN-like). Listagem do bucket via API exige
--     autenticação + outra policy que não criamos.
--   - O download URL é construído como:
--       https://xmptfpbfszasvtifergg.supabase.co/storage/v1/object/public/protocol-attachments/{path}
-- ----------------------------------------------------------------------------
