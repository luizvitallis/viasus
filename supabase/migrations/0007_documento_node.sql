-- ============================================================================
--  0007_documento_node.sql — tipo de nó 'documento' para Fluxos Administrativos
--  Aplicar APÓS 0001..0006.
--
--  Modelo:
--    Nós de tipo 'documento' representam um item exigido no fluxo administrativo
--    (exame, impresso, formulário, preparo). Cada um tem:
--      - categoria  (texto livre, mas as opções convencionais ficam na UI)
--      - ação       (apenas_anexar | anexar_e_levar | apenas_levar)
--      - link       (URL/path opcional pra baixar modelo)
--
--  ALTER TYPE ADD VALUE não pode rodar dentro do mesmo bloco em que o valor
--  é usado, mas como esta migration apenas DECLARA o valor e adiciona colunas,
--  está OK. As colunas em si só serão preenchidas em INSERTs futuros.
-- ============================================================================

-- 1. Adicionar valor ao enum node_type
alter type node_type add value if not exists 'documento';

-- 2. Adicionar colunas específicas do tipo documento
alter table public.nodes
  add column if not exists documento_categoria text,
  add column if not exists documento_acao text,
  add column if not exists documento_link text;

comment on column public.nodes.documento_categoria is
  'Para nós tipo=documento. Texto livre: exame, impresso, formulario, preparo, outro.';
comment on column public.nodes.documento_acao is
  'Para nós tipo=documento. Valores: apenas_anexar | anexar_e_levar | apenas_levar.';
comment on column public.nodes.documento_link is
  'URL opcional para download do modelo do documento.';
