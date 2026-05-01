"use client";

import { Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TipTapEditor } from "./tiptap-editor";
import {
  NODE_TYPE_LABEL,
  type NodeType,
  EDGE_STYLES,
  DOCUMENTO_CATEGORIA_LABEL,
  DOCUMENTO_ACAO_LABEL,
} from "@/types/domain";

interface NodeData {
  label: string;
  content: unknown;
  tags: string[];
  documento_categoria?: string | null;
  documento_acao?: string | null;
  documento_link?: string | null;
  color_bg?: string | null;
  color_border?: string | null;
}

interface SelectedNode {
  id: string;
  type: NodeType;
  data: NodeData;
}

interface SelectedEdge {
  id: string;
  label?: string | null;
  style: string;
  color_stroke?: string | null;
}

interface PropertiesPanelProps {
  selectedNode: SelectedNode | null;
  selectedEdge: SelectedEdge | null;
  onUpdateNode: (id: string, patch: Partial<NodeData>) => void;
  onChangeNodeType: (id: string, type: NodeType) => void;
  onDeleteNode: (id: string) => void;
  onUpdateEdge: (
    id: string,
    patch: { label?: string; style?: string; color_stroke?: string | null },
  ) => void;
  onDeleteEdge: (id: string) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  "#1c1917", // ink
  "#145bb8", // azul sms
  "#1e5b9e", // clinical blue
  "#166534", // emerald-800
  "#b91c1c", // red-700
  "#b75000", // amber-700
  "#44403b", // stone-700
  "#79716b", // stone-500
];

