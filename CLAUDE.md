# CLAUDE.md — Plataforma de Protocolos Clínicos Interativos (ViaSus)

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão. Ele contém o contexto persistente do projeto: visão, stack, convenções, schema e plano de fases. Atualize sempre que decisões arquiteturais mudarem.

> **Importante (Next.js 16):** Este projeto usa Next.js 16 com React 19. APIs como `cookies()`, `headers()`, `params` e `searchParams` são **assíncronas** (`await`). Veja `AGENTS.md` para o aviso oficial. Não confie em padrões de Next 13/14 sem verificar.

---

## 1. O que estamos construindo

Sistema **multi-tenant para municípios brasileiros** que substitui PDFs de protocolos clínicos por **fluxogramas interativos navegáveis**. O profissional na ponta entra pelo ponto de atenção em que está, segue o ramo relevante e clica em cada nó para receber a orientação clínica daquele passo.

Cobre cinco tipos de documentos sob o mesmo modelo base de grafo:

- **Linhas de Cuidado** (MS / SES / SMS)
- **PCDTs** (CONITEC)
- **Protocolos de Encaminhamento Regulado** (estilo RegulaSUS-RS)
- **POPs** (Procedimentos Operacionais Padrão)
- **Diretrizes municipais**

PRD completo em `docs/PRD.md`. Quando este `CLAUDE.md` divergir do PRD, este arquivo prevalece (PRD pode estar desatualizado).

### Princípios não-negociáveis

1. **Fluxograma é a interface primária; PDF é anexo.**
2. **Conteúdo é dado, não código.** Protocolos vivem como JSONB no Postgres.
3. **Toda ação tem rastro.** Audit log em todas operações de escrita.
4. **Mobile-first no visualizador. Desktop-first no editor.**
5. **Multi-tenancy desde o dia 1.** Nunca commit sem RLS apropriado.
6. **LGPD: nada de dado de paciente.** Apenas usuário e protocolo.
7. **Leitura é pública por tenant; edição exige login.** Visualizador `/[tenant]/...` é aberto e indexável (ajuda profissional na ponta a achar via Google). `/admin/...` exige autenticação. Sem auto-cadastro: gestor convida editor por email.

---

## 2. Stack técnico (definitivo)

| Camada | Tecnologia | Versão alvo | Notas |
|---|---|---|---|
| Frontend | Next.js | **16+ App Router** | Server Components por padrão; Turbopack default |
| Linguagem | TypeScript | 5+ | strict mode |
| Estilo | Tailwind CSS v4 + Shadcn/UI | Latest | Sem CSS custom solto |
| Backend / DB / Auth / Storage | **Supabase** | Latest | Postgres + RLS + Storage + Auth |
| Cliente Supabase | `@supabase/ssr` | Latest | **Não usar `auth-helpers-nextjs` (deprecated)** |
| Editor de grafo | `@xyflow/react` | Latest | (Antigo "reactflow") |
| Editor de texto rico | TipTap | Latest | Output JSON salvo como JSONB |
| Estado servidor | TanStack Query | v5 | Para cache + revalidação |
| Ícones | `lucide-react` | Latest | Único conjunto de ícones |
| Validação | Zod | Latest | Schema para forms e API |
| Deploy | **Vercel** | — | Preview por PR + production na `main` |
| Versionamento | **GitHub** | — | Conventional commits |
| Pacotes | **pnpm** | 10+ | |

### Decisões fechadas (não revisitar sem motivo forte)

- App Router do Next.js (não Pages Router).
- Server Components como padrão; `'use client'` só onde precisa interatividade ou hooks de browser.
- Supabase Storage para PDFs e imagens (não MinIO; troca de plano em relação ao PRD original).
- TipTap (não Lexical, não Slate). Output JSON.
- Tema visual: paleta verde-floresta (`emerald-800/900` como ação primária), neutros pedra/off-white. **Sem roxo, sem aurora gradient, sem glassmorphism, sem dark+neon.** Tipografia institucional (IBM Plex Serif + Plex Sans + Plex Mono).
- Supabase remoto (project ref: `xmptfpbfszasvtifergg`). Não usamos Supabase local.

