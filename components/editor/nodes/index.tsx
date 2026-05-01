"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Sigma,
  ArrowRight,
  FileText,
  Download,
  AlertTriangle,
} from "lucide-react";
import type {
  DocumentoAcao,
  DocumentoCategoria,
  NodeType,
} from "@/types/domain";
import {
  DOCUMENTO_ACAO_LABEL,
  DOCUMENTO_CATEGORIA_LABEL,
} from "@/types/domain";

export interface ViaNodeData {
  label: string;
  selected?: boolean;
  [key: string]: unknown;
}

interface ViaNodeProps extends NodeProps {
  data: ViaNodeData;
}

const handleStyle = "!size-2 !bg-stone-50 !border-2 !border-stone-900";
const widthCls = "min-w-[180px] max-w-[260px]";

/**
 * Lê cores customizadas do `data` do nó. Inline style sobrescreve as
 * cores default vindas do Tailwind (mais especificidade).
 */
function customColorStyle(data: ViaNodeData): React.CSSProperties {
  const bg = (data.color_bg as string | null) ?? null;
  const border = (data.color_border as string | null) ?? null;
  const style: React.CSSProperties = {};
  if (bg) style.backgroundColor = bg;
  if (border) style.borderColor = border;
  return style;
}

// ---------- 1. ponto_atencao ----------
function PontoAtencaoNode({ data, selected }: ViaNodeProps) {
  return (
    <div
      className={`${widthCls} px-4 py-3 rounded-md bg-white border-2 border-stone-900 shadow-sm ${selected ? "ring-2 ring-emerald-700 ring-offset-2 ring-offset-stone-50" : ""}`}
      style={customColorStyle(data)}
    >
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">
        Ponto de atenção
      </p>
      <p className="font-medium text-stone-950 leading-tight text-sm">
        {data.label || "Sem rótulo"}
      </p>
      <Handle type="source" position={Position.Bottom} className={handleStyle} />
    </div>
  );
}

