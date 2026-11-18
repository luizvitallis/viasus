/**
 * Conversão dos Fluxos Administrativos antigos (fluxograma nodes/edges) para a
 * ficha (`AdminSheet`). Funções puras — o banco fica com o script
 * `scripts/convert-admin-sheets.ts`.
 */
import type {
  AdminItem,
  AdminItemAction,
  AdminSection,
  AdminSheet,
} from "@/types/domain";

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  documento_acao?: string | null;
  position_x: number;
  position_y: number;
}

export interface GraphEdge {
  source_node_id: string;
  target_node_id: string;
  label?: string | null;
}

/** Algo que a revisão humana deve olhar antes de gravar. */
export interface ConvertNote {
  kind: "split" | "dropped" | "aviso";
  text: string;
}

export interface ConvertResult {
  sheet: AdminSheet;
  notes: ConvertNote[];
}

// Siglas mantidas em caixa alta ao passar textos TODO EM MAIÚSCULAS para
// caixa normal.
const ACRONYMS = new Set(
  (
    "RG CPF CNS SUS ECG MAPA TC RM USG RX PPD DIU HIV TB BERA PET APLV NCDI SAE TARV CID " +
    "SISREG UBS CAPS IST HPV PSA TSH EEG ENMG EDA CNES SAMU UPA CRM OPME AIH APAC BPA " +
    "US DNA SIGTAP CTG VDRL HCG AVC DPOC HAS DM SERTRANS ESF APS PNI CTA LGBT LGBTQIA+ OMS MS SES SMS"
  ).split(" "),
);
const SPECIAL: Record<string, string> = { PREP: "PrEP", "(PREP": "(PrEP", "(TARV": "(TARV", "(TARV)": "(TARV)" };

const ACTION_MAP: Record<string, AdminItemAction> = {
  apenas_levar: "levar",
  anexar_e_levar: "anexar_e_levar",
  apenas_anexar: "apenas_anexar",
};

const SECTION_TITLES: [RegExp, string][] = [
  [/^documentos?\s+d[oa]s?\s+pacientes?$/i, "Documentos do paciente"],
  [/^impressos\s+e\s+termos(\s+necess[aá]rios)?$/i, "Impressos e termos necessários"],
  [/^exames\s+e\s+laudos(\s+necess[aá]rios)?$/i, "Exames e laudos necessários"],
];

const byPosition = (a: GraphNode, b: GraphNode) =>
  a.position_y - b.position_y || a.position_x - b.position_x;

/** Texto todo em maiúsculas → caixa normal, preservando siglas. */
export function smartCase(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return text;
  if (!isMostlyUpper(text)) return text.charAt(0).toUpperCase() + text.slice(1);
  const words = text.split(" ").map((w, i) => {
    const bare = w.replace(/[^\p{L}\d+]/gu, "");
    if (SPECIAL[w]) return SPECIAL[w];
    if (/[a-zà-ÿ]/.test(w)) return w; // já tem minúscula (ex.: HbA1c)
    if (ACRONYMS.has(bare) || /^[A-Z]\d/.test(bare) || (bare.length > 1 && !/[AEIOUÁÉÍÓÚÂÊÔÃÕÀ]/.test(bare))) {
      return w;
    }
    const lower = w.toLocaleLowerCase("pt-BR");
    return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  });
  return words.join(" ");
}

/** Texto "em caixa alta": quase todas as letras maiúsculas. */
function isMostlyUpper(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
  return upper / letters.length > 0.8;
}

