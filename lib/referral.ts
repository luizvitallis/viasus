/**
 * Helpers para a estrutura de dados de Protocolo de Encaminhamento
 * (árvore hierárquica de condições/achados + gerador de texto).
 */

import type { ReferralData, ReferralNode } from "@/types/domain";

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
    children: [],
  };
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
 * nó marcado (em ordem top-down + esquerda-direita), envolvido pelo
 * introduction e closing.
 */
export function generateJustification(
  data: ReferralData,
  checkedIds: Set<string>,
): string {
  const fragments: string[] = [];

  function walk(nodes: ReferralNode[]) {
    for (const n of nodes) {
      if (checkedIds.has(n.id) && n.text_when_checked?.trim()) {
        fragments.push(n.text_when_checked.trim());
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
