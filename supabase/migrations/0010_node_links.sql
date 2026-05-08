-- ============================================================================
--  0010_node_links.sql — coluna estruturada de links de referência por nó
--  Aplicar APÓS 0001..0009.
--
--  Modelo:
--    Cada nó pode ter uma lista de links externos de referência. Em vez de
--    depender de inline links no TipTap (que dão problema com ProseMirror
--    interceptando cliques), o editor lista links como entradas estruturadas
--    com label + url. O viewer renderiza eles como <a> nativo, sempre
--    clicáveis.
--
--  Estrutura:
--    [{ "id": "uuid", "label": "Texto visível", "url": "https://..." }, ...]
-- ============================================================================

alter table public.nodes
  add column if not exists links jsonb not null default '[]'::jsonb;

comment on column public.nodes.links is
  'Array de links de referência: [{id, label, url}]. Renderizado como cards <a target=_blank> abaixo do conteúdo TipTap no viewer.';
