/**
 * Garante que extension/referral.js (porte em JS puro) gera exatamente o
 * mesmo motivo e o mesmo risco que lib/referral.ts. Rode após mudar qualquer
 * um dos dois: `pnpm test:extension`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { computeRisk, generateJustification } from "../lib/referral";
import type { ReferralData, ReferralValues } from "../types/domain";

const sandbox: { ViaSusReferral?: Record<string, (...args: unknown[]) => unknown> } = {};
(sandbox as Record<string, unknown>).globalThis = sandbox;
runInNewContext(
  readFileSync(join(__dirname, "..", "extension", "referral.js"), "utf8"),
  sandbox,
);
const ext = sandbox.ViaSusReferral!;

const data: ReferralData = {
  especialidade_sisreg: "CONSULTA EM CARDIOLOGIA",
  introduction: "Encaminho paciente para avaliação em cardiologia por:",
  closing: "Solicito avaliação.",
  tree: [
    {
      id: "a",
      label: "HAS resistente",
      text_when_checked: "HAS resistente com PA {pa} mmHg em uso de 3 anti-hipertensivos",
      risk: "prioritario",
      fields: [{ id: "f1", key: "pa", label: "PA" }],
      children: [
        {
          id: "a1",
          label: "Com LOA",
          text_when_checked: "com lesão de órgão-alvo",
          risk: "urgencia",
        },
      ],
    },
    {
      id: "b",
      label: "Exames",
      text_when_checked: "Exames recentes:",
      fields: [
        { id: "f2", key: "cr", label: "Creatinina", unit: "mg/dL", type: "numero" },
        { id: "f3", key: "k", label: "Potássio", unit: "mEq/L" },
        { id: "f4", key: "dt", label: "Data", type: "data" },
      ],
    },
    {
      id: "c",
      label: "Dor torácica típica em repouso",
      text_when_checked: "Dor torácica típica em repouso.",
      risk: "emergencia",
    },
    { id: "d", label: "Sem texto", risk: "eletivo" },
  ],
};

const cases: { name: string; checked: string[]; values?: ReferralValues }[] = [
  { name: "nada marcado", checked: [] },
  { name: "item com marcador vazio", checked: ["a"] },
  {
    name: "marcador preenchido + filho",
    checked: ["a", "a1"],
    values: { "a::f1": "170/100" },
  },
  { name: "lista sem resultados", checked: ["b"] },
  {
    name: "lista com resultados e data",
    checked: ["b"],
    values: { "b::f2": "1,4", "b::f4": "2026-10-01" },
  },
  { name: "emergência + sem texto", checked: ["c", "d"] },
  { name: "tudo", checked: ["a", "a1", "b", "c", "d"], values: { "b::f3": "4,2" } },
];

let failures = 0;
for (const c of cases) {
  const set = new Set(c.checked);
  const expectedText = generateJustification(data, set, c.values ?? {});
  const gotText = ext.generateJustification(data, set, c.values ?? {});
  const expectedRisk = computeRisk(data.tree, set);
  const gotRisk = ext.computeRisk(data.tree, set);
  const ok = expectedText === gotText && expectedRisk === gotRisk;
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${c.name}`);
  if (!ok) {
    console.log("   site:     ", JSON.stringify(expectedText), expectedRisk);
    console.log("   extensão: ", JSON.stringify(gotText), gotRisk);
  }
}

if (failures) {
  console.error(`\n${failures} caso(s) divergente(s).`);
  process.exit(1);
}
console.log("\nExtensão e site geram o mesmo motivo e o mesmo risco.");