function ColorField({
  label,
  value,
  onChange,
  fallback,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  fallback: string;
}) {
  const current = value ?? fallback;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 border-2 border-stone-300 cursor-pointer p-0 bg-transparent"
          aria-label={label}
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={`default: ${fallback}`}
          className="flex-1 h-9 border-2 border-stone-300 px-2 text-xs font-mono focus-visible:border-emerald-800 focus-visible:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] uppercase font-mono tracking-[0.14em] text-stone-500 hover:text-stone-900 px-1.5"
            title="Voltar ao default do tipo"
          >
            reset
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="size-5 border border-stone-300 hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
            aria-label={`cor ${c}`}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onChangeNodeType,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onClose,
}: PropertiesPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="p-6 text-stone-500 text-sm">
        Selecione um nó ou aresta para editar suas propriedades.
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b-2 border-stone-900">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
            Aresta
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edge-label">Rótulo</Label>
            <Input
              id="edge-label"
              value={selectedEdge.label ?? ""}
              onChange={(e) =>
                onUpdateEdge(selectedEdge.id, { label: e.target.value })
              }
              placeholder='ex.: "se HbA1c > 9%"'
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edge-style">Estilo</Label>
            <select
              id="edge-style"
              value={selectedEdge.style}
              onChange={(e) =>
                onUpdateEdge(selectedEdge.id, { style: e.target.value })
              }
              className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-sm focus-visible:border-emerald-800 focus-visible:outline-none"
            >
              <option value="normal">Normal</option>
              <option value="urgente">Urgente (vermelho)</option>
              <option value="condicional">Condicional (tracejada)</option>
            </select>
            {EDGE_STYLES /* keep import alive */ && null}
          </div>

          <div className="border-2 border-stone-300 bg-stone-50 p-3 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
              Cor da linha + seta
            </p>
            <ColorField
              label="Sobrescreve a cor do estilo"
              value={selectedEdge.color_stroke ?? null}
              onChange={(v) =>
                onUpdateEdge(selectedEdge.id, { color_stroke: v })
              }
              fallback={
                selectedEdge.style === "urgente"
                  ? "#b91c1c"
                  : selectedEdge.style === "condicional"
                    ? "#57534e"
                    : "#1c1917"
              }
            />
          </div>
        </div>

        <div className="border-t-2 border-stone-900 p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDeleteEdge(selectedEdge.id)}
            className="w-full rounded-none text-destructive hover:bg-red-50 hover:text-destructive border border-stone-300 hover:border-destructive"
          >
            <Trash2 className="size-4" />
            Remover aresta
          </Button>
        </div>
      </div>
    );
  }

  // Selected node
  const node = selectedNode!;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b-2 border-stone-900">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
          {NODE_TYPE_LABEL[node.type]}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-500 hover:text-stone-900"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="node-label">Rótulo curto</Label>
          <Input
            id="node-label"
            value={node.data.label}
            onChange={(e) =>
              onUpdateNode(node.id, { label: e.target.value })
            }
            placeholder="Frase curta que aparece no fluxograma"
          />
          <p className="text-xs text-stone-500">
            Esta é a frase visível no quadrinho do nó. Mantenha curta.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="node-type">Tipo</Label>
          <select
            id="node-type"
            value={node.type}
            onChange={(e) =>
              onChangeNodeType(node.id, e.target.value as NodeType)
            }
            className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-sm focus-visible:border-emerald-800 focus-visible:outline-none"
          >
            {Object.entries(NODE_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="border-2 border-stone-300 bg-stone-50 p-3 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
            Cores customizadas
          </p>
          <ColorField
            label="Fundo da caixa"
            value={node.data.color_bg ?? null}
            onChange={(v) => onUpdateNode(node.id, { color_bg: v })}
            fallback="#ffffff"
          />
          <ColorField
            label="Borda"
            value={node.data.color_border ?? null}
            onChange={(v) => onUpdateNode(node.id, { color_border: v })}
            fallback="#1c1917"
          />
          <p className="text-xs text-stone-500">
            Em branco usa o default do tipo. Aplica imediatamente no canvas.
          </p>
        </div>

        {/* Campos específicos do tipo Documento (Fluxos Administrativos).
             Cast pra string porque NodeType só inclui 'documento' depois da
             0007 aplicada + types regenerados. */}
        {(node.type as string) === "documento" && (
          <div className="space-y-4 border-2 border-stone-300 bg-stone-50 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
              Configuração do documento
            </p>

            <div className="space-y-2">
              <Label htmlFor="doc-categoria">Categoria</Label>
              <select
                id="doc-categoria"
                value={node.data.documento_categoria ?? "impresso"}
                onChange={(e) =>
                  onUpdateNode(node.id, {
                    documento_categoria: e.target.value,
                  })
                }
                className="flex h-10 w-full border-2 border-stone-300 bg-white px-3 py-1 text-sm focus-visible:border-emerald-800 focus-visible:outline-none"
              >
                {Object.entries(DOCUMENTO_CATEGORIA_LABEL).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-acao">Ação requerida</Label>
              <select
                id="doc-acao"
                value={node.data.documento_acao ?? "anexar_e_levar"}
                onChange={(e) =>
                  onUpdateNode(node.id, { documento_acao: e.target.value })
                }
                className="flex h-10 w-full border-2 border-stone-300 bg-white px-3 py-1 text-sm focus-visible:border-emerald-800 focus-visible:outline-none"
              >
                {Object.entries(DOCUMENTO_ACAO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-stone-500">
                Define a cor do nó e a instrução exibida ao profissional.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-link">Link do modelo (opcional)</Label>
              <Input
                id="doc-link"
                type="url"
                value={node.data.documento_link ?? ""}
                onChange={(e) =>
                  onUpdateNode(node.id, {
                    documento_link: e.target.value || null,
                  })
                }
                placeholder="https://…/modelo.pdf"
              />
              <p className="text-xs text-stone-500">
                Se preenchido, aparece um botão &ldquo;Baixar modelo&rdquo; no
                nó.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Conteúdo clínico</Label>
          <TipTapEditor
            initialContent={node.data.content}
            onChange={(json) => onUpdateNode(node.id, { content: json })}
          />
          <p className="text-xs text-stone-500">
            Este é o texto que aparece quando o profissional clica no nó no
            visualizador.
          </p>
        </div>
      </div>

      <div className="border-t-2 border-stone-900 p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDeleteNode(node.id)}
          className="w-full rounded-none text-destructive hover:bg-red-50 hover:text-destructive border border-stone-300 hover:border-destructive"
        >
          <Trash2 className="size-4" />
          Remover nó
        </Button>
      </div>
    </div>
  );
}
