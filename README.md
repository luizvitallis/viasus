# ViaSus

> Plataforma multi-tenant que substitui PDFs de protocolos clínicos do SUS por **fluxogramas interativos navegáveis**. Desenvolvida pela Secretaria Municipal de Saúde de Caucaia / CE.

Cobre cinco tipos de documentos sob um mesmo modelo de grafo: **Linhas de Cuidado**, **PCDTs**, **Protocolos de Encaminhamento Regulado**, **POPs** e **Diretrizes municipais**.

A documentação completa do projeto (visão, schema, plano de fases, convenções) está em [`CLAUDE.md`](./CLAUDE.md).

---

## Rodar localmente em 5 passos

1. **Pré-requisitos**: [Node.js 20+](https://nodejs.org/) e [pnpm 10+](https://pnpm.io/installation).
2. **Instale as dependências**:
   ```bash
   pnpm install
   ```
3. **Configure o ambiente**: copie `.env.local.example` para `.env.local` e preencha as três variáveis com os valores do projeto Supabase (Dashboard → Settings → API).
4. **Suba o servidor de desenvolvimento**:
   ```bash
   pnpm dev
   ```
5. **Abra** `http://localhost:3000`.

---

## Stack

- **Next.js 16** (App Router, Server Components por padrão) + **React 19**
- **TypeScript 5** strict
- **Tailwind CSS v4** + Shadcn/UI (a ser adicionado na Fase 2)
- **Supabase** (Postgres + RLS + Auth + Storage)
- **@xyflow/react** (editor de fluxogramas)
- **TipTap** (editor de conteúdo rico, output JSON em JSONB)
- **TanStack Query v5** + **Zod**
- Tipografia institucional: **IBM Plex Serif / Sans / Mono**

## Comandos úteis

```bash
pnpm dev      # servidor de desenvolvimento em localhost:3000
pnpm build    # build de produção
pnpm start    # inicia o build de produção
pnpm lint     # ESLint
```

## Estrutura

```
app/                 # rotas (App Router)
lib/supabase/        # clients SSR, browser e middleware
middleware.ts        # refresh de sessão Supabase
CLAUDE.md            # contexto persistente do projeto (FONTE DA VERDADE)
AGENTS.md            # heads-up Next.js 16 para agentes
```

## Princípios

1. Fluxograma é a interface primária. PDF é anexo.
2. Conteúdo é dado, não código — protocolos vivem como JSONB.
3. Toda ação de escrita gera rastro auditável.
4. Mobile-first no visualizador. Desktop-first no editor.
5. Multi-tenancy desde o primeiro commit, isolamento via RLS.
6. **LGPD: nenhum dado de paciente.** Apenas usuário e protocolo.

---

**Status:** Fase 0 — Foundation
