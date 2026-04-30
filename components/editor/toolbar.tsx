"use client";

import {
  CircleDot,
  GitBranch,
  Workflow,
  Goal,
  Send,
  Sigma,
  Sparkles,
} from "lucide-react";
import type { NodeType } from "@/types/domain";
import { NODE_TYPE_LABEL } from "@/types/domain";

interface EditorToolbarProps {
  onAddNode: (type: NodeType) => void;
  onAutoLayout: () => void;
}

const NODE_BUTTONS: { type: NodeType; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "ponto_atencao", icon: CircleDot },
  { type: "decisao", icon: GitBranch },
  { type: "conduta_intermediaria", icon: Workflow },
  { type: "conduta_terminal", icon: Goal },
  { type: "encaminhamento", icon: Send },
  { type: "calculadora", icon: Sigma },
];

export function EditorToolbar({ onAddNode, onAutoLayout }: EditorToolbarProps) {
  return (
    <aside className="w-56 border-r-2 border-stone-900 bg-stone-50 p-4 flex flex-col gap-1">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
        Adicionar nó
      </p>
      <div className="flex flex-col gap-1">
        {NODE_BUTTONS.map(({ type, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddNode(type)}
            className="flex items-center gap-3 px-3 py-2 border-2 border-stone-300 hover:border-stone-900 hover:bg-white text-left transition-colors text-sm text-stone-900"
          >
            <Icon className="size-4 text-stone-600 shrink-0" />
            <span className="truncate">{NODE_TYPE_LABEL[type]}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-stone-300 my-4" />

      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
        Layout
      </p>
      <button
        type="button"
        onClick={onAutoLayout}
        className="flex items-center gap-3 px-3 py-2 border-2 border-stone-900 bg-white hover:bg-stone-900 hover:text-stone-50 text-left transition-colors text-sm text-stone-900"
      >
        <Sparkles className="size-4 shrink-0" />
        Auto-organizar
      </button>

      <div className="h-px bg-stone-300 my-4" />

      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
        Como conectar
      </p>
      <p className="text-xs text-stone-600 leading-relaxed">
        Arraste do círculo de baixo de um nó até o círculo de cima de outro
        para criar uma aresta.
      </p>
    </aside>
  );
}
