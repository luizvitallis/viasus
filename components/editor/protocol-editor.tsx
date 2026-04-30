"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { viaNodeTypes } from "./nodes";
import { getEdgeStyleProps } from "./edge-styles";
import { EditorToolbar } from "./toolbar";
import { PropertiesPanel } from "./properties-panel";
import { applyDagreLayout } from "./dagre-layout";
import {
  publishProtocol,
  saveProtocolGraph,
} from "@/app/admin/protocolos/[id]/editar/actions";
import {
  type NodeType,
  type EdgeStyle,
  PROTOCOL_TYPE_LABEL,
  PROTOCOL_STATUS_LABEL,
} from "@/types/domain";

interface InitialNode {
  id: string;
  type: NodeType;
  label: string;
  position_x: number;
  position_y: number;
  content: unknown;
  tags: string[];
}

interface InitialEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  style: EdgeStyle;
  condition_expr: unknown;
}

interface ProtocolEditorProps {
  protocolId: string;
  protocolMeta: {
    title: string;
    type: string;
    status: string;
    slug: string;
  };
  tenantSubdomain: string;
  userRole: string;
  initialNodes: InitialNode[];
  initialEdges: InitialEdge[];
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function nodeFromInitial(n: InitialNode): Node {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.position_x, y: n.position_y },
    data: {
      label: n.label,
      content: n.content ?? { type: "doc", content: [] },
      tags: n.tags,
    },
  };
}

function edgeFromInitial(e: InitialEdge): Edge {
  const styleProps = getEdgeStyleProps(e.style);
  return {
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label ?? undefined,
    data: { style: e.style },
    ...styleProps,
  };
}

function makeId() {
  return crypto.randomUUID();
}