// ---------- 2. decisao (losango) ----------
function DecisaoNode({ data, selected }: ViaNodeProps) {
  return (
    <div
      className={`relative w-[200px] h-[200px] flex items-center justify-center ${selected ? "drop-shadow-[0_0_0_2px_rgb(4,120,87)]" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0, transform: "translate(-50%, -50%)" }}
        className={handleStyle}
      />
      <div
        className="absolute inset-4 bg-amber-50 border-2 border-amber-700 rotate-45"
        style={customColorStyle(data)}
        aria-hidden
      />
      <div className="relative max-w-[110px] text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800 mb-1">
          Decisão
        </p>
        <p className="font-medium text-stone-950 leading-tight text-xs">
          {data.label || "Pergunta?"}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ bottom: 0, transform: "translate(-50%, 50%)" }}
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ right: 0, transform: "translate(50%, -50%)" }}
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ left: 0, transform: "translate(-50%, -50%)" }}
        className={handleStyle}
      />
    </div>
  );
}

// ---------- 3. conduta_intermediaria ----------
function CondutaIntermediariaNode({ data, selected }: ViaNodeProps) {
  return (
    <div
      className={`${widthCls} px-4 py-3 bg-white border-2 border-stone-700 ${selected ? "ring-2 ring-emerald-700 ring-offset-2 ring-offset-stone-50" : ""}`}
      style={customColorStyle(data)}
    >
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">
        Conduta
      </p>
      <p className="font-medium text-stone-950 leading-tight text-sm">
        {data.label || "Sem rótulo"}
      </p>
      <Handle type="source" position={Position.Bottom} className={handleStyle} />
    </div>
  );
}

// ---------- 4. conduta_terminal (borda dupla) ----------
function CondutaTerminalNode({ data, selected }: ViaNodeProps) {
  // borda dupla = border + outline. Cor customizada aplica em ambos.
  const customBg = (data.color_bg as string | null) ?? null;
  const customBorder = (data.color_border as string | null) ?? null;
  const wrapperStyle: React.CSSProperties = {};
  if (customBg) wrapperStyle.backgroundColor = customBg;
  if (customBorder) {
    wrapperStyle.borderColor = customBorder;
    wrapperStyle.outlineColor = customBorder;
  }
  return (
    <div
      className={`${widthCls} bg-white border-2 border-emerald-800 outline outline-2 outline-emerald-800 outline-offset-[3px] ${selected ? "ring-2 ring-emerald-700 ring-offset-[7px] ring-offset-stone-50" : ""}`}
      style={wrapperStyle}
    >
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <div className="px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-800 mb-1">
          Conduta terminal
        </p>
        <p className="font-medium text-stone-950 leading-tight text-sm">
          {data.label || "Sem rótulo"}
        </p>
      </div>
    </div>
  );
}

// ---------- 5. encaminhamento (seta indicativa, borda vermelha) ----------
function EncaminhamentoNode({ data, selected }: ViaNodeProps) {
  return (
    <div
      className={`${widthCls} px-4 py-3 bg-red-50 border-2 border-red-700 ${selected ? "ring-2 ring-emerald-700 ring-offset-2 ring-offset-stone-50" : ""}`}
      style={customColorStyle(data)}
    >
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <div className="flex items-start gap-2">
        <ArrowRight className="size-4 text-red-700 mt-0.5 shrink-0" strokeWidth={2.25} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-700 mb-1">
            Encaminhamento
          </p>
          <p className="font-medium text-stone-950 leading-tight text-sm">
            {data.label || "Sem rótulo"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- 6. calculadora (Σ + dashed) ----------
function CalculadoraNode({ data, selected }: ViaNodeProps) {
  return (
    <div
      className={`${widthCls} px-4 py-3 bg-stone-50 border-2 border-dashed border-stone-900 ${selected ? "ring-2 ring-emerald-700 ring-offset-2 ring-offset-stone-50" : ""}`}
      style={customColorStyle(data)}
    >
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <div className="flex items-start gap-2">
        <Sigma className="size-4 text-stone-700 mt-0.5 shrink-0" strokeWidth={2.25} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">
            Calculadora
          </p>
          <p className="font-medium text-stone-950 leading-tight text-sm">
            {data.label || "Sem rótulo"}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className={handleStyle} />
    </div>
  );
}

// ---------- 7. documento (Fluxos Administrativos) ----------
const ACAO_STYLES: Record<
  DocumentoAcao,
  { container: string; pill: string; icon: typeof AlertTriangle | null }
> = {
  apenas_anexar: {
    container: "bg-emerald-50 text-emerald-900",
    pill: "bg-emerald-800 text-emerald-50",
    icon: null,
  },
  anexar_e_levar: {
    container: "bg-red-50 text-red-900",
    pill: "bg-red-700 text-red-50",
    icon: AlertTriangle,
  },
  apenas_levar: {
    container: "bg-amber-50 text-amber-900",
    pill: "bg-amber-700 text-amber-50",
    icon: null,
  },
};

function DocumentoNode({ data, selected }: ViaNodeProps) {
  const categoria = (data.documento_categoria as DocumentoCategoria | null) ?? null;
  const acao = (data.documento_acao as DocumentoAcao | null) ?? "anexar_e_levar";
  const link = (data.documento_link as string | null) ?? null;
  const style = ACAO_STYLES[acao] ?? ACAO_STYLES.anexar_e_levar;
  const AcaoIcon = style.icon;

  return (
    <div
      className={`${widthCls} bg-white border-2 border-stone-700 ${selected ? "ring-2 ring-emerald-700 ring-offset-2 ring-offset-stone-50" : ""}`}
      style={customColorStyle(data)}
    >
      <Handle type="target" position={Position.Top} className={handleStyle} />

      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 border-b-2 border-stone-700">
        <FileText className="size-3 text-stone-700" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">
          Documento
          {categoria ? ` · ${DOCUMENTO_CATEGORIA_LABEL[categoria]}` : ""}
        </p>
      </div>

      <div className="px-4 py-2.5">
        <p className="font-medium text-stone-950 leading-tight text-sm">
          {data.label || "Sem rótulo"}
        </p>
      </div>

      <div
        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium ${style.container} border-t border-stone-200`}
      >
        {AcaoIcon && <AcaoIcon className="size-3 shrink-0" />}
        <span className={`px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${style.pill}`}>
          {DOCUMENTO_ACAO_LABEL[acao]}
        </span>
      </div>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-[11px] text-stone-700 hover:text-emerald-800 border-t border-stone-200 transition-colors"
        >
          <Download className="size-3 shrink-0" />
          Baixar modelo
        </a>
      )}

      <Handle type="source" position={Position.Bottom} className={handleStyle} />
    </div>
  );
}

// NOTE: Record<string, ...> em vez de Record<NodeType, ...> porque o enum
// node_type só passa a incluir 'documento' depois que a migration 0007 for
// aplicada e os tipos forem regenerados. xyflow aceita Record<string, ...>.
export const viaNodeTypes: Record<string, React.ComponentType<ViaNodeProps>> = {
  ponto_atencao: PontoAtencaoNode,
  decisao: DecisaoNode,
  conduta_intermediaria: CondutaIntermediariaNode,
  conduta_terminal: CondutaTerminalNode,
  encaminhamento: EncaminhamentoNode,
  calculadora: CalculadoraNode,
  documento: DocumentoNode,
};
