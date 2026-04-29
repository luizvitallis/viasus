-- ============================================================================
--  0003_search_indexes.sql — full-text search PT-BR em protocols e nodes
--  Aplicar APÓS 0001_init.sql.
--
--  Antecipa parte da Fase 7. Criar agora é barato e evita migration depois
--  com tabelas já populadas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Coluna search_vector em PROTOCOLS
-- ----------------------------------------------------------------------------
alter table public.protocols
  add column search_vector tsvector;

create index idx_protocols_search on public.protocols using gin (search_vector);

create or replace function public.protocols_search_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(new.title, '')),     'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.specialty, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.summary, '')),   'C');
  return new;
end;
$$;

create trigger trg_protocols_search
  before insert or update of title, specialty, summary
  on public.protocols
  for each row execute function public.protocols_search_update();

-- ----------------------------------------------------------------------------
-- 2. Coluna search_vector em NODES
-- ----------------------------------------------------------------------------
alter table public.nodes
  add column search_vector tsvector;

create index idx_nodes_search on public.nodes using gin (search_vector);

-- Extrai texto plano do JSONB do TipTap percorrendo o array `content` recursivamente.
-- Usamos jsonb_path_query para pegar todos os nós `text` da árvore TipTap.
create or replace function public.nodes_search_update()
returns trigger
language plpgsql
as $$
declare
  body_text text;
begin
  -- jsonb_path_query retorna jsonb; #>> '{}' extrai escalar como texto sem aspas.
  body_text := coalesce(
    (
      select string_agg(value #>> '{}', ' ')
      from jsonb_path_query(new.content, '$.**.text') as value
    ),
    ''
  );

  new.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(new.label, '')), 'A') ||
    setweight(to_tsvector('portuguese', body_text),               'B');
  return new;
end;
$$;

create trigger trg_nodes_search
  before insert or update of label, content
  on public.nodes
  for each row execute function public.nodes_search_update();