export function ProtocolEditor(props: ProtocolEditorProps) {
  return (
    <ReactFlowProvider>
      <ProtocolEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function ProtocolEditorInner({
  protocolId,
  protocolMeta,
  tenantSubdomain,
  userRole,
  initialNodes,
  initialEdges,
}: ProtocolEditorProps) {
  const canPublish = ["gestor", "publicador", "admin"].includes(userRole);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map(nodeFromInitial),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(edgeFromInitial),
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [currentStatus, setCurrentStatus] = useState(protocolMeta.status);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  // Marcador de mudança que é incrementado a cada interação user-driven
  const [dirtyTick, setDirtyTick] = useState(0);

  // Evita marcar como dirty na hidratação inicial
  const hydrated = useRef(false);
  useEffect(() => {
    hydrated.current = true;
  }, []);

  const markDirty = useCallback(() => {
    if (!hydrated.current) return;
    setSaveState("dirty");
    setDirtyTick((t) => t + 1);
  }, []);

  // Quando user muda nós (drag, change), refletir em "dirty"
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // Apenas mudanças significativas marcam dirty
      const significant = changes.some(
        (c) =>
          c.type === "position" || c.type === "remove" || c.type === "add",
      );
      if (significant) markDirty();
    },
    [onNodesChange, markDirty],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      const significant = changes.some(
        (c) => c.type === "remove" || c.type === "add",
      );
      if (significant) markDirty();
    },
    [onEdgesChange, markDirty],
  );

  // Conectar nós cria nova edge
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: makeId(),
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        data: { style: "normal" as EdgeStyle },
        ...getEdgeStyleProps("normal"),
      };
      setEdges((eds) => addEdge(newEdge, eds));
      markDirty();
    },
    [setEdges, markDirty],
  );

  // Adicionar nó pelo toolbar
  const onAddNode = useCallback(
    (type: NodeType) => {
      const id = makeId();
      const offset = nodes.length * 24;
      const newNode: Node = {
        id,
        type,
        position: { x: 100 + offset, y: 100 + offset },
        data: {
          label: "Novo nó",
          content: { type: "doc", content: [] },
          tags: [],
        },
      };
      setNodes((ns) => [...ns, newNode]);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      markDirty();
    },
    [nodes.length, setNodes, markDirty],
  );

  // Auto-organizar (dagre)
  const onAutoLayout = useCallback(() => {
    setNodes((ns) => applyDagreLayout(ns, edges));
    markDirty();
  }, [setNodes, edges, markDirty]);

  // Atualizar dados do nó selecionado
  const onUpdateNode = useCallback(
    (id: string, patch: Partial<{ label: string; content: unknown; tags: string[] }>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        ),
      );
      markDirty();
    },
    [setNodes, markDirty],
  );

  const onChangeNodeType = useCallback(
    (id: string, type: NodeType) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, type } : n)));
      markDirty();
    },
    [setNodes, markDirty],
  );

  const onDeleteNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.filter((n) => n.id !== id));
      setEdges((es) =>
        es.filter((e) => e.source !== id && e.target !== id),
      );
      setSelectedNodeId(null);
      markDirty();
    },
    [setNodes, setEdges, markDirty],
  );

  const onUpdateEdge = useCallback(
    (id: string, patch: { label?: string; style?: string }) => {
      setEdges((es) =>
        es.map((e) => {
          if (e.id !== id) return e;
          const next: Edge = { ...e };
          if (patch.label !== undefined) next.label = patch.label || undefined;
          if (patch.style !== undefined) {
            const styleEnum = patch.style as EdgeStyle;
            const props = getEdgeStyleProps(styleEnum);
            next.data = { ...(e.data ?? {}), style: styleEnum };
            next.style = props.style;
            next.labelStyle = props.labelStyle;
            next.labelBgStyle = props.labelBgStyle;
          }
          return next;
        }),
      );
      markDirty();
    },
    [setEdges, markDirty],
  );

  const onDeleteEdge = useCallback(
    (id: string) => {
      setEdges((es) => es.filter((e) => e.id !== id));
      setSelectedEdgeId(null);
      markDirty();
    },
    [setEdges, markDirty],
  );

  // Auto-save: 800ms após a última mudança
  useEffect(() => {
    if (saveState !== "dirty") return;
    const timeout = setTimeout(async () => {
      setSaveState("saving");
      const payload = {
        protocolId,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as NodeType,
          label: (n.data?.label as string) ?? "",
          position_x: n.position.x,
          position_y: n.position.y,
          content: n.data?.content ?? null,
          tags: ((n.data?.tags as string[]) ?? []) as string[],
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source_node_id: e.source,
          target_node_id: e.target,
          label: typeof e.label === "string" ? e.label : null,
          style: ((e.data?.style as EdgeStyle) ?? "normal") as EdgeStyle,
        })),
      };
      const result = await saveProtocolGraph(payload);
      if (result.ok) {
        setSaveState("saved");
        setSavedAt(new Date(result.savedAt!));
      } else {
        setSaveState("error");
        toast.error(result.error ?? "Erro ao salvar");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [dirtyTick, saveState, protocolId, nodes, edges]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    const result = await publishProtocol({
      protocolId,
      changeNote: changeNote || undefined,
    });
    setPublishing(false);
    if (result.ok) {
      toast.success(`Publicado como versão ${result.versionNumber}.`);
      setCurrentStatus("published");
      setShowPublishModal(false);
      setChangeNote("");
    } else {
      toast.error(result.error ?? "Erro ao publicar");
    }
  }, [protocolId, changeNote]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const n = nodes.find((n) => n.id === selectedNodeId);
    if (!n || !n.type) return null;
    return {
      id: n.id,
      type: n.type as NodeType,
      data: {
        label: (n.data?.label as string) ?? "",
        content: n.data?.content ?? { type: "doc", content: [] },
        tags: ((n.data?.tags as string[]) ?? []),
      },
    };
  }, [selectedNodeId, nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    const e = edges.find((e) => e.id === selectedEdgeId);
    if (!e) return null;
    return {
      id: e.id,
      label: typeof e.label === "string" ? e.label : null,
      style: ((e.data?.style as string) ?? "normal"),
    };
  }, [selectedEdgeId, edges]);

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Top bar */}
      <header className="border-b-2 border-stone-900 bg-stone-50 px-4 h-14 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/admin/protocolos"
            className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Protocolos</span>
          </Link>
          <span className="text-stone-300">|</span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
              {PROTOCOL_TYPE_LABEL[protocolMeta.type as keyof typeof PROTOCOL_TYPE_LABEL] ?? protocolMeta.type}
            </p>
            <h1 className="font-medium text-stone-950 truncate text-sm">
              {protocolMeta.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SaveIndicator state={saveState} savedAt={savedAt} />
          <span className="hidden md:inline-flex items-center px-2 py-0.5 border-2 border-stone-900 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-700 bg-stone-100">
            {PROTOCOL_STATUS_LABEL[currentStatus as keyof typeof PROTOCOL_STATUS_LABEL] ?? currentStatus}
          </span>
          {currentStatus === "published" && (
            <a
              href={`/${tenantSubdomain}/protocolos/${protocolMeta.slug}`}
              target="_blank"
              rel="noopener"
              className="hidden md:inline-flex items-center gap-1 text-sm text-stone-600 hover:text-emerald-800 transition-colors"
            >
              Ver pública
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {canPublish && (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              disabled={saveState === "dirty" || saveState === "saving"}
              className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-400 text-stone-50 font-medium px-4 h-9 transition-colors"
            >
              <Send className="size-3.5" />
              Publicar
            </button>
          )}
        </div>
      </header>

      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4"
          onClick={() => !publishing && setShowPublishModal(false)}
        >
          <div
            className="bg-white border-2 border-stone-900 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-stone-900 px-5 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
                Publicar protocolo
              </p>
              <button
                type="button"
                onClick={() => !publishing && setShowPublishModal(false)}
                className="text-stone-500 hover:text-stone-900"
                disabled={publishing}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-stone-700">
                Esta ação cria uma versão imutável do estado atual do protocolo
                e o torna visível em{" "}
                <code className="font-mono text-sm bg-stone-100 px-1.5 py-0.5">
                  /{tenantSubdomain}/protocolos/{protocolMeta.slug}
                </code>
                .
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="change-note"
                  className="text-sm font-medium text-stone-900"
                >
                  Nota de mudança (opcional)
                </label>
                <textarea
                  id="change-note"
                  rows={3}
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder='ex.: "atualizei o critério de encaminhamento conforme PCDT 2026"'
                  className="w-full border-2 border-stone-300 px-3 py-2 text-sm focus-visible:border-emerald-800 focus-visible:outline-none resize-y"
                  disabled={publishing}
                />
                <p className="text-xs text-stone-500">
                  Aparece no histórico de versões.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3 bg-stone-50">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={publishing}
                className="px-4 h-9 border-2 border-stone-300 hover:border-stone-900 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-400 text-stone-50 font-medium px-4 h-9 transition-colors"
              >
                {publishing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Publicando…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Confirmar publicação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <EditorToolbar onAddNode={onAddNode} onAutoLayout={onAutoLayout} />

        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={viaNodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => {
              setSelectedNodeId(n.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_, e) => {
              setSelectedEdgeId(e.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView={initialNodes.length > 0}
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} color="#d6d3d1" />
            <Controls
              position="bottom-right"
              showInteractive={false}
              className="!shadow-none !border-2 !border-stone-900"
            />
            <MiniMap
              position="top-right"
              className="!border-2 !border-stone-900"
              nodeStrokeWidth={2}
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        <aside className="w-[400px] border-l-2 border-stone-900 bg-stone-50 shrink-0 hidden lg:flex flex-col">
          <PropertiesPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onUpdateNode={onUpdateNode}
            onChangeNodeType={onChangeNodeType}
            onDeleteNode={onDeleteNode}
            onUpdateEdge={onUpdateEdge}
            onDeleteEdge={onDeleteEdge}
            onClose={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          />
        </aside>
      </div>
    </div>
  );
}

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-stone-600 font-mono">
        <Loader2 className="size-3.5 animate-spin" />
        Salvando…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-destructive font-mono">
        <CircleAlert className="size-3.5" />
        Erro ao salvar
      </span>
    );
  }
  if (state === "saved" && savedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-800 font-mono">
        <CircleCheck className="size-3.5" />
        Salvo {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  if (state === "dirty") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-stone-500 font-mono">
        Mudanças não salvas
      </span>
    );
  }
  return null;
}
