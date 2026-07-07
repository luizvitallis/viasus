-- ============================================================================
--  0013_profiles_active.sql — inativar usuário sem excluir
--
--  active=false bloqueia o login (o lookup CPF→email ignora inativos) e o guard
--  do /admin derruba a sessão no próximo request. Reversível: reativar volta
--  active=true. Excluir de vez é outra ação (apaga o auth user; protocolos que
--  ele criou permanecem, com autor/curador em branco via ON DELETE SET NULL).
-- ============================================================================

alter table public.profiles
  add column if not exists active boolean not null default true;
