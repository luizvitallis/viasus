/**
 * Helpers para a estrutura de dados de Protocolo de Encaminhamento
 * (árvore hierárquica de condições/achados + gerador de texto).
 */

import type {
  ReferralData,
  ReferralField,
  ReferralNode,
  ReferralValues,
} from "@/types/domain";

export function emptyReferralData(): ReferralData {
  return {
    introduction:
      "Encaminho paciente para avaliação especializada por:",
    closing:
      "Solicito vaga em ambulatório especializado conforme regulação local.",
    tree: [],
  };
}

export function newReferralNode(): ReferralNode {
  return {
    id: crypto.randomUUID(),
    label: "Novo item",
    text_when_checked: "",
    category: null,
    fields: [],
    children: [],
  };
}

export function newReferralField(existing: ReferralField[] = []): ReferralField {
  return {
    id: crypto.randomUUID(),
    key: uniqueFieldKey("valor", existing),
    label: "Resultado",
    unit: "",
    type: "texto",
  };
}

/**
 * Normaliza um rótulo em chave de marcador: minúsculas, sem acento,
 * separado por underscore.
 */
export function slugifyFieldKey(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "valor";
}

/** Garante que a chave não colida com outra do mesmo item. */
export function uniqueFieldKey(
  desired: string,
  existing: ReferralField[],
  ignoreId?: string,
): string {
  const taken = new Set(
    existing.filter((f) => f.id !== ignoreId).map((f) => f.key),
  );
  const base = slugifyFieldKey(desired);
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

/** Chave do valor preenchido para um par (item, campo). */
export function valueKey(nodeId: string, fieldId: string): string {
  return `${nodeId}::${fieldId}`;
}

/** Marcador de valor não preenchido dentro da frase gerada. */
export const EMPTY_VALUE_PLACEHOLDER = "___";

function formatFieldValue(field: ReferralField, raw: string): string {
  const value = raw.trim();
  if (!value) return EMPTY_VALUE_PLACEHOLDER;
  if (field.type === "data") {
    // <input type="date"> devolve ISO (yyyy-mm-dd); prontuário usa dd/mm/aaaa.
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  return value;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex do marcador `{chave}` — tolera espaços e caixa alta. */
function tokenRegExp(key: string): RegExp {
  return new RegExp(`\\{\\s*${escapeRegExp(key)}\\s*\\}`, "gi");
}

/**
 * Renderiza a frase de um item com os valores preenchidos.
 *
 * - Campo com o marcador `{chave}` no meio da frase é substituído ali; sem
 *   valor, entra como `___` (não dá pra remover meia frase com segurança).
 * - Campo sem marcador é anexado ao fim como `Rótulo valor unidade` e, sem
 *   valor, é **omitido** — é o caso das listas de exames mínimos, onde uma
 *   fila de `___` polui o texto do prontuário.
 * - Frase terminada em `:` é tratada como cabeçalho de lista: os anexados
 *   entram sem parênteses, e se nenhum tiver valor a frase inteira sai.
 */
export function renderNodeText(
  node: ReferralNode,
  values: ReferralValues,
): string {
  const original = node.text_when_checked?.trim() ?? "";
  if (!original) return "";

  let text = original;
  const appended: string[] = [];
  let hasAppendableField = false;

  for (const field of node.fields ?? []) {
    const raw = (values[valueKey(node.id, field.id)] ?? "").trim();

    if (hasFieldToken(original, field.key)) {
      text = text.replace(
        tokenRegExp(field.key),
        raw ? formatFieldValue(field, raw) : EMPTY_VALUE_PLACEHOLDER,
      );
      continue;
    }

    hasAppendableField = true;
    if (!raw) continue;
    const unit = field.unit?.trim();
    // "8,1%" e "37,2°C" grudam; "4,2 mEq/L" separa.
    const sep = unit && /^[%°]/.test(unit) ? "" : " ";
    appended.push(
      `${field.label} ${formatFieldValue(field, raw)}${unit ? sep + unit : ""}`,
    );
  }

  const isList = original.endsWith(":");

  if (appended.length === 0) {
    // Cabeçalho de lista sem nenhum resultado preenchido vira frase pendurada.
    return isList && hasAppendableField ? "" : text;
  }

  return isList
    ? `${text} ${appended.join("; ")}`
    : `${text} (${appended.join("; ")})`;
}

/**
 * Valores de pré-visualização: todo campo preenchido com `___`, pra o editor
 * mostrar a frase completa mesmo sem ninguém ter digitado nada.
 */
export function placeholderValues(tree: ReferralNode[]): ReferralValues {
  const values: ReferralValues = {};
  function walk(nodes: ReferralNode[]) {
    for (const n of nodes) {
      for (const f of n.fields ?? []) {
        values[valueKey(n.id, f.id)] = EMPTY_VALUE_PLACEHOLDER;
      }
      if (n.children) walk(n.children);
    }
  }
  walk(tree);
  return values;
}

/** O texto já usa o marcador `{chave}`? */
export function hasFieldToken(text: string, key: string): boolean {
  return tokenRegExp(key).test(text ?? "");
}

/** Renomeia `{antiga}` para `{nova}` no texto, preservando o resto. */
export function renameFieldToken(
  text: string,
  oldKey: string,
  newKey: string,
): string {
  if (!text || oldKey === newKey) return text;
  return text.replace(tokenRegExp(oldKey), `{${newKey}}`);
}

/** Remove o marcador `{chave}` do texto (usado ao apagar um campo). */
export function stripFieldToken(text: string, key: string): string {
  if (!text) return text;
  return text
    .replace(tokenRegExp(key), "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Itens marcados que têm campo de preenchimento, na ordem da árvore. */
export function collectCheckedFieldNodes(
  data: ReferralData,
  checkedIds: Set<string>,
): ReferralNode[] {
  const result: ReferralNode[] = [];
  function walk(nodes: ReferralNode[]) {
    for (const n of nodes) {
      if (checkedIds.has(n.id) && (n.fields?.length ?? 0) > 0) result.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(data.tree);
  return result;
}

/** Quantos campos marcados seguem sem valor preenchido. */
export function countPendingValues(
  data: ReferralData,
  checkedIds: Set<string>,
  values: ReferralValues,
): number {
  return collectCheckedFieldNodes(data, checkedIds).reduce(
    (total, node) =>
      total +
      (node.fields ?? []).filter(
        (f) => !(values[valueKey(node.id, f.id)] ?? "").trim(),
      ).length,
    0,
  );
}

/**
 * Caminho de um nó na árvore como array de índices.
 * Ex.: [0, 2, 1] = filho 1 do filho 2 do nó raiz 0.
 */
export type TreePath = number[];

export function updateNodeAt(
  tree: ReferralNode[],
  path: TreePath,
  updater: (n: ReferralNode) => ReferralNode,
): ReferralNode[] {
  if (path.length === 0) return tree;
  const [idx, ...rest] = path;
  return tree.map((n, i) => {
    if (i !== idx) return n;
    if (rest.length === 0) return updater(n);
    return {
      ...n,
      children: updateNodeAt(n.children ?? [], rest, updater),
    };
  });
}

export function deleteNodeAt(
  tree: ReferralNode[],
  path: TreePath,
): ReferralNode[] {
  if (path.length === 0) return tree;
  const [idx, ...rest] = path;
  if (rest.length === 0) {
    return tree.filter((_, i) => i !== idx);
  }
  return tree.map((n, i) =>
    i === idx
      ? { ...n, children: deleteNodeAt(n.children ?? [], rest) }
      : n,
  );
}

export function addChildAt(
  tree: ReferralNode[],
  path: TreePath,
  child: ReferralNode,
): ReferralNode[] {
  if (path.length === 0) {
    return [...tree, child];
  }
  return updateNodeAt(tree, path, (n) => ({
    ...n,
    children: [...(n.children ?? []), child],
  }));
}

/**
 * Gera o texto da justificativa concatenando o `text_when_checked` de cada
 * nó marcado (em ordem top-down + esquerda-direita), com os valores dos
 * campos já interpolados, envolvido pelo introduction e closing.
 */
export function generateJustification(
  data: ReferralData,
  checkedIds: Set<string>,
  values: ReferralValues = {},
): string {
  const fragments: string[] = [];

  function walk(nodes: ReferralNode[]) {
    for (const n of nodes) {
      if (checkedIds.has(n.id)) {
        const text = renderNodeText(n, values);
        if (text) fragments.push(text);
      }
      if (n.children && n.children.length > 0) walk(n.children);
    }
  }
  walk(data.tree);

  const body =
    fragments.length > 0
      ? fragments.join("; ").replace(/\s*[.;]\s*$/, "") + "."
      : "";

  const parts = [
    (data.introduction ?? "").trim(),
    body,
    (data.closing ?? "").trim(),
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Lista todos os IDs da árvore (útil pra preview "tudo marcado" no editor).
 */
export function collectAllIds(tree: ReferralNode[]): string[] {
  const ids: string[] = [];
  function walk(nodes: ReferralNode[]) {
    for (const n of nodes) {
      ids.push(n.id);
      if (n.children) walk(n.children);
    }
  }
  walk(tree);
  return ids;
}

/**
 * Conta o total de nós na árvore.
 */
export function countNodes(tree: ReferralNode[]): number {
  let count = 0;
  function walk(nodes: ReferralNode[]) {
    for (const n of nodes) {
      count++;
      if (n.children) walk(n.children);
    }
  }
  walk(tree);
  return count;
}
