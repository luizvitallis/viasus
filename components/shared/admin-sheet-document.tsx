import {
  ADMIN_ITEM_ACTION_LABEL,
  ADMIN_SHEET_LAYOUT_LABEL,
  type AdminItem,
  type AdminSheet,
} from "@/types/domain";
import { itemNumbers } from "@/lib/admin-sheet";

interface AdminSheetDocumentProps {
  title: string;
  sheet: AdminSheet;
  versionNumber?: number | null;
  /** ISO da publicação (ou do último salvamento, no editor). */
  updatedAt?: string | null;
}

const MONO = "font-mono uppercase tracking-[0.16em]";

/**
 * Ficha de Fluxo Administrativo — inspirada nos modelos de requisição
 * impressos: cabeçalho, quem pode encaminhar, itens numerados por bloco com a
 * ação (levar/anexar) ou etapas numeradas do atendimento, orientação,
 * referência e quadro de atenção. Sem estado: serve ao visualizador público e
 * à pré-visualização do editor.
 */
export function AdminSheetDocument({
  title,
  sheet,
  versionNumber,
  updatedAt,
}: AdminSheetDocumentProps) {
  const nums = itemNumbers(sheet);
  const items = new Map(sheet.sections.flatMap((s) => s.items).map((it) => [it.id, it]));
  const isSteps = sheet.layout === "etapas";
  const sections = sheet.sections.filter((s) => s.items.length > 0);

  return (
    <article className="text-stone-900">
      <div className="flex items-center gap-3 mb-3.5">
        {versionNumber != null && (
          <span className="border-[1.5px] border-stone-900 px-1.5 font-mono text-[11px] tracking-[0.08em]">
            v{versionNumber}
          </span>
        )}
        <span className={`${MONO} text-[10.5px] text-stone-500`}>
          Fluxo administrativo{sheet.kicker?.trim() ? ` · ${sheet.kicker.trim()}` : ""}
        </span>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-3.5">
        <div className="min-w-0">
          <p className={`${MONO} text-[10.5px] text-emerald-800`}>
            {isSteps ? "Etapas do atendimento" : "Modelo de solicitação"}
          </p>
          <h1 className="mt-1 font-sans font-bold uppercase leading-none tracking-tight text-[1.9rem] sm:text-[2.5rem] text-stone-950 break-words">
            {title}
          </h1>
          <div className="mt-2 h-1 w-14 bg-emerald-800" />
        </div>
        {sheet.subtitle?.trim() && (
          <p className="max-w-xs text-sm text-stone-700 sm:text-right">{sheet.subtitle.trim()}</p>
        )}
      </header>

      <div className="border-2 border-stone-900 bg-white px-4 py-4 sm:px-5">
        {(sheet.who?.trim() || sheet.tag?.trim()) && (
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3 sm:gap-6 pb-3.5">
            {sheet.who?.trim() ? (
              <Field label={isSteps ? "Quem atende" : "Quem pode encaminhar"} value={sheet.who.trim()} />
            ) : (
              <span />
            )}
            {sheet.tag?.trim() && (
              <span className={`self-start sm:justify-self-end bg-emerald-800 text-stone-50 px-2.5 py-1 ${MONO} text-[10.5px] tracking-[0.14em]`}>
                {sheet.tag.trim()}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between border-y border-stone-300 py-1.5 mt-1">
          <span className={`${MONO} text-[10.5px] text-stone-500`}>
            {ADMIN_SHEET_LAYOUT_LABEL[sheet.layout]} · {isSteps ? "quem faz o quê" : "o que fazer"}
          </span>
          <span className={`${MONO} text-[10.5px] text-stone-500`}>
            {isSteps ? "" : "Ação"}
          </span>
        </div>

        {sections.length === 0 ? (
          <p className="py-6 text-sm text-stone-400 italic">Nenhum item ainda.</p>
        ) : (
          sections.map((s) => (
            <section key={s.id} className="mt-3">
              {(sections.length > 1 || !isSteps) && s.title.trim() && (
                <h2 className={`${MONO} text-[9.5px] text-emerald-800`}>{s.title.trim()}</h2>
              )}
              <ol className="mt-1">
                {s.items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    n={nums.get(it.id) ?? 0}
                    nums={nums}
                    items={items}
                  />
                ))}
              </ol>
            </section>
          ))
        )}

        {sheet.note?.trim() && (
          <p className="mt-4 border-l-[3px] border-emerald-800 pl-3 py-1 text-[13px] text-stone-800 whitespace-pre-line">
            <strong>Orientação.</strong> {sheet.note.trim()}
          </p>
        )}

        {(sheet.reference?.trim() || updatedAt) && (
          <div className="mt-4 pt-2.5 border-t border-stone-300 flex flex-wrap justify-between gap-4">
            {sheet.reference?.trim() ? (
              <Field label="Referência" value={sheet.reference.trim()} small />
            ) : (
              <span />
            )}
            {updatedAt && (
              <Field
                label="Atualizado em"
                value={new Date(updatedAt).toLocaleDateString("pt-BR")}
                small
              />
            )}
          </div>
        )}
      </div>

      {sheet.alert?.trim() && (
        <div className="mt-3 border-l-4 border-red-700 bg-red-50 px-4 py-2.5 print:border print:border-red-700">
          <p className={`${MONO} text-[9.5px] text-red-700`}>
            {isSteps ? "Atenção" : "Atenção · Não encaminhar"}
          </p>
          <p className="mt-1 text-[13px] text-stone-700 whitespace-pre-line">{sheet.alert.trim()}</p>
        </div>
      )}
    </article>
  );
}

function Field({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`${MONO} text-[9.5px] text-stone-500 mb-0.5`}>{label}</p>
      <p className={`border-b border-stone-300 pb-1 font-medium ${small ? "text-[12.5px]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

interface ItemRowProps {
  item: AdminItem;
  n: number;
  nums: Map<string, number>;
  items: Map<string, AdminItem>;
}

function ItemRow({ item, n, nums, items }: ItemRowProps) {
  const branches = (item.branches ?? []).filter((b) => items.has(b.target_id));
  return (
    <li
      id={`item-${item.id}`}
      className="grid grid-cols-[1.6rem_1fr_auto] gap-x-2.5 gap-y-1 items-baseline py-1.5 border-b border-dashed border-stone-200 scroll-mt-20"
    >
      <span className="font-mono font-semibold text-[13px] text-emerald-800">{n}</span>
      <div className="min-w-0">
        <p>
          <span className="font-semibold">{item.label.trim() || "—"}</span>
          {item.note?.trim() && (
            <span className="text-[12.5px] text-stone-500"> · {item.note.trim()}</span>
          )}
        </p>
        {item.responsible?.trim() && (
          <p className={`${MONO} text-[10px] tracking-[0.12em] text-stone-600 mt-0.5`}>
            Responsável · {item.responsible.trim()}
          </p>
        )}
        {branches.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {branches.map((b) => {
              const target = items.get(b.target_id)!;
              return (
                <li key={b.id} className="text-[12.5px] text-stone-700">
                  {b.label.trim() ? <>Se <strong>{b.label.trim()}</strong> → </> : "Segue para "}
                  <a href={`#item-${target.id}`} className="font-medium text-emerald-800 hover:underline">
                    {nums.get(target.id)} · {target.label.trim()}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {(item.action || item.code?.trim()) && (
        <div className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end">
          {item.code?.trim() && (
            <span className="font-mono text-[11px] text-stone-500">{item.code.trim()}</span>
          )}
          {item.action && (
            <span
              className={`border px-1.5 py-0.5 ${MONO} text-[10px] tracking-[0.1em] whitespace-nowrap ${
                item.action === "levar"
                  ? "border-stone-400 text-stone-700"
                  : "border-emerald-800 text-emerald-800 bg-emerald-50"
              }`}
            >
              {ADMIN_ITEM_ACTION_LABEL[item.action]}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
