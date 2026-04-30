"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Edge,
  type Node,
} from "@xyflow/react";
// xyflow CSS é importado em app/globals.css.
import { X } from "lucide-react";
import { viaNodeTypes } from "@/components/editor/nodes";
import { getEdgeStyleProps } from "@/components/editor/edge-styles";
import {
  NODE_TYPE_LABEL,
  type EdgeStyle,
  type NodeType,
} from "@/types/domain";
import { NodeContent } from "./node-content";
import { trackUsage } from "./track-usage";

interface ViewerNode {
  id: string;
  type: NodeType;
  label: string;
  position_x: number;
  position_y: number;
  content: unknown;
  tags: string[];
  documento_categoria?: string | null;
  documento_acao?: string | null;
  documento_link?: string | null;
}

interface ViewerEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  style: EdgeStyle;
}

interface ProtocolViewerProps {
  tenantId: string;
  protocolId: string;
  versionId: string | null;
  nodes: ViewerNode[];
  edges: ViewerEdge[];
}

function nodeFromViewer(n: ViewerNode): Node {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.position_x, y: n.position_y },
    data: {
      label: n.label,
      content: n.content,
      tags: n.tags,
      documento_categoria: n.documento_categoria ?? null,
      documento_acao: n.documento_acao ?? null,
      documento_link: n.documento_link ?? null,
    },
    draggable: false,
    connectable: false,
    selectable: true,
    deletable: false,
  };
}

function edgeFromViewer(e: ViewerEdge): Edge {
  const styleProps = getEdgeStyleProps(e.style);
  return {
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label ?? undefined,
    data: { style: e.style },
    selectable: false,
    deletable: false,
    ...styleProps,
  };
}

export function ProtocolViewer(props: ProtocolViewerProps) {
  return (
    <ReactFlowProvider>
      <ProtocolViewerInner {...props} />
    </ReactFlowProvider>
  );
}

function ProtocolViewerInner({
  tenantId,
  protocolId,
  versionId,
  nodes: initialNodes,
  edges: initialEdges,
}: ProtocolViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Track open_protocol uma única vez ao montar
  useEffect(() => {
    trackUsage({
      tenantId,
      protocolId,
      versionId,
      action: "open_protocol",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const xyNodes = useMemo<Node[]>(
    () => initialNodes.map(nodeFromViewer),
    [initialNodes],
  );
  const xyEdges = useMemo<Edge[]>(
    () => initialEdges.map(edgeFromViewer),
    [initialEdges],
  );

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return initialNodes.find((n) => n.id === selectedId) ?? null;
  }, [selectedId, initialNodes]);

  const handleNodeClick = useCallback(
    (_: unknown, n: Node) => {
      setSelectedId(n.id);
      trackUsage({
        tenantId,
        protocolId,
        versionId,
        nodeId: n.id,
        action: "click_node",
      });
    },
    [tenantId, protocolId, versionId],
  );

  if (initialNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="border-2 border-dashed border-stone-300 px-6 py-12 text-center max-w-md">
          <p className="font-serif text-2xl text-stone-700 mb-2">
            Este protocolo ainda não tem fluxograma.
          </p>
          <p className="text-stone-500">
            A versão publicada não contém nós. Volte em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative viewer-canvas">
      <style>{`
        /* Não usar display:none nos handles — xyflow precisa da posição
           DOM deles pra calcular o path das arestas. Visibilidade zero. */
        .viewer-canvas .react-flow__handle {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .viewer-canvas .react-flow__node { cursor: pointer; }
      `}</style>
      {/* Canvas dominante — quase fullscreen menos o header compacto.
           Header agora ~50px + top bar ~30px + footer ~100px. */}
      <div className="h-[calc(100vh-160px)] min-h-[520px]">
        <ReactFlow
          nodes={xyNodes}
          edges={xyEdges}
          nodeTypes={viaNodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          // padding 0.05 (5%) — bem mais apertado que o default 0.15;
          // minZoom 0.7 garante que o fitView não zooma out demais ao
          // tentar caber tudo. Profissional já vê os nós em tamanho legível
          // sem precisar dar zoom manual no celular.
          fitViewOptions={{ padding: 0.05, minZoom: 0.7, maxZoom: 1.3 }}
          minZoom={0.3}
          maxZoom={2.5}
          panOnScroll
          panOnDrag
          zoomOnPinch
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="#d6d3d1" />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="!shadow-none !border-2 !border-stone-900"
          />
        </ReactFlow>
      </div>

      {/* Bottom sheet (mobile) / Side panel (desktop) */}
      {selectedNode && (
        <NodeSheet
          node={selectedNode}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

interface NodeSheetProps {
  node: ViewerNode;
  onClose: () => void;
}

function NodeSheet({ node, onClose }: NodeSheetProps) {
  // Trava scroll do body enquanto sheet aberta
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Scrim mobile só */}
      <div
        className="fixed inset-0 bg-stone-900/40 z-30 lg:hidden"
        onClick={onClose}
      />

      {/* Sheet:
            mobile: bottom sheet, fixed bottom, max-height 80vh
            desktop: side panel direita, full height */}
      <aside
        className="
          fixed z-40 bg-white border-stone-900 shadow-xl
          inset-x-0 bottom-0 max-h-[85vh] border-t-2 rounded-t-lg
          lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[440px] lg:border-l-2 lg:border-t-0 lg:rounded-none
          flex flex-col
        "
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle (mobile only) */}
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b-2 border-stone-900">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
            {NODE_TYPE_LABEL[node.type]}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 -mr-2 p-2"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Body — TipTap content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h2 className="font-serif font-semibold text-2xl text-stone-950 leading-tight mb-4">
            {node.label}
          </h2>

          <NodeContent content={node.content} />

          {node.tags && node.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-stone-200">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-stone-100 border border-stone-300 text-xs text-stone-700 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