---

## 3. Estrutura de pastas

```
/
├── app/
│   ├── page.tsx                 # / — landing institucional pública
│   ├── layout.tsx               # root (Plex fonts)
│   ├── api/
│   │   └── health/route.ts      # smoke endpoint
│   ├── auth/
│   │   └── callback/route.ts    # callback de magic link de reset
│   ├── login/                   # /login (senha) + /login/recuperar (reset)
│   │   ├── page.tsx
│   │   ├── actions.ts
│   │   └── recuperar/page.tsx
│   ├── [tenant]/                # /[tenant] — leitura pública (caucaia-ce, demo…)
│   │   ├── page.tsx             # lista de protocolos publicados
│   │   └── protocolos/
│   │       └── [slug]/page.tsx  # visualizador read-only (Fase 4)
│   └── admin/                   # /admin/* — área autenticada (gestor/curador/etc)
│       ├── layout.tsx           # auth guard + header
│       ├── page.tsx             # redirect → /admin/dashboard
│       ├── dashboard/page.tsx
│       ├── protocolos/          # lista + editor (Fase 3)
│       └── usuarios/
│           ├── page.tsx
│           └── actions.ts       # invite editor
├── proxy.ts                     # auth guard via @supabase/ssr (raiz, Next 16: era middleware.ts)
├── components/
│   ├── ui/                      # shadcn (não editar manualmente; usar CLI)
│   ├── editor/                  # nodes, edges, toolbar, panel
│   ├── viewer/                  # visualizador read-only
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # browser
│   │   ├── server.ts            # server components & route handlers
│   │   └── middleware.ts        # session refresh
│   ├── utils.ts
│   └── audit.ts                 # helper para gravar protocol_audit
├── types/
│   ├── supabase.ts              # GERADO via supabase gen types
│   └── domain.ts                # tipos de domínio (Node, Edge, etc.)
├── supabase/
│   ├── migrations/              # SQL versionado
│   ├── seed.sql                 # dados de desenvolvimento
│   └── config.toml
├── docs/
│   ├── PRD.md
│   └── decisions/               # ADRs (Architecture Decision Records)
├── public/
├── CLAUDE.md                    # este arquivo
├── AGENTS.md                    # heads-up Next.js 16 para agentes
├── README.md
├── .env.local.example
├── package.json
└── tsconfig.json
```

---

## 4. Schema do banco (Postgres + RLS)

### 4.1. Convenções

- **Todas as tabelas de domínio têm `tenant_id`.** Sem exceção.
- **Todas têm RLS habilitada.** Nunca `disable row level security`.
- **PKs são `uuid` com `default uuid_generate_v4()`**.
- **Timestamps em `timestamptz`** com `default now()`.
- **Enums tipados em Postgres** (não strings soltas).
- **Snake_case** para nomes de tabelas e colunas.

### 4.2. Tabelas principais

