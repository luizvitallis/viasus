-- ============================================================================
--  0006_referral_protocols.sql — coluna JSONB para Protocolo de Encaminhamento
--  Aplicar APÓS 0001..0005.
--
--  Modelo:
--    Protocolos com type='encaminhamento' não usam o grafo (nodes/edges).
--    Em vez disso, usam uma árvore hierárquica de condições/achados em JSONB
--    + um template de texto que vira a justificativa pra prontuário.
--
--  Estrutura esperada do JSON:
--    {
--      "introduction": "Encaminho paciente para...",
--      "closing": "Solicito vaga em ambulatório especializado.",
--      "tree": [
--        {
--          "id": "uuid",
--          "label": "Hipertensão arterial refratária",
--          "text_when_checked": "hipertensão arterial refratária, caracterizada por",
--          "category": "condicao",
--          "children": [
--            {
--              "id": "uuid",
--              "label": "PA ≥ 140/90 mmHg apesar de 3 anti-hipertensivos",
--              "text_when_checked": "PA ≥ 140/90 mmHg em uso de 3 anti-hipertensivos",
--              "category": "sinal",
--              "children": []
--            }
--          ]
--        }
--      ]
--    }
-- ============================================================================

alter table public.protocols
  add column if not exists referral_data jsonb;

comment on column public.protocols.referral_data is
  'Estrutura JSONB do checklist + gerador de texto para protocolos de encaminhamento. NULL para os outros types.';
