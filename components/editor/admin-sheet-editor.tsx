"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  CornerDownRight,
  ExternalLink,
  EyeOff,
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
  saveAdminData,
} from "@/app/admin/protocolos/[id]/editar/actions";
import { unpublishProtocolAction } from "@/app/admin/protocolos/actions";
import { AdminSheetDocument } from "@/components/shared/admin-sheet-document";
import {
  countAdminItems,
  emptyAdminSheet,
  itemNumbers,
  newAdminItem,
  newAdminSection,
} from "@/lib/admin-sheet";
import {
  ADMIN_ITEM_ACTIONS,
  ADMIN_ITEM_ACTION_LABEL,
  ADMIN_SHEET_LAYOUT_LABEL,
  PROTOCOL_STATUS_LABEL,
  type AdminItem,
  type AdminItemAction,
  type AdminSection,
  type AdminSheet,
  type AdminSheetLayout,
} from "@/types/domain";

interface AdminSheetEditorProps {
  protocolId: string;
  protocolMeta: {
    title: string;
    status: string;
    slug: string;
  };
  tenantSubdomain: string;
  userRole: string;
  initialData: AdminSheet | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const INPUT =
  "w-full border-2 border-stone-300 px-3 py-1.5 text-sm focus-visible:border-emerald-800 focus-visible:outline-none";
const LABEL = "block font-mono text-[11px] uppercase tracking-[0.18em] text-stone-700 mb-1";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

export function AdminSheetEditor({
  protocolId,
  protocolMeta,
  tenantSubdomain,
  userRole,
  initialData,
}: AdminSheetEditorProps) {
  const canPublish = ["gestor", "publicador", "admin"].includes(userRole);

  const [sheet, setSheet] = useState<AdminSheet>(initialData ?? emptyAdminSheet());
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

  // Auto-save 800ms após última mudança
  useEffect(() => {
    if (saveState !== "dirty") return;
    const timeout = setTimeout(async () => {
      setSaveState("saving");
      const result = await saveAdminData({ protocolId, data: sheet });
      if (result.ok) {
        setSaveState("saved");
        setSavedAt(new Date(result.savedAt!));
      } else {
        setSaveState("error");
        toast.error(result.error ?? "Erro ao salvar");
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [dirtyTick, saveState, protocolId, sheet]);

  const change = useCallback((fn: (s: AdminSheet) => AdminSheet) => {
    setSheet(fn);
    if (!hydrated.current) return;
    setSaveState("dirty");
    setDirtyTick((t) => t + 1);
  }, []);

  const setField = (key: keyof AdminSheet, value: string) =>
    change((s) => ({ ...s, [key]: value }));

  const setLayout = (layout: AdminSheetLayout) => change((s) => ({ ...s, layout }));

  const patchSection = (sid: string, fn: (sec: AdminSection) => AdminSection) =>
    change((s) => ({ ...s, sections: s.sections.map((sec) => (sec.id === sid ? fn(sec) : sec)) }));

  const patchItem = (sid: string, iid: string, patch: Partial<AdminItem>) =>
    patchSection(sid, (sec) => ({
      ...sec,
      items: sec.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)),
    }));

  const removeItem = (sid: string, iid: string) =>
    change((s) => ({
      ...s,
      sections: s.sections.map((sec) => ({
        ...sec,
        // Some com o item e com os desvios que apontavam para ele
        items: sec.items
          .filter((it) => it.id !== iid)
          .map((it) =>
            it.branches?.some((b) => b.target_id === iid)
              ? { ...it, branches: it.branches.filter((b) => b.target_id !== iid) }
              : it,
          ),
      })),
    }));

  const removeSection = (sid: string) => {
    const sec = sheet.sections.find((x) => x.id === sid);
    if (sec?.items.length && !confirm(`Remover o bloco "${sec.title || "sem título"}" e seus ${sec.items.length} item(ns)?`)) return;
    const gone = new Set(sec?.items.map((it) => it.id));
    change((s) => ({
      ...s,
      sections: s.sections
        .filter((x) => x.id !== sid)
        .map((x) => ({
          ...x,
          items: x.items.map((it) =>
            it.branches?.some((b) => gone.has(b.target_id))
              ? { ...it, branches: it.branches.filter((b) => !gone.has(b.target_id)) }
              : it,
          ),
        })),
    }));
  };

  const totalItems = countAdminItems(sheet);
  const nums = itemNumbers(sheet);
  const allItems = sheet.sections.flatMap((s) => s.items);
  const isSteps = sheet.layout === "etapas";

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    const result = await publishProtocol({ protocolId, changeNote: changeNote || undefined });
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

  const handleUnpublish = useCallback(async () => {
    if (
      !confirm(
        "Despublicar este protocolo?\n\nEle sai da leitura pública imediatamente e volta a ser rascunho. O histórico de versões é preservado; publicar de novo gera uma nova versão.",
      )
    )
      return;
    setPublishing(true);
    const result = await unpublishProtocolAction(protocolId);
    setPublishing(false);
    if (result.ok) {
      toast.success("Protocolo despublicado. Agora é rascunho.");
      setCurrentStatus("draft");
    } else {
      toast.error(result.error ?? "Erro ao despublicar");
    }
  }, [protocolId]);

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
              Fluxo administrativo · ficha
            </p>
            <h1 className="font-medium text-stone-950 truncate text-sm">{protocolMeta.title}</h1>
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
          {canPublish && currentStatus === "published" && (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 border-2 border-stone-300 hover:border-stone-900 text-stone-700 hover:text-stone-900 font-medium px-3 h-9 transition-colors disabled:opacity-50"
              title="Tirar da leitura pública e voltar a rascunho"
            >
              <EyeOff className="size-3.5" />
              Despublicar
            </button>
          )}
          {canPublish && (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              disabled={saveState === "dirty" || saveState === "saving" || totalItems === 0}
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
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">Edição</p>
            <h2 className="font-serif font-semibold text-2xl text-stone-950">Ficha do fluxo administrativo</h2>
            <p className="text-sm text-stone-600 mt-1">
              Os itens são numerados em sequência entre os blocos. Campos vazios não aparecem na ficha.
            </p>
          </div>

          {/* Formato */}
          <fieldset>
            <legend className={LABEL}>Formato</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["requisitos", "etapas"] as AdminSheetLayout[]).map((l) => (
                <label
                  key={l}
                  className={`border-2 px-3 py-2 cursor-pointer text-sm ${sheet.layout === l ? "border-emerald-800 bg-emerald-50" : "border-stone-300 bg-white"}`}
                >
                  <input
                    type="radio"
                    name="layout"
                    className="sr-only"
                    checked={sheet.layout === l}
                    onChange={() => setLayout(l)}
                  />
                  <span className="font-medium">{ADMIN_SHEET_LAYOUT_LABEL[l]}</span>
                  <span className="block text-xs text-stone-500">
                    {l === "requisitos" ? "O que levar e anexar, por bloco" : "Passos numerados, responsável e desvios"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Cabeçalho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="kicker">Complemento do cabeçalho</label>
              <input id="kicker" className={INPUT} value={sheet.kicker ?? ""} onChange={(e) => setField("kicker", e.target.value)} placeholder="Consulta especializada" />
            </div>
            <div>
              <label className={LABEL} htmlFor="tag">Etiqueta em destaque</label>
              <input id="tag" className={INPUT} value={sheet.tag ?? ""} onChange={(e) => setField("tag", e.target.value)} placeholder="Regulação · SISREG" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="subtitle">Frase de apoio</label>
              <input id="subtitle" className={INPUT} value={sheet.subtitle ?? ""} onChange={(e) => setField("subtitle", e.target.value)} placeholder="O que o usuário precisa levar para ser encaminhado." />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="who">{isSteps ? "Quem atende" : "Quem pode encaminhar"}</label>
              <input id="who" className={INPUT} value={sheet.who ?? ""} onChange={(e) => setField("who", e.target.value)} placeholder={isSteps ? "Equipe do SAE" : "Médico e Enfermeiro"} />
            </div>
          </div>

          {/* Blocos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={LABEL}>Blocos · {totalItems} item(ns)</span>
              <button
                type="button"
                onClick={() => change((s) => ({ ...s, sections: [...s.sections, newAdminSection()] }))}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900"
              >
                <Plus className="size-3.5" />
                Adicionar bloco
              </button>
            </div>

            {sheet.sections.map((sec, si) => (
              <div key={sec.id} className="border-2 border-stone-300 bg-white">
                <div className="flex items-center gap-2 border-b-2 border-stone-200 bg-stone-50 px-3 py-2">
                  <input
                    aria-label="Título do bloco"
                    value={sec.title}
                    onChange={(e) => patchSection(sec.id, (x) => ({ ...x, title: e.target.value }))}
                    placeholder="Título do bloco (ex.: Documentos do paciente)"
                    className="flex-1 min-w-0 bg-transparent border-b-2 border-transparent focus-visible:border-emerald-800 focus-visible:outline-none font-mono text-xs uppercase tracking-[0.14em] text-emerald-900 py-1"
                  />
                  <IconBtn title="Subir bloco" onClick={() => change((s) => ({ ...s, sections: move(s.sections, si, si - 1) }))} disabled={si === 0}><ArrowUp className="size-3.5" /></IconBtn>
                  <IconBtn title="Descer bloco" onClick={() => change((s) => ({ ...s, sections: move(s.sections, si, si + 1) }))} disabled={si === sheet.sections.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
                  <IconBtn title="Remover bloco" onClick={() => removeSection(sec.id)} danger><Trash2 className="size-3.5" /></IconBtn>
                </div>

                <ul className="divide-y divide-stone-200">
                  {sec.items.map((it, ii) => (
                    <li key={it.id} className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-semibold text-sm text-emerald-800 w-6 pt-1.5 shrink-0">{nums.get(it.id)}</span>
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            aria-label="Item"
                            value={it.label}
                            onChange={(e) => patchItem(sec.id, it.id, { label: e.target.value })}
                            placeholder={isSteps ? "Etapa (ex.: Recepção/Cadastro)" : "Item (ex.: Cartão SUS)"}
                            className={`${INPUT} sm:col-span-7 font-medium`}
                          />
                          {isSteps ? (
                            <input
                              aria-label="Responsável"
                              value={it.responsible ?? ""}
                              onChange={(e) => patchItem(sec.id, it.id, { responsible: e.target.value })}
                              placeholder="Responsável"
                              className={`${INPUT} sm:col-span-5`}
                            />
                          ) : (
                            <select
                              aria-label="Ação"
                              value={it.action ?? "none"}
                              onChange={(e) =>
                                patchItem(sec.id, it.id, {
                                  action: e.target.value === "none" ? null : (e.target.value as AdminItemAction),
                                })
                              }
                              className={`${INPUT} sm:col-span-5 px-2`}
                            >
                              <option value="none">Ação: —</option>
                              {ADMIN_ITEM_ACTIONS.map((a) => (
                                <option key={a} value={a}>{ADMIN_ITEM_ACTION_LABEL[a]}</option>
                              ))}
                            </select>
                          )}
                          <input
                            aria-label="Observação"
                            value={it.note ?? ""}
                            onChange={(e) => patchItem(sec.id, it.id, { note: e.target.value })}
                            placeholder="Observação (opcional)"
                            className={`${INPUT} sm:col-span-9 text-stone-600`}
                          />
                          <input
                            aria-label="Código SIGTAP"
                            value={it.code ?? ""}
                            onChange={(e) => patchItem(sec.id, it.id, { code: e.target.value })}
                            placeholder="SIGTAP"
                            className={`${INPUT} sm:col-span-3 font-mono text-xs`}
                          />
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <IconBtn title="Subir" onClick={() => patchSection(sec.id, (x) => ({ ...x, items: move(x.items, ii, ii - 1) }))} disabled={ii === 0}><ArrowUp className="size-3" /></IconBtn>
                          <IconBtn title="Descer" onClick={() => patchSection(sec.id, (x) => ({ ...x, items: move(x.items, ii, ii + 1) }))} disabled={ii === sec.items.length - 1}><ArrowDown className="size-3" /></IconBtn>
                          <IconBtn title="Remover item" onClick={() => removeItem(sec.id, it.id)} danger><Trash2 className="size-3" /></IconBtn>
                        </div>
                      </div>

                      {isSteps && (
                        <BranchesEditor
                          item={it}
                          candidates={allItems.filter((x) => x.id !== it.id)}
                          nums={nums}
                          onChange={(branches) => patchItem(sec.id, it.id, { branches })}
                        />
                      )}
                    </li>
                  ))}
                </ul>

                <div className="px-3 py-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => patchSection(sec.id, (x) => ({ ...x, items: [...x.items, newAdminItem(sheet.layout)] }))}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900"
                  >
                    <Plus className="size-3.5" />
                    {isSteps ? "Adicionar etapa" : "Adicionar item"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé da ficha */}
          <div className="space-y-3">
            <div>
              <label className={LABEL} htmlFor="note">Orientação</label>
              <textarea id="note" rows={2} className={`${INPUT} resize-y`} value={sheet.note ?? ""} onChange={(e) => setField("note", e.target.value)} placeholder="Prazo, local de entrega, observação para a recepção…" />
            </div>
            <div>
              <label className={LABEL} htmlFor="alert">{isSteps ? "Atenção" : "Atenção · não encaminhar"}</label>
              <textarea id="alert" rows={2} className={`${INPUT} resize-y`} value={sheet.alert ?? ""} onChange={(e) => setField("alert", e.target.value)} placeholder="Situações em que não se deve encaminhar, ou que vão para outro serviço." />
            </div>
            <div>
              <label className={LABEL} htmlFor="reference">Referência</label>
              <input id="reference" className={INPUT} value={sheet.reference ?? ""} onChange={(e) => setField("reference", e.target.value)} placeholder="Protocolo de regulação SMS Caucaia, 2026" />
            </div>
          </div>
        </section>

        {/* Coluna 2 — Preview */}
        <section className="lg:overflow-y-auto px-6 py-8 bg-stone-100">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-4">
            Pré-visualização · como aparece no site
          </p>
          <AdminSheetDocument title={protocolMeta.title} sheet={sheet} updatedAt={savedAt?.toISOString() ?? null} />
        </section>
      </main>

      {/* Modal de publicar */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4"
          onClick={() => !publishing && setShowPublishModal(false)}
        >
          <div className="bg-white border-2 border-stone-900 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-stone-900 px-5 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">Publicar protocolo</p>
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
                Esta ação cria uma versão imutável da ficha atual e torna o protocolo visível em{" "}
                <code className="font-mono text-sm bg-stone-100 px-1.5 py-0.5">
                  /{tenantSubdomain}/protocolos/{protocolMeta.slug}
                </code>
                .
              </p>
              <div className="space-y-2">
                <label htmlFor="change-note" className="text-sm font-medium text-stone-900">
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

interface BranchesEditorProps {
  item: AdminItem;
  candidates: AdminItem[];
  nums: Map<string, number>;
  onChange: (branches: NonNullable<AdminItem["branches"]>) => void;
}

function BranchesEditor({ item, candidates, nums, onChange }: BranchesEditorProps) {
  const branches = item.branches ?? [];
  return (
    <div className="ml-8 space-y-1.5">
      {branches.map((b) => (
        <div key={b.id} className="flex items-center gap-2">
          <CornerDownRight className="size-3.5 text-stone-400 shrink-0" />
          <input
            aria-label="Condição"
            value={b.label}
            onChange={(e) => onChange(branches.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)))}
            placeholder="Se… (opcional)"
            className={`${INPUT} py-1 text-xs flex-1 min-w-0`}
          />
          <select
            aria-label="Vai para a etapa"
            value={b.target_id}
            onChange={(e) => onChange(branches.map((x) => (x.id === b.id ? { ...x, target_id: e.target.value } : x)))}
            className={`${INPUT} py-1 px-2 text-xs w-48 shrink-0`}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {nums.get(c.id)} · {c.label.trim() || "—"}
              </option>
            ))}
          </select>
          <IconBtn title="Remover desvio" onClick={() => onChange(branches.filter((x) => x.id !== b.id))} danger>
            <X className="size-3" />
          </IconBtn>
        </div>
      ))}
      {candidates.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([...branches, { id: crypto.randomUUID(), label: "", target_id: candidates[0].id }])}
          className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-emerald-800"
        >
          <CornerDownRight className="size-3" />
          Adicionar desvio para outra etapa
        </button>
      )}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center size-6 border border-stone-300 text-stone-600 transition-colors disabled:opacity-30 ${danger ? "hover:border-destructive hover:text-destructive" : "hover:border-stone-900 hover:text-stone-900"}`}
    >
      {children}
    </button>
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
    return <span className="inline-flex items-center gap-1.5 text-sm text-stone-500 font-mono">Mudanças não salvas</span>;
  }
  return null;
}
