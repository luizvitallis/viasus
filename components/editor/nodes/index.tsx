"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sigma, ArrowRight } from "lucide-react";
import type { NodeType } from "@/types/domain";

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

// ---------- 1. ponto_atencao ----------
function PontoAtencaoNode({ data, selected }: ViaNodeProps) {
  return (
    <div
      className={`${widthCls} px-4 py-3 rounded-md bg-white border-2 border-stone-900 shadow-sm ${selected ? "ring-2 ring-emerald-700 ring-offset-2 ring-offset-stone-50" : ""}`}
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
  return (
    <div
      className={`${widthCls} bg-white border-2 border-emerald-800 outline outline-2 outline-emerald-800 outline-offset-[3px] ${selected ? "ring-2 ring-emerald-700 ring-offset-[7px] ring-offset-stone-50" : ""}`}
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

export const viaNodeTypes: Record<NodeType, React.ComponentType<ViaNodeProps>> = {
  ponto_atencao: PontoAtencaoNode,
  decisao: DecisaoNode,
  conduta_intermediaria: CondutaIntermediariaNode,
  conduta_terminal: CondutaTerminalNode,
  encaminhamento: EncaminhamentoNode,
  calculadora: CalculadoraNode,
};
