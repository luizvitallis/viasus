-- ============================================================================
--  0011_protocol_delete_audit.sql — ação de auditoria para exclusão de protocolo
--
--  Exclusão híbrida (decisão do gestor):
--    - rascunho nunca publicado (sem linha em protocol_versions) → apagado de vez
--    - protocolo que já teve versão publicada             → apenas arquivado
--
--  'archive' já existe no enum audit_action (cobre o caminho de arquivamento).
--  Falta a ação da exclusão permanente. protocol_audit.protocol_id é ON DELETE
--  SET NULL, então o rastro sobrevive à exclusão com o payload preservando
--  id/slug/título do que foi apagado.
-- ============================================================================

alter type audit_action add value if not exists 'delete_protocol';
