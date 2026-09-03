"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, ListChecks, PencilLine } from "lucide-react";
import {
  collectCheckedFieldNodes,
  countPendingValues,
  generateJustification,
  valueKey,
} from "@/lib/referral";
import {
  type ReferralData,
  type ReferralField,
  type ReferralNode,
  type ReferralValues,
  REFERRAL_CATEGORY_LABEL,
} from "@/types/domain";
import { trackUsage } from "./track-usage";

interface ReferralViewerProps {
  tenantId: string;
  protocolId: string;
  versionId: string | null;
  data: ReferralData;
}

export function ReferralViewer({
  tenantId,
  protocolId,
  versionId,
  data,
}: ReferralViewerProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<ReferralValues>({});
  const [copied, setCopied] = useState(false);

  // Track open_protocol on mount
  useEffect(() => {
    trackUsage({
      tenantId,
      protocolId,
      versionId,
      action: "open_protocol",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const justification = useMemo(
    () => generateJustification(data, checked, values),
    [data, checked, values],
  );

  // Itens marcados que pedem resultado — renderizados como campos no painel.
  const fieldNodes = useMemo(
    () => collectCheckedFieldNodes(data, checked),
    [data, checked],
  );
  const pendingCount = useMemo(
    () => countPendingValues(data, checked, values),
    [data, checked, values],
  );

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Tracking: cada toggle 'on' conta como click_node (reusando o evento)
        trackUsage({
          tenantId,
          protocolId,
          versionId,
          nodeId: id,
          action: "click_node",
        });
      }
      return next;
    });
  };

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(justification);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      trackUsage({
        tenantId,
        protocolId,
        versionId,
        action: "complete_flow",
      });
    } catch {
      // Fallback: alerta o usuário pra selecionar manualmente
      alert("Selecione e copie o texto manualmente.");
    }
  };

  const totalChecked = checked.size;

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna 1 — Checklist */}
        <section className="lg:col-span-7 lg:order-1 order-2">
          <div className="flex items-center gap-2 mb-4 text-stone-700">
            <ListChecks className="size-5" />
            <p className="font-mono text-xs uppercase tracking-[0.18em]">
              Selecione os achados que se aplicam
            </p>
          </div>

          {data.tree.length > 0 ? (
            <ul className="space-y-2">
              {data.tree.map((node) => (
                <NodeRenderer
                  key={node.id}
                  node={node}
                  depth={0}
                  checked={checked}
                  onToggle={toggle}
                />
              ))}
            </ul>
          ) : (
            <p className="text-stone-500 italic">
              Este protocolo ainda não tem itens publicados.
            </p>
          )}
        </section>

        {/* Coluna 2 — Justificativa em tempo real */}
        <aside className="lg:col-span-5 lg:order-2 order-1 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="bg-[var(--color-caucaia-red)] text-white px-4 py-2 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
              Justificativa pra prontuário
            </p>
            <span className="font-mono text-[11px] tracking-[0.14em] text-white/75">
              {totalChecked} marcado{totalChecked === 1 ? "" : "s"}
            </span>
          </div>

          {/* Campos de resultado dos itens marcados */}
          {fieldNodes.length > 0 && (
            <div className="border-2 border-t-0 border-stone-900 bg-stone-50 px-4 py-4 space-y-4">
              <div className="flex items-center gap-2 text-stone-700">
                <PencilLine className="size-4" />
                <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
                  Preencha os resultados
                </p>
              </div>

              {fieldNodes.map((node) => (
                <div key={node.id} className="space-y-2">
                  <p className="text-sm font-medium text-stone-900 leading-tight">
                    {node.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(node.fields ?? []).map((field) => (
                      <ValueInput
                        key={field.id}
                        field={field}
                        value={values[valueKey(node.id, field.id)] ?? ""}
                        onChange={(v) => setValue(valueKey(node.id, field.id), v)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {pendingCount > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700 leading-relaxed">
                  <AlertTriangle className="size-3.5 shrink-0 mt-px" />
                  {pendingCount} sem valor — a justificativa só inclui o que
                  você preencher.
                </p>
              )}
            </div>
          )}

          <div className="border-2 border-t-0 border-stone-900 bg-white p-5 min-h-[160px]">
            {totalChecked === 0 ? (
              <p className="text-stone-400 italic">
                Marque os achados ao lado para gerar a justificativa
                automaticamente aqui.
              </p>
            ) : (
              <p className="text-stone-950 leading-relaxed whitespace-pre-wrap">
                {justification}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            disabled={totalChecked === 0}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 disabled:text-stone-500 text-stone-50 font-medium h-11 transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copiado para a área de transferência
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar justificativa
              </>
            )}
          </button>

          {pendingCount > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 leading-relaxed">
              <AlertTriangle className="size-3.5 shrink-0 mt-px" />
              Ainda há {pendingCount} resultado
              {pendingCount === 1 ? "" : "s"} sem valor — {pendingCount === 1 ? "ele fica" : "eles ficam"} de fora do texto.
            </p>
          )}

          <p className="mt-3 text-xs text-stone-500 leading-relaxed">
            Cole a justificativa no prontuário. Lembre de revisar antes de
            confirmar — o texto é gerado a partir do que você marcou e pode
            precisar de ajustes contextuais.
          </p>
        </aside>
      </div>
    </div>
  );
}

interface ValueInputProps {
  field: ReferralField;
  value: string;
  onChange: (value: string) => void;
}

function ValueInput({ field, value, onChange }: ValueInputProps) {
  const empty = !value.trim();
  const unit = field.unit?.trim();

  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-stone-600 mb-1">
        {field.label}
        {unit && <span className="text-stone-400"> ({unit})</span>}
      </span>
      <input
        type={field.type === "data" ? "date" : "text"}
        inputMode={field.type === "numero" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? (unit ? `— ${unit}` : "—")}
        className={`w-full border-2 px-3 h-10 text-sm bg-white focus-visible:border-emerald-800 focus-visible:outline-none ${
          empty ? "border-amber-400" : "border-stone-900"
        }`}
      />
    </label>
  );
}

interface NodeRendererProps {
  node: ReferralNode;
  depth: number;
  checked: Set<string>;
  onToggle: (id: string) => void;
}

function NodeRenderer({ node, depth, checked, onToggle }: NodeRendererProps) {
  const isChecked = checked.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const fieldCount = node.fields?.length ?? 0;

  return (
    <li
      className="border-2 border-stone-300 bg-white"
      style={{ marginLeft: depth > 0 ? `${depth * 14}px` : 0 }}
    >
      <label
        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer ${
          isChecked ? "bg-emerald-50" : "hover:bg-stone-50"
        } transition-colors`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(node.id)}
          className="mt-1 size-4 accent-emerald-800 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p
              className={`font-medium leading-tight ${isChecked ? "text-emerald-950" : "text-stone-950"}`}
            >
              {node.label}
            </p>
            {node.category && (
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                  isChecked ? "text-emerald-700" : "text-stone-500"
                }`}
              >
                {REFERRAL_CATEGORY_LABEL[node.category]}
              </span>
            )}
            {fieldCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                  isChecked ? "text-emerald-700" : "text-stone-500"
                }`}
              >
                <PencilLine className="size-3" />
                {fieldCount === 1
                  ? "pede resultado"
                  : `${fieldCount} resultados`}
              </span>
            )}
          </div>
        </div>
      </label>
      {hasChildren && (
        <ul className="space-y-2 px-3 pb-3 pt-0">
          {node.children!.map((child) => (
            <NodeRenderer
              key={child.id}
              node={child}
              depth={depth + 1}
              checked={checked}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