```sql
-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============= TENANTS =============
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subdomain text unique not null,
  created_at timestamptz default now()
);

-- ============= PROFILES (estende auth.users) =============
create type user_role as enum (
  'admin', 'gestor', 'curador', 'publicador', 'profissional'
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  tenant_id uuid not null references tenants(id) on delete restrict,
  email text not null,
  name text,
  role user_role not null default 'profissional',
  created_at timestamptz default now()
);

create index idx_profiles_tenant on profiles(tenant_id);

-- ============= PROTOCOLS =============
create type protocol_type as enum (
  'linha_cuidado', 'pcdt', 'encaminhamento', 'pop', 'diretriz'
);
create type protocol_status as enum ('draft', 'published', 'archived');

create table protocols (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type protocol_type not null,
  title text not null,
  slug text not null,
  specialty text,
  summary text,
  source_protocol_id uuid references protocols(id),
  active_version_id uuid,                  -- FK adicionada depois
  status protocol_status not null default 'draft',
  tags jsonb not null default '[]'::jsonb,
  owner_curator_id uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, slug)
);

create index idx_protocols_tenant on protocols(tenant_id);
create index idx_protocols_status on protocols(tenant_id, status);

-- ============= PROTOCOL_VERSIONS (snapshots imutáveis) =============
create table protocol_versions (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references protocols(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  version_number int not null,
  graph jsonb not null,                    -- snapshot completo (nodes + edges)
  change_note text,
  published_at timestamptz default now(),
  published_by uuid references profiles(id),
  is_current boolean default false,
  unique (protocol_id, version_number)
);

alter table protocols
  add constraint fk_active_version
  foreign key (active_version_id) references protocol_versions(id);

-- ============= NODES (rascunho mutável) =============
create type node_type as enum (
  'ponto_atencao', 'decisao', 'conduta_intermediaria',
  'conduta_terminal', 'encaminhamento', 'calculadora'
);

create table nodes (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references protocols(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  type node_type not null,
  label text not null,
  position_x float not null default 0,
  position_y float not null default 0,
  content jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  links_to_protocol_id uuid references protocols(id),
  encaminhamento_target_id uuid references protocols(id),
  calculator_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_nodes_protocol on nodes(protocol_id);

-- ============= EDGES (rascunho mutável) =============
create type edge_style as enum ('normal', 'urgente', 'condicional');

create table edges (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references protocols(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  source_node_id uuid not null references nodes(id) on delete cascade,
  target_node_id uuid not null references nodes(id) on delete cascade,
  label text,
  condition_expr jsonb,
  style edge_style not null default 'normal'
);

create index idx_edges_protocol on edges(protocol_id);

-- ============= ATTACHMENTS =============
create table attachments (
  id uuid primary key default uuid_generate_v4(),
  protocol_id uuid not null references protocols(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  source_url text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);

-- ============= AUDIT LOG =============
create type audit_action as enum (
  'create', 'update', 'delete_node', 'publish', 'archive', 'fork', 'view'
);

create table protocol_audit (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  protocol_id uuid references protocols(id) on delete set null,
  user_id uuid references profiles(id),
  action audit_action not null,
  payload jsonb,
  occurred_at timestamptz default now()
);

create index idx_audit_protocol on protocol_audit(protocol_id, occurred_at desc);

-- ============= USAGE ANALYTICS =============
create type usage_action as enum (
  'open_protocol', 'click_node', 'search', 'complete_flow'
);

create table protocol_usage (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  protocol_id uuid not null references protocols(id) on delete cascade,
  version_id uuid references protocol_versions(id),
  user_id uuid references profiles(id),
  node_id uuid references nodes(id),
  action usage_action not null,
  duration_ms int,
  occurred_at timestamptz default now()
);

create index idx_usage_protocol_date on protocol_usage(protocol_id, occurred_at desc);
```

### 4.3. RLS — padrão obrigatório

```sql
-- Helpers no schema public (não auth) — auth é gerenciado pelo Supabase.
-- search_path travado para evitar function hijacking.
create or replace function public.user_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table tenants            enable row level security;
alter table profiles           enable row level security;
alter table protocols          enable row level security;
alter table protocol_versions  enable row level security;
alter table nodes              enable row level security;
alter table edges              enable row level security;
alter table attachments        enable row level security;
alter table protocol_audit     enable row level security;
alter table protocol_usage     enable row level security;

create policy "tenant_isolation_select"
  on protocols for select
  using (tenant_id = public.user_tenant_id());

create policy "tenant_isolation_insert"
  on protocols for insert
  with check (tenant_id = public.user_tenant_id());

create policy "curator_can_edit_drafts"
  on protocols for update
  using (
    tenant_id = public.user_tenant_id()
    and (status = 'draft' or public.user_role() in ('admin','gestor','publicador'))
  );
```

> **Regra absoluta:** toda tabela nova precisa de `tenant_id` + RLS habilitada + ao menos uma policy SELECT, INSERT e UPDATE. Sem exceção.

> **Leitura pública (Fase 2+):** `protocols`/`protocol_versions`/`attachments` aceitam SELECT do role `anon` quando `status='published'`. `protocol_usage` aceita INSERT do `anon` para registrar cliques no visualizador. Drafts e tabelas administrativas continuam só auth. Ver `0004_public_read_policies.sql`.

