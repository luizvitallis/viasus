-- ============================================================================
--  0014_profissional_node.sql — novo tipo de nó "profissional"
--
--  Nó simples rotulado (igual a ponto_atencao/conduta), com cor e ícone
--  próprios, pra marcar um passo executado por um profissional. Sem campos
--  extras. Segue o mesmo padrão do 'documento' (0007): o valor é adicionado ao
--  enum e tratado como string no domínio até os tipos serem regenerados.
-- ============================================================================

alter type node_type add value if not exists 'profissional';
