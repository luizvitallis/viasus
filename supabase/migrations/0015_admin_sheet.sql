-- ============================================================================
--  0015_admin_sheet.sql — formato "ficha" para Fluxos Administrativos (type='pop')
--  Aplicar APÓS 0001..0014.
--
--  Modelo:
--    Protocolos type='pop' deixam de ser fluxograma (nodes/edges) e passam a
--    ser uma ficha: quem pode encaminhar + blocos com itens numerados (o que
--    levar/anexar) ou etapas numeradas do atendimento. Os nodes/edges antigos
--    ficam no banco como estão (histórico/rollback), mas não são mais lidos.
--
--  Estrutura esperada do JSON (ver AdminSheet em types/domain.ts):
--    {
--      "layout": "requisitos" | "etapas",
--      "kicker": "Consulta especializada",
--      "subtitle": "O que levar para ser encaminhado…",
--      "tag": "Regulação · SISREG",
--      "who": "Médico",
--      "sections": [
--        { "id": "uuid", "title": "Documentos do paciente",
--          "items": [ { "id": "uuid", "label": "RG", "note": "", "action": "levar",
--                       "code": null, "responsible": null, "branches": [] } ] }
--      ],
--      "note": "Orientação…", "alert": "Quando não encaminhar…",
--      "reference": "Protocolo de regulação SMS, 2026"
--    }
--
--  Só adiciona coluna: RLS e policies de protocols continuam valendo.
-- ============================================================================

alter table public.protocols
  add column if not exists admin_data jsonb;

comment on column public.protocols.admin_data is
  'Ficha dos Fluxos Administrativos (type=pop): blocos com itens numerados ou etapas. NULL para os outros types.';