### 4.4. Triggers de auditoria e timestamp

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_protocols_updated
  before update on protocols
  for each row execute function set_updated_at();
```

---

## 5. Fluxo de autenticação (Supabase + Next.js 16 App Router)

Usar **`@supabase/ssr`**. Três clientes:

- `lib/supabase/server.ts` — Server Components, route handlers, server actions. **`cookies()` é async** em Next 16.
- `lib/supabase/client.ts` — Client Components.
- `lib/supabase/middleware.ts` — refresh de sessão no middleware do Next.

Padrão de proteção em `(app)/layout.tsx`:

```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
```

Onboarding: após signup, criar `profile` com role `profissional` e ligar a um `tenant_id` (via convite/código de organização — definir UX no momento da implementação).

---

## 6. Plano de execução por fases

> Cada fase tem objetivo, tarefas e **critérios de aceitação verificáveis**. Antes de iniciar uma fase, confirme com o usuário ("Posso começar a Fase X?"). Ao concluir, demonstre os critérios de aceitação ANTES de seguir para a próxima.

### FASE 0 — Foundation (objetivo: ambiente rodando vazio) — **EM EXECUÇÃO**

**Tarefas:**
1. ✅ `pnpm create next-app@latest` com TypeScript, Tailwind, App Router, ESLint.
2. Instalar e configurar Shadcn/UI (`pnpm dlx shadcn@latest init`).
3. Instalar dependências: `@supabase/ssr`, `@supabase/supabase-js`, `@xyflow/react`, `@tiptap/react`, `@tiptap/starter-kit`, `@tanstack/react-query`, `lucide-react`, `zod`.
4. Conectar ao projeto Supabase remoto (`xmptfpbfszasvtifergg`).
5. Criar `.env.local.example` documentando as 3 variáveis.
6. Configurar `lib/supabase/{server,client,middleware}.ts` no padrão `@supabase/ssr` (com `cookies()` async).
7. Criar `proxy.ts` na raiz para refresh de sessão (Next 16 renomeou middleware → proxy).
8. Inicializar git, criar repositório no GitHub via `gh` CLI (privado), primeiro commit.
9. Criar projeto na Vercel ligado ao GitHub. Configurar env vars. Garantir build verde.

**Critério de aceitação:**
- [ ] `pnpm dev` sobe Next em `localhost:3000` mostrando landing institucional ViaSus.
- [ ] Conexão com Supabase remoto funcional (smoke test).
- [ ] Push na `main` dispara deploy na Vercel e fica verde.
- [ ] README explica como rodar local em ≤ 5 passos.

---

### FASE 1 — Schema + RLS + Seed (objetivo: banco íntegro)

**Tarefas:**
1. Criar migration `0001_init.sql` com todo o schema da seção 4.
2. Criar migration `0002_rls_policies.sql` com helpers e policies.
3. Aplicar via `npx supabase db push`.
4. Gerar tipos: `npx supabase gen types typescript --project-id xmptfpbfszasvtifergg > types/supabase.ts`.
5. Criar `supabase/seed.sql` com 2 tenants e 1 protocolo seed.
6. Teste manual de isolamento entre tenants.

**Critério de aceitação:**
- [ ] Migrations aplicadas sem erro.
- [ ] Script de teste de isolamento mostra 0 vazamentos entre tenants.
- [ ] Tipos TypeScript gerados.
- [ ] `select * from protocols` retorna o protocolo seed quando autenticado como user de Caucaia.

---

### FASE 2 — Auth + Onboarding (objetivo: login admin + leitura pública)

**Modelo:** sem auto-cadastro. Gestor convida editor por email no painel; senha é o método primário, magic link só pra reset. Leitura é pública por tenant (path prefix `/[tenant]`).

**Tarefas:**
1. Migration `0004_public_read_policies.sql`: anon SELECT em published, anon INSERT em `protocol_usage`.
2. Inicializar Shadcn/UI com tokens ViaSus (tema verde-floresta + Plex).
3. Página `/login` (senha) + `/recuperar` (magic link de reset) com Shadcn Form + Zod.
4. Server actions: `signInWithPassword`, `requestPasswordReset`, `signOut`.
5. Reorganizar `app/` em `(public)`, `(auth)`, `(admin)`. Mover landing institucional pra root pública.
6. `(admin)/layout.tsx` redireciona anônimo pra `/login`. Header com nome do usuário + tenant + logout.
7. `(admin)/dashboard/page.tsx` — 3 protocolos mais recentes do tenant.
8. `(admin)/usuarios/page.tsx` — gestor cria editor: server action chama `supabase.auth.admin.createUser` + insert em `profiles`. Senha temporária enviada por email (ou exibida na tela com warning de copiar uma vez).
9. `(public)/[tenant]/page.tsx` — lista de protocolos publicados do tenant (resolução por subdomain, 404 se não existir).
10. `lib/audit.ts` — esqueleto pra inserir em `protocol_audit`. Audit de eventos de auth (login, invite) fica deferido para a Fase 5, junto com a migration que estende o enum `audit_action` com `user_login`/`user_invited`/etc.

**Critério de aceitação:**
- [ ] Migration 0004 aplicada; `pnpm test:rls` continua passando + novo teste de leitura anônima passa.
- [ ] `/login` aceita senha; `/recuperar` envia email de reset.
- [ ] `/admin/dashboard` redireciona para `/login` quando anônimo.
- [ ] Gestor cria editor em `/admin/usuarios` e o profile aparece em `profiles`.
- [ ] `/caucaia-ce` (público) lista o protocolo DM2 quando ele estiver `published`.

---

### FASE 3 — Editor de fluxograma

Custom nodes (`@xyflow/react`) para os 5 tipos, painel TipTap, auto-save, undo/redo.

### FASE 4 — Visualizador

Mobile-first, bottom sheet para conteúdo do nó, registro em `protocol_usage`.

### FASE 5 — Versionamento e publicação

Snapshot JSONB em `protocol_versions`, lista de versões, audit `publish`.

### FASE 6 — Anexos

Bucket `protocol-attachments` no Supabase Storage com policies por tenant, upload via TipTap.

### FASE 7 — Busca

`tsvector` em `protocols` e `nodes`, modal `Cmd+K`.

### FASES 8+ (V1)

Calculadoras clínicas, fork de protocolos, diff visual, métricas, integração com Encaminhamento Regulado, modo offline.

---

## 7. Convenções de código

### 7.1. TypeScript

- `strict: true`. Sem `any`. Sem `as` exceto justificado.
- Tipos do banco: `types/supabase.ts` (gerado).
- Tipos de domínio derivados: `type Protocol = Database['public']['Tables']['protocols']['Row']`.

### 7.2. Componentes

- Server Components por padrão. `'use client'` só onde precisa.
- Shadcn em `components/ui/` — sempre via CLI, nunca editar manualmente.
- `PascalCase.tsx`, um componente por arquivo.
- Props tipadas com interface `XyzProps`.

### 7.3. Acesso a dados

- Server Components: `await createServerClient()` direto.
- Client Components: TanStack Query + `createBrowserClient()`.
- `service_role` nunca no cliente. Apenas em server actions/route handlers onde estritamente necessário.

### 7.4. Server Actions e mutações

- Toda mutação de protocolo chama `logAudit()` de `lib/audit.ts`.
- Validar input com Zod antes do banco.
- Erros: `{ error: string }` ou exception com mensagem amigável.

### 7.5. Git e commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- `main` é deployável. Features em `feat/nome-curto`.
- Cada PR tem deploy preview na Vercel.
- Nunca commit de `.env.local`.

### 7.6. Estilos

- Tailwind v4 com tokens em `app/globals.css` (`@theme`).
- Cor primária: `emerald-800` (ações), `emerald-900` (hover/active).
- Neutros: `stone-*` para backgrounds e textos.
- Tipografia: IBM Plex Serif (display), IBM Plex Sans (body), IBM Plex Mono (códigos/IDs).
- Bordas: `border-2` sólida em containers principais; sem arredondamento exagerado.
- **Proibido sem justificativa explícita:** roxo, gradiente aurora/mesh, dark+neon, glassmorphism padrão.

---

## 8. Como você (Claude Code) deve trabalhar

1. **Leia este arquivo no início de cada sessão.** Inconsistência com pedido do usuário? Aponte antes de executar.
2. **Trabalhe em fases.** Confirme antes de iniciar cada fase. Não pule sem aprovação explícita.
3. **Antes de mudança em schema:** crie migration nova (`0NNN_descricao.sql`). Nunca edite migration aplicada.
4. **Antes de qualquer query:** confirme que a tabela tem RLS apropriada.
5. **Pequenos commits frequentes.** Cada tarefa = um commit. Mensagem descritiva.
6. **Demonstre antes de avançar.** Mostre AC cumprido (logs, screenshots, instruções para o Luiz verificar).
7. **Quando em dúvida, pergunte.** Especialmente UX, decisões cross-fase, escopo ambíguo.
8. **Não introduza dependências novas sem aprovação.**
9. **Respeite o princípio de design.** UI com cara de "default AI"? Pare e revise.
10. **LGPD acima de conveniência.** Nunca dado de paciente, nem para teste. Use sintéticos.

### Comandos úteis

```bash
# Supabase (remoto)
npx supabase login
npx supabase link --project-ref xmptfpbfszasvtifergg
npx supabase db push
npx supabase gen types typescript --project-id xmptfpbfszasvtifergg > types/supabase.ts

