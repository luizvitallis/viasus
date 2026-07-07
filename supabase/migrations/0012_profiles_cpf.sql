-- ============================================================================
--  0012_profiles_cpf.sql — CPF como identidade de login
--
--  Decisão: login passa a ser por CPF + senha. O Supabase Auth continua usando
--  o email como identidade interna (mantido nos bastidores para reset de senha);
--  o CPF é a chave que o usuário digita. O server action de login busca o email
--  a partir do CPF (via service key) e então autentica.
--
--  cpf é nullable: usuários já existentes ficam sem CPF até o gestor preencher.
--  Enquanto o CPF não estiver preenchido, o usuário NÃO consegue logar (a tela
--  aceita só CPF) — fazer backfill dos usuários reais ANTES de subir o login
--  novo. Ex.:
--    update public.profiles set cpf = '12345678909'
--      where email = 'apscaucaiaplanejamento@gmail.com';
-- ============================================================================

alter table public.profiles
  add column if not exists cpf text;

-- Guarda só 11 dígitos, sem pontuação.
alter table public.profiles
  drop constraint if exists profiles_cpf_format;
alter table public.profiles
  add constraint profiles_cpf_format
  check (cpf is null or cpf ~ '^[0-9]{11}$');

-- CPF é nacionalmente único → índice único global (ignora nulos).
-- O login busca o email a partir do CPF sem saber o tenant, então a unicidade
-- precisa ser global, não por tenant.
create unique index if not exists profiles_cpf_key
  on public.profiles (cpf)
  where cpf is not null;