/** Divide uma string pelos separadores de topo (fora de parênteses). */
function splitTop(text: string, sep: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      const m = sep.exec(text.slice(i));
      if (m && m.index === 0) {
        out.push(text.slice(start, i));
        i += m[0].length - 1;
        start = i + 1;
      }
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * "RG, CPF, CNS e COMPROVANTE DE ENDEREÇO" → ["RG", "CPF", "CNS", "COMPROVANTE…"].
 * Divide nas vírgulas; o " e " só divide quando é o fim de uma lista
 * ("A, B e C") ou, em texto de caixa mista, quando o próximo termo começa
 * com maiúscula ("Ficha de referência e Comprovante de agendamento").
 * "Termo de consentimento livre e esclarecido" fica inteiro.
 */
export function splitItemLabel(raw: string): string[] {
  const text = raw.replace(/\s+/g, " ").trim().replace(/[\s,;]+$/, "");
  const commaParts = splitTop(text, /^\s*[,;]\s*/).map(tidyPiece).filter(Boolean);
  const isList = commaParts.length > 1;
  const mixedCase = !isMostlyUpper(text);
  // "Condição - exames": o " e " separa exames da mesma condição; só divide
  // onde começa outra condição ("… e Hiperprolactinemia - prolactina").
  if (text.includes(" - ")) return commaParts.flatMap(splitConditionGroups);
  return commaParts.flatMap((part) => {
    if (!isList && !mixedCase) return [part];
    const pieces = splitTop(part, /^\s+[eE]\s+/).map(tidyPiece).filter(Boolean);
    if (pieces.length === 1) return [part];
    if (isList) return pieces;
    // Caixa mista sem vírgula: só divide se cada termo depois do "e" começa com maiúscula.
    return pieces.slice(1).every((p) => /^[A-ZÀ-Ý]/.test(p)) ? pieces : [part];
  });
}

/** Tira "e " do começo, " e" do fim e ponto final ("Ficha, e Comprovante"). */
function tidyPiece(piece: string): string {
  return piece
    .trim()
    .replace(/^[eE]\s+/, "")
    .replace(/\s+[eE]$/, "")
    .replace(/\.$/, "")
    .trim();
}

function splitConditionGroups(part: string): string[] {
  const pieces = splitTop(part, /^\s+[eE]\s+/);
  const groups: string[] = [];
  let current = pieces[0] ?? "";
  for (const piece of pieces.slice(1)) {
    if (current.includes(" - ") && piece.includes(" - ")) {
      groups.push(current);
      current = piece;
    } else {
      current = `${current} e ${piece}`;
    }
  }
  groups.push(current);
  return groups.map(tidyPiece).filter(Boolean);
}

const CNS_ALIASES = /^(cns|cart[aã]o (do )?sus|cart[aã]o nacional de sa[uú]de)$/i;

function itemLabel(raw: string): string {
  const label = smartCase(raw)
    .replace(/\bMapa\b/g, "MAPA")
    .replace(/\b([Rr])eferencia\b/g, "$1eferência")
    .replace(/\b([Cc])ontrarreferencia\b/g, "$1ontrarreferência");
  if (CNS_ALIASES.test(label)) return "Cartão SUS (CNS)";
  return label;
}

/** Nó criado e esquecido no editor antigo ("Novo nó", vazio) e sem ligação. */
function isPlaceholder(n: GraphNode, edges: GraphEdge[]): boolean {
  const label = n.label.trim().toLowerCase();
  return (
    (label === "" || label === "novo nó" || label === "novo no") &&
    !edges.some((e) => e.source_node_id === n.id || e.target_node_id === n.id)
  );
}

function sectionTitle(raw: string): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  for (const [re, title] of SECTION_TITLES) if (re.test(clean)) return title;
  return smartCase(clean);
}

const isWhoHeader = (label: string) => /^quem\s+pode\s+(encaminhar|solicitar)/i.test(label.trim());

export function classifyGraph(nodes: GraphNode[], edges: GraphEdge[]): "requisitos" | "etapas" {
  nodes = nodes.filter((n) => !isPlaceholder(n, edges));
  if (nodes.some((n) => n.type === "decisao")) return "etapas";
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const e of edges) {
    incoming.set(e.target_node_id, (incoming.get(e.target_node_id) ?? 0) + 1);
    outgoing.set(e.source_node_id, (outgoing.get(e.source_node_id) ?? 0) + 1);
  }
  // Cabeçalhos: pontos de atenção sem entrada, e nós soltos de qualquer tipo.
  const headers = nodes.filter(
    (n) => !incoming.get(n.id) && (n.type === "ponto_atencao" || !outgoing.get(n.id)),
  );
  const headerIds = new Set(headers.map((h) => h.id));
  // Estrela de um nível: cabeçalhos sem entrada, itens com uma entrada vinda
  // de cabeçalho e sem saída.
  const star =
    headers.length > 0 &&
    edges.every((e) => headerIds.has(e.source_node_id) && !headerIds.has(e.target_node_id)) &&
    nodes.every((n) => headerIds.has(n.id) || ((incoming.get(n.id) ?? 0) === 1 && !outgoing.get(n.id)));
  return star ? "requisitos" : "etapas";
}

function toAction(n: GraphNode): AdminItemAction | null {
  if (n.type !== "documento") return null;
  return n.documento_acao ? ACTION_MAP[n.documento_acao] ?? null : null;
}