# Desenvolvimento
pnpm dev            # localhost:3000
pnpm build          # build de produção
pnpm lint
```

---

## 9. Decisões em aberto

- [ ] Onboarding multi-tenant: convite por código? domínio de e-mail? auto-cadastro com aprovação?
- [ ] Slug do protocolo: gerado automaticamente ou definido pelo curador?
- [ ] Limite de tamanho de PDF anexo: 10MB, 25MB, 50MB?
- [ ] Soft-delete vs hard-delete para protocolos arquivados.
- [ ] Notificações: in-app no MVP ou só email?

---

**Última atualização:** V1 completo. Fases 0–10 em produção. Stack ativo: Next.js 16.2.4 / React 19.2.4 / Tailwind 4.2.4.

**Status das fases:**
- ✅ Fase 0 — Foundation
- ✅ Fase 1 — Schema + RLS + Seed (migrations 0001/0002/0003 aplicadas)
- ✅ Fase 2 — Auth + Onboarding (migration 0004 aplicada)
- ✅ Fase 3 — Editor de fluxograma (xyflow + TipTap + auto-save)
- ✅ Fase 4 — Visualizador público (mobile-first, bottom sheet, tracking)
- ✅ Fase 5 — Versões + Auditoria + Métricas
- ✅ Fase 6 — Anexos via Supabase Storage (migration 0005 aplicada)
- ✅ Fase 7 — Busca full-text PT-BR (Cmd+K)
- ✅ Fase 8 — 4 abas na home pública por tipo de documento
- ✅ Fase 9 — Protocolos de Encaminhamento (checklist hierárquico + gerador de texto; migration 0006 aplicada)
- ✅ Fase 10 — Fluxos Administrativos (nó tipo `documento`; migration 0007 aplicada)

**Tipos de documento suportados:**
- `linha_cuidado` → Linhas de Cuidado (fluxograma)
- `pcdt` → PCDTs (fluxograma)
- `encaminhamento` → Protocolos de Encaminhamento (checklist + gerador de texto pra prontuário)
- `pop` → Fluxos Administrativos (fluxograma com nó tipo Documento)
- `diretriz` → no enum, sem aba na home (surfaceável no futuro se necessário)

**Próximos passos sugeridos (V1.x):** rollout interno na SMS Caucaia, piloto com 2-3 profissionais reais, calculadoras clínicas embutidas, fork de protocolos entre tenants, diff visual entre versões, integração com Encaminhamento Regulado, modo offline (Service Worker), domínio próprio (ex.: `viasus.caucaia.ce.gov.br`).
