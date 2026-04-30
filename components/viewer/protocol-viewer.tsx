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

      {/* Layout flex: canvas + (opcional) painel lateral inline em desktop.
           Quando o painel abre, o canvas encolhe automaticamente.
           Quando fecha, volta a ocupar 100%. */}
      <div className="h-[calc(100vh-160px)] min-h-[520px] flex">
        <div className="flex-1 min-w-0 relative">
          <ReactFlow
            nodes={xyNodes}
            edges={xyEdges}
            nodeTypes={viaNodeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedId(null)}
            // Sem fitView (que centralizaria e cortaria o topo). Os nós já
            // foram normalizados no server pra começar em (0, 0). O viewport
            // inicial posiciona o canto superior-esquerdo do grafo no topo
            // do canvas com pequena margem. Zoom 0.9 = ligeiramente reduzido
            // pra caber mais nós na viewport sem perder legibilidade.
            defaultViewport={{ x: 30, y: 24, zoom: 0.9 }}
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

        {/* Painel lateral (desktop) — INLINE, divide largura com canvas */}
        {selectedNode && (
          <aside
            className="hidden lg:flex flex-col w-[440px] shrink-0 border-l-2 border-stone-900 bg-white"
            role="region"
            aria-label="Conteúdo do nó"
          >
            <NodeSheetContent
              node={selectedNode}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        )}
      </div>

      {/* Bottom sheet (mobile) — sobreposto, com scrim */}
      {selectedNode && (
        <MobileBottomSheet
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

/**
 * Conteúdo do painel — header + body + tags. Sem positioning próprio,
 * pra ser usado tanto inline (desktop side panel) quanto fixed (mobile
 * bottom sheet).
 */
function NodeSheetContent({ node, onClose }: NodeSheetProps) {
  return (
    <>
      <header className="flex items-center justify-between px-5 py-3 border-b-2 border-stone-900 shrink-0">
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
    </>
  );
}

/**
 * Bottom sheet do mobile: fixed bottom, scrim, drag handle.
 * Em desktop (lg+) NÃO renderiza nada — o painel lateral inline é
 * desenhado separadamente no layout flex pai.
 */
function MobileBottomSheet({ node, onClose }: NodeSheetProps) {
  // Trava scroll do body enquanto sheet aberta (apenas no mobile)
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="lg:hidden">
      <div
        className="fixed inset-0 bg-stone-900/40 z-30"
        onClick={onClose}
      />
      <aside
        className="
          fixed z-40 bg-white border-stone-900 shadow-xl
          inset-x-0 bottom-0 max-h-[85vh] border-t-2 rounded-t-lg
          flex flex-col
        "
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>
        <NodeSheetContent node={node} onClose={onClose} />
      </aside>
    </div>
  );
}
