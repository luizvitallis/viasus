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

export const NODE_TYPES: NodeType[] = [
  "ponto_atencao",
  "decisao",
  "conduta_intermediaria",
  "conduta_terminal",
  "encaminhamento",
  "calculadora",
];

export const EDGE_STYLES: EdgeStyle[] = ["normal", "urgente", "condicional"];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  ponto_atencao: "Ponto de atenção",
  decisao: "Decisão",
  conduta_intermediaria: "Conduta intermediária",
  conduta_terminal: "Conduta terminal",
  encaminhamento: "Encaminhamento",
  calculadora: "Calculadora",
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
