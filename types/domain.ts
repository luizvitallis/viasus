/**
 * Tipos de domínio derivados dos tipos gerados do banco.
 *
 * Sempre que possível, ancorar os tipos de domínio em
 * `Database['public']['Tables']['…']` para que mudanças no schema
 * propaguem automaticamente.
 */

import type { Database } from "./supabase";

export type ProtocolRow = Database["public"]["Tables"]["protocols"]["Row"];
export type ProtocolInsert = Database["public"]["Tables"]["protocols"]["Insert"];

export type NodeRow = Database["public"]["Tables"]["nodes"]["Row"];
export type NodeInsert = Database["public"]["Tables"]["nodes"]["Insert"];
export type NodeUpdate = Database["public"]["Tables"]["nodes"]["Update"];

export type EdgeRow = Database["public"]["Tables"]["edges"]["Row"];
export type EdgeInsert = Database["public"]["Tables"]["edges"]["Insert"];
export type EdgeUpdate = Database["public"]["Tables"]["edges"]["Update"];

export type NodeType = Database["public"]["Enums"]["node_type"];
export type EdgeStyle = Database["public"]["Enums"]["edge_style"];
export type ProtocolType = Database["public"]["Enums"]["protocol_type"];
export type ProtocolStatus = Database["public"]["Enums"]["protocol_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * TipTap document JSON. Mantemos como `unknown` no banco e
 * validamos por contrato ao ler/escrever.
 */
export type TipTapDoc = {
  type: "doc";
  content: unknown[];
};

/**
 * Protocolos de Encaminhamento — árvore hierárquica de condições/achados
 * com gerador de texto. Salva em `protocols.referral_data` (JSONB).
 */
export type ReferralCategory =
  | "condicao"
  | "sinal"
  | "sintoma"
  | "exame"
  | "achado";

export interface ReferralNode {
  id: string;
  label: string;
  text_when_checked?: string;
  category?: ReferralCategory | null;
  children?: ReferralNode[];
}

export interface ReferralData {
  introduction?: string;
  closing?: string;
  tree: ReferralNode[];
}

export const REFERRAL_CATEGORY_LABEL: Record<ReferralCategory, string> = {
  condicao: "Condição",
  sinal: "Sinal",
  sintoma: "Sintoma",
  exame: "Exame",
  achado: "Achado",
};

// `documento` ainda não está no enum gerado de NodeType até a migration 0007
// ser aplicada e os tipos regenerados. Cast preserva o array como NodeType[].
export const NODE_TYPES: NodeType[] = [
  "ponto_atencao",
  "decisao",
  "conduta_intermediaria",
  "conduta_terminal",
  "encaminhamento",
  "calculadora",
  "documento" as NodeType,
];

export type DocumentoCategoria =
  | "exame"
  | "impresso"
  | "formulario"
  | "preparo"
  | "outro";

export type DocumentoAcao =
  | "apenas_anexar"
  | "anexar_e_levar"
  | "apenas_levar";

export const DOCUMENTO_CATEGORIA_LABEL: Record<DocumentoCategoria, string> = {
  exame: "Exame",
  impresso: "Impresso",
  formulario: "Formulário",
  preparo: "Preparo",
  outro: "Outro",
};

export const DOCUMENTO_ACAO_LABEL: Record<DocumentoAcao, string> = {
  apenas_anexar: "Apenas anexar",
  anexar_e_levar: "Anexar + levar no dia",
  apenas_levar: "Levar no dia",
};

export const EDGE_STYLES: EdgeStyle[] = ["normal", "urgente", "condicional"];

// Record<string, ...> em vez de Record<NodeType, ...> pra acomodar 'documento'
// até a migration 0007 ser aplicada e os tipos regenerados.
export const NODE_TYPE_LABEL: Record<string, string> = {
  ponto_atencao: "Ponto de atenção",
  decisao: "Decisão",
  conduta_intermediaria: "Conduta intermediária",
  conduta_terminal: "Conduta terminal",
  encaminhamento: "Encaminhamento",
  calculadora: "Calculadora",
  documento: "Documento",
};

export const PROTOCOL_TYPE_LABEL: Record<ProtocolType, string> = {
  linha_cuidado: "Linha de Cuidado",
  pcdt: "PCDT",
  encaminhamento: "Encaminhamento Regulado",
  pop: "POP",
  diretriz: "Diretriz",
};

export const PROTOCOL_STATUS_LABEL: Record<ProtocolStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};
