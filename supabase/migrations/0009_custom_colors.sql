-- ============================================================================
--  0009_custom_colors.sql — cores customizáveis por nó e por aresta
--  Aplicar APÓS 0001..0008.
--
--  Modelo:
--    Cada nó pode ter color_bg e color_border que sobrescrevem as cores
--    padrão do tipo. NULL = usa o default do tipo (comportamento atual).
--    Cada aresta pode ter color_stroke que sobrescreve a cor padrão do
--    estilo (normal/urgente/condicional).
--
--  Formato: hex string ("#c41e3a") ou null.
-- ============================================================================

alter table public.nodes
  add column if not exists color_bg text,
  add column if not exists color_border text;

alter table public.edges
  add column if not exists color_stroke text;

comment on column public.nodes.color_bg is
  'Cor de fundo customizada (hex). NULL = usa o default do node_type.';
comment on column public.nodes.color_border is
  'Cor de borda customizada (hex). NULL = usa o default do node_type.';
comment on column public.edges.color_stroke is
  'Cor de linha+seta customizada (hex). NULL = usa o default do edge_style.';
