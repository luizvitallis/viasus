"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheck,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  publishProtocol,
  saveReferralData,
} from "@/app/admin/protocolos/[id]/editar/actions";
import {
  type ReferralData,
  type ReferralNode,
  type ReferralCategory,
  REFERRAL_CATEGORY_LABEL,
  PROTOCOL_STATUS_LABEL,
} from "@/types/domain";
import {
  addChildAt,
  collectAllIds,
  countNodes,
  deleteNodeAt,
  emptyReferralData,
  generateJustification,
  newReferralNode,
  type TreePath,
  updateNodeAt,
} from "@/lib/referral";

interface ReferralEditorProps {
  protocolId: string;
  protocolMeta: {
    title: string;
    type: string;
    status: string;
    slug: string;
  };
  tenantSubdomain: string;
  userRole: string;
  initialData: ReferralData | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function ReferralEditor({
  protocolId,
  protocolMeta,
  tenantSubdomain,
  userRole,
  initialData,
}: ReferralEditorProps) {
  const canPublish = ["gestor", "publicador", "admin"].includes(userRole);

  const [data, setData] = useState<ReferralData>(
    initialData ?? emptyReferralData(),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirtyTick, setDirtyTick] = useState(0);
  const hydrated = useRef(false);

  const [currentStatus, setCurrentStatus] = useState(protocolMeta.status);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  useEffect(() => {
    hydrated.current = true;
  }, []);

  const markDirty = useCallback(() => {
    if (!hydrated.current) return;
    setSaveState("dirty");
    setDirtyTick((t) => t + 1);
  }, []);

  // Auto-save 800ms após última mudança
  useEffect(() => {
    if (saveState !== "dirty") return;
    const timeout = setTimeout(async () => {
      setSaveState("saving");
      const result = await saveReferralData({
        protocolId,
        data,
      });
      if (result.ok) {
        setSaveState("saved");
        setSavedAt(new Date(result.savedAt!));
      } else {
        setSaveState("error");
        toast.error(result.error ?? "Erro ao salvar");
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [dirtyTick, saveState, protocolId, data]);

  // Atualizadores de árvore
  const updateIntroduction = (text: string) => {
    setData((d) => ({ ...d, introduction: text }));
    markDirty();
  };
  const updateClosing = (text: string) => {
    setData((d) => ({ ...d, closing: text }));
    markDirty();
  };
  const updateNode = (path: TreePath, patch: Partial<ReferralNode>) => {
    setData((d) => ({
      ...d,
      tree: updateNodeAt(d.tree, path, (n) => ({ ...n, ...patch })),
    }));
    markDirty();
  };
  const deleteNode = (path: TreePath) => {
    setData((d) => ({
      ...d,
      tree: deleteNodeAt(d.tree, path),
    }));
    markDirty();
  };
  const addChild = (path: TreePath) => {
    setData((d) => ({
      ...d,
      tree: addChildAt(d.tree, path, newReferralNode()),
    }));
    markDirty();
  };

  // Preview "tudo marcado"
  const allCheckedIds = useMemo(
    () => new Set(collectAllIds(data.tree)),
    [data.tree],
  );
  const previewText = useMemo(
    () => generateJustification(data, allCheckedIds),
    [data, allCheckedIds],
  );

  const totalNodes = useMemo(() => countNodes(data.tree), [data.tree]);

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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Toaster position="bottom-center" richColors closeButton />

      {/* Top bar */}
      <header className="border-b-2 border-stone-900 bg-stone-50 px-4 h-14 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-20">
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
              Encaminhamento
            </p>
            <h1 className="font-medium text-stone-950 truncate text-sm">
              {protocolMeta.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SaveIndicator state={saveState} savedAt={savedAt} />
          <Link
            href={`/admin/protocolos/${protocolId}/anexos`}
            className="hidden md:inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 transition-colors"
            title="Anexos"
          >
            <Paperclip className="size-3.5" />
            Anexos
          </Link>
          <Link
            href={`/admin/protocolos/${protocolId}/versoes`}
            className="hidden md:inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 transition-colors"
            title="Histórico de versões"
          >
            <History className="size-3.5" />
            Versões
          </Link>
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
              disabled={saveState === "dirty" || saveState === "saving" || totalNodes === 0}
              className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-400 text-stone-50 font-medium px-4 h-9 transition-colors"
            >
              <Send className="size-3.5" />
              Publicar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Coluna 1 — Editor */}
        <section className="lg:overflow-y-auto lg:border-r-2 border-stone-900 px-6 py-8 space-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
              Edição
            </p>
            <h2 className="font-serif font-semibold text-2xl text-stone-950">
              Itens clicáveis e texto da justificativa
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Cada item vira um checkbox no visualizador. O texto inserido em
              cada item é concatenado na justificativa final na ordem da árvore.
            </p>
          </div>

          {/* Introdução */}
          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
              Introdução
            </label>
            <textarea
              value={data.introduction ?? ""}
              onChange={(e) => updateIntroduction(e.target.value)}
              rows={2}
              placeholder="Encaminho paciente para avaliação especializada por:"
              className="w-full border-2 border-stone-300 px-3 py-2 text-sm focus-visible:border-emerald-800 focus-visible:outline-none resize-y"
            />
            <p className="text-xs text-stone-500">
              Aparece no início da justificativa, antes dos achados marcados.
            </p>
          </div>

          {/* Árvore */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
                Árvore de itens · {totalNodes} item(s)
              </label>
              <button
                type="button"
                onClick={() => addChild([])}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900"
              >
                <Plus className="size-3.5" />
                Adicionar raiz
              </button>
            </div>

            {data.tree.length === 0 ? (
              <div className="border-2 border-dashed border-stone-300 px-4 py-8 text-center">
                <p className="text-stone-600 text-sm mb-3">
                  Nenhum item ainda. Comece adicionando uma condição.
                </p>
                <button
                  type="button"
                  onClick={() => addChild([])}
                  className="inline-flex items-center gap-1 px-3 h-9 border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 font-medium text-sm transition-colors"
                >
                  <Plus className="size-4" />
                  Adicionar primeira condição
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.tree.map((node, i) => (
                  <NodeEditor
                    key={node.id}
                    node={node}
                    path={[i]}
                    depth={0}
                    onUpdate={updateNode}
                    onDelete={deleteNode}
                    onAddChild={addChild}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Fechamento */}
          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700">
              Fechamento
            </label>
            <textarea
              value={data.closing ?? ""}
              onChange={(e) => updateClosing(e.target.value)}
              rows={2}
              placeholder="Solicito vaga em ambulatório especializado conforme regulação local."
              className="w-full border-2 border-stone-300 px-3 py-2 text-sm focus-visible:border-emerald-800 focus-visible:outline-none resize-y"
            />
            <p className="text-xs text-stone-500">
              Aparece no fim da justificativa, após os achados.
            </p>
          </div>
        </section>

        {/* Coluna 2 — Preview */}
        <section className="lg:overflow-y-auto px-6 py-8 bg-stone-100">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
            Pré-visualização
          </p>
          <h2 className="font-serif font-semibold text-2xl text-stone-950 mb-2">
            Justificativa com tudo marcado
          </h2>
          <p className="text-sm text-stone-600 mb-6">
            Esta é a saída quando o profissional marca todos os itens. No
            visualizador real, só os itens marcados aparecem.
          </p>

          <div className="border-2 border-stone-900 bg-white p-5">
            {previewText ? (
              <p className="text-stone-950 leading-relaxed whitespace-pre-wrap">
                {previewText}
              </p>
            ) : (
              <p className="text-stone-400 italic">
                Adicione itens à árvore com o campo &ldquo;Texto na
                justificativa&rdquo; preenchido pra ver a saída aqui.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Modal de publicar */}
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
                Esta ação cria uma versão imutável da árvore atual e torna o
                protocolo visível em{" "}
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
                  className="w-full border-2 border-stone-300 px-3 py-2 text-sm focus-visible:border-emerald-800 focus-visible:outline-none resize-y"
                  disabled={publishing}
                />
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
    </div>
  );
}

interface NodeEditorProps {
  node: ReferralNode;
  path: TreePath;
  depth: number;
  onUpdate: (path: TreePath, patch: Partial<ReferralNode>) => void;
  onDelete: (path: TreePath) => void;
  onAddChild: (path: TreePath) => void;
}

const CATEGORY_OPTIONS: { value: ReferralCategory | "none"; label: string }[] = [
  { value: "none", label: "—" },
  { value: "condicao", label: REFERRAL_CATEGORY_LABEL.condicao },
  { value: "sintoma", label: REFERRAL_CATEGORY_LABEL.sintoma },
  { value: "sinal", label: REFERRAL_CATEGORY_LABEL.sinal },
  { value: "exame", label: REFERRAL_CATEGORY_LABEL.exame },
  { value: "achado", label: REFERRAL_CATEGORY_LABEL.achado },
];

function NodeEditor({
  node,
  path,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
}: NodeEditorProps) {
  return (
    <li
      className="border-2 border-stone-300 bg-white"
      style={{ marginLeft: depth > 0 ? `${depth * 16}px` : 0 }}
    >
      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdate(path, { label: e.target.value })}
            placeholder="Rótulo do checkbox"
            className="sm:col-span-9 border-2 border-stone-300 px-3 py-1.5 text-sm focus-visible:border-emerald-800 focus-visible:outline-none"
          />
          <select
            value={node.category ?? "none"}
            onChange={(e) =>
              onUpdate(path, {
                category:
                  e.target.value === "none"
                    ? null
                    : (e.target.value as ReferralCategory),
              })
            }
            className="sm:col-span-3 border-2 border-stone-300 px-2 py-1.5 text-sm focus-visible:border-emerald-800 focus-visible:outline-none"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={node.text_when_checked ?? ""}
          onChange={(e) =>
            onUpdate(path, { text_when_checked: e.target.value })
          }
          rows={1}
          placeholder="Texto inserido na justificativa quando este item for marcado"
          className="w-full border-2 border-stone-300 px-3 py-1.5 text-sm focus-visible:border-emerald-800 focus-visible:outline-none resize-y"
        />

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onAddChild(path)}
            className="inline-flex items-center gap-1 px-2 py-1 border border-stone-300 hover:border-stone-900 text-stone-700 transition-colors"
          >
            <Plus className="size-3" />
            Sub-item
          </button>
          <button
            type="button"
            onClick={() => onDelete(path)}
            className="inline-flex items-center gap-1 px-2 py-1 border border-stone-300 hover:border-destructive hover:text-destructive text-stone-600 transition-colors ml-auto"
          >
            <Trash2 className="size-3" />
            Remover
          </button>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <ul className="space-y-2 px-3 pb-3 pt-0">
          {node.children.map((child, i) => (
            <NodeEditor
              key={child.id}
              node={child}
              path={[...path, i]}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SaveIndicator({
  state,
  savedAt,
}: {
  state: SaveState;
  savedAt: Date | null;
}) {
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
