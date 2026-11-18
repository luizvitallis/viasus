/**
 * Casos reais da conversão dos Fluxos Administrativos para ficha.
 * Rode após mudar lib/admin-sheet-convert.ts: `pnpm test:admin-sheet`.
 */
import { classifyGraph, smartCase, splitItemLabel } from "../lib/admin-sheet-convert";

const splits: [string, string[]][] = [
  ["RG, CPF, CNS e COMPROVANTE DE ENDEREÇO", ["RG", "CPF", "CNS", "COMPROVANTE DE ENDEREÇO"]],
  ["Ficha de referencia e Comprovante de agendamento", ["Ficha de referencia", "Comprovante de agendamento"]],
  ["Ficha de Referência, e Comprovante de Endereço", ["Ficha de Referência", "Comprovante de Endereço"]],
  ["Hemograma Completo, Função Hepática e", ["Hemograma Completo", "Função Hepática"]],
  ["Termo de consentimento livre e esclarecido", ["Termo de consentimento livre e esclarecido"]],
  ["TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO", ["TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO"]],
  ["Hemograma Completo, Sorologia (em caso de HIV ou Hepatite), Coagulograma", ["Hemograma Completo", "Sorologia (em caso de HIV ou Hepatite)", "Coagulograma"]],
  [
    "Diabetes - Hemoglobina Glicada e Creatinina Sérica, Hipotireoidismo - T4 Livre e T4 Total, Nódulo Tireoidiano e Bócio - TSH e US e Hiperprolactinemia - Resultado do exame de Prolactina",
    [
      "Diabetes - Hemoglobina Glicada e Creatinina Sérica",
      "Hipotireoidismo - T4 Livre e T4 Total",
      "Nódulo Tireoidiano e Bócio - TSH e US",
      "Hiperprolactinemia - Resultado do exame de Prolactina",
    ],
  ],
  ["BHCG de 24h e Resultado de Citopatológico realizado nos últimos 03 meses.", ["BHCG de 24h", "Resultado de Citopatológico realizado nos últimos 03 meses"]],
];

const cases: [string, string][] = [
  ["COMPROVANTE DE ENDEREÇO", "Comprovante de endereço"],
  ["US MAMÁRIA", "US mamária"],
  ["GLICEMIA DE JEJUM OU HbA1c", "Glicemia de jejum ou HbA1c"],
  ["PROFILAXIA PRÉ-EXPOSIÇÃO (PREP", "Profilaxia pré-exposição (PrEP"],
  ["Ficha de Referência", "Ficha de Referência"],
];

let failures = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    esperado ${JSON.stringify(want)}\n    veio     ${JSON.stringify(got)}`}`);
};

for (const [input, want] of splits) check(`separa "${input.slice(0, 50)}"`, splitItemLabel(input), want);
for (const [input, want] of cases) check(`caixa "${input}"`, smartCase(input), want);

const n = (id: string, type: string, label: string, y: number) => ({ id, type, label, position_x: 0, position_y: y });
check(
  "lista com nó 'Novo nó' solto continua lista",
  classifyGraph(
    [n("h", "ponto_atencao", "Documentos", 0), n("d", "documento", "RG", 1), n("x", "documento", "Novo nó", 2)],
    [{ source_node_id: "h", target_node_id: "d" }],
  ),
  "requisitos",
);
check(
  "fluxo com decisão vira etapas",
  classifyGraph(
    [n("a", "ponto_atencao", "Recepção", 0), n("b", "decisao", "Resultado?", 1), n("c", "ponto_atencao", "APS", 2)],
    [{ source_node_id: "a", target_node_id: "b" }, { source_node_id: "b", target_node_id: "c" }],
  ),
  "etapas",
);

if (failures) {
  console.error(`\n${failures} caso(s) falharam.`);
  process.exit(1);
}
console.log("\nConversão da ficha: todos os casos passaram.");