export function convertRequisitos(allNodes: GraphNode[], edges: GraphEdge[]): ConvertResult {
  const notes: ConvertNote[] = [];
  const nodes = allNodes.filter((n) => !isPlaceholder(n, edges));
  if (nodes.length < allNodes.length) {
    notes.push({ kind: "aviso", text: `${allNodes.length - nodes.length} nó(s) "Novo nó" vazio(s) e solto(s) descartado(s)` });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const targets = new Set(edges.map((e) => e.target_node_id));
  const headers = nodes.filter((n) => !targets.has(n.id)).sort(byPosition);
  const childrenOf = (h: GraphNode) =>
    edges
      .filter((e) => e.source_node_id === h.id)
      .map((e) => byId.get(e.target_node_id)!)
      .filter(Boolean)
      .sort(byPosition);

  const who: string[] = [];
  const sections: AdminSection[] = [];
  for (const h of headers) {
    const kids = childrenOf(h);
    if (isWhoHeader(h.label)) {
      who.push(...kids.map((k) => smartCase(k.label)));
      if (!kids.length) notes.push({ kind: "aviso", text: `"${h.label.trim()}" sem profissional ligado` });
      continue;
    }
    if (!kids.length) {
      notes.push({ kind: "dropped", text: `bloco "${h.label.trim()}" sem itens ligados — virou item solto` });
    }
    const items: AdminItem[] = kids.flatMap((k) => {
      const parts = k.type === "documento" ? splitItemLabel(k.label) : [k.label.trim()];
      if (parts.length > 1) {
        notes.push({ kind: "split", text: `"${k.label.trim()}" → ${parts.map((p) => `"${itemLabel(p)}"`).join(" · ")}` });
      }
      return parts.map((p) => ({
        id: crypto.randomUUID(),
        label: itemLabel(p),
        action: toAction(k),
      }));
    });
    if (!kids.length) {
      items.push({ id: crypto.randomUUID(), label: smartCase(h.label), action: toAction(h) });
      sections.push({ id: crypto.randomUUID(), title: "Outros", items });
    } else {
      sections.push({ id: crypto.randomUUID(), title: sectionTitle(h.label), items });
    }
  }

  return {
    sheet: { layout: "requisitos", who: who.join("; ") || null, sections },
    notes,
  };
}

export function convertEtapas(allNodes: GraphNode[], edges: GraphEdge[]): ConvertResult {
  const notes: ConvertNote[] = [];
  const nodes = allNodes.filter((n) => !isPlaceholder(n, edges));
  if (nodes.length < allNodes.length) {
    notes.push({ kind: "aviso", text: `${allNodes.length - nodes.length} nó(s) "Novo nó" vazio(s) e solto(s) descartado(s)` });
  }
  let es = edges.map((e) => ({ ...e }));

  // Profissional com uma única saída vira o responsável da etapa seguinte.
  const responsible = new Map<string, string[]>();
  const dropped = new Set<string>();
  for (const p of nodes.filter((n) => n.type === "profissional")) {
    const out = es.filter((e) => e.source_node_id === p.id);
    const target = out.length === 1 ? nodes.find((n) => n.id === out[0].target_node_id) : undefined;
    if (!target || target.type === "profissional") continue;
    responsible.set(target.id, [...(responsible.get(target.id) ?? []), smartCase(p.label)]);
    dropped.add(p.id);
    es = es
      .filter((e) => e.source_node_id !== p.id)
      .map((e) => (e.target_node_id === p.id ? { ...e, target_node_id: target.id } : e));
  }

  // Ordem do desenho: de cima pra baixo, ou da esquerda pra direita se o
  // fluxograma for horizontal.
  const steps = nodes.filter((n) => !dropped.has(n.id));
  const spreadX = Math.max(...steps.map((n) => n.position_x)) - Math.min(...steps.map((n) => n.position_x));
  const spreadY = Math.max(...steps.map((n) => n.position_y)) - Math.min(...steps.map((n) => n.position_y));
  steps.sort(spreadX > spreadY * 1.5 ? (a, b) => a.position_x - b.position_x || a.position_y - b.position_y : byPosition);

  const itemId = new Map(steps.map((n) => [n.id, crypto.randomUUID()]));
  const order = new Map(steps.map((n, i) => [n.id, i]));
  const seen = new Set<string>();
  const items: AdminItem[] = steps.map((n, i) => {
    const out = es
      .filter((e) => e.source_node_id === n.id && itemId.has(e.target_node_id))
      .filter((e) => {
        const k = `${e.target_node_id}|${e.label ?? ""}`;
        if (seen.has(`${n.id}>${k}`)) return false;
        seen.add(`${n.id}>${k}`);
        return true;
      })
      .sort((a, b) => order.get(a.target_node_id)! - order.get(b.target_node_id)!);
    // Uma saída para a etapa logo abaixo fica implícita; o resto vira desvio.
    const implicit = out.length === 1 && order.get(out[0].target_node_id) === i + 1;
    return {
      id: itemId.get(n.id)!,
      label: smartCase(n.label),
      action: toAction(n),
      responsible: responsible.get(n.id)?.join("; ") ?? null,
      branches: implicit
        ? []
        : out.map((e) => ({
            id: crypto.randomUUID(),
            label: (e.label ?? "").trim(),
            target_id: itemId.get(e.target_node_id)!,
          })),
    };
  });
  if (dropped.size) notes.push({ kind: "aviso", text: `${dropped.size} profissional(is) viraram "Responsável" da etapa seguinte` });

  return {
    sheet: { layout: "etapas", sections: [{ id: crypto.randomUUID(), title: "Etapas", items }] },
    notes,
  };
}

export function graphToAdminSheet(nodes: GraphNode[], edges: GraphEdge[]): ConvertResult {
  return classifyGraph(nodes, edges) === "requisitos"
    ? convertRequisitos(nodes, edges)
    : convertEtapas(nodes, edges);
}
