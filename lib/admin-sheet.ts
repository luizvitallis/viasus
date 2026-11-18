import {
  ADMIN_ITEM_ACTION_LABEL,
  type AdminItem,
  type AdminSection,
  type AdminSheet,
  type AdminSheetLayout,
} from "@/types/domain";

export function emptyAdminSheet(layout: AdminSheetLayout = "requisitos"): AdminSheet {
  return layout === "requisitos"
    ? {
        layout,
        who: "",
        sections: [
          newAdminSection("Documentos do paciente"),
          newAdminSection("Impressos e termos necessários"),
          newAdminSection("Exames e laudos necessários"),
        ],
      }
    : { layout, sections: [newAdminSection("Etapas")] };
}

export function newAdminSection(title = ""): AdminSection {
  return { id: crypto.randomUUID(), title, items: [] };
}

export function newAdminItem(layout: AdminSheetLayout): AdminItem {
  return {
    id: crypto.randomUUID(),
    label: "",
    action: layout === "requisitos" ? "levar" : null,
  };
}

/** Numeração contínua entre blocos (1, 2, 3… como na ficha impressa). */
export function itemNumbers(sheet: AdminSheet): Map<string, number> {
  const map = new Map<string, number>();
  let n = 0;
  for (const s of sheet.sections) for (const it of s.items) map.set(it.id, ++n);
  return map;
}

export function countAdminItems(sheet: AdminSheet): number {
  return sheet.sections.reduce((acc, s) => acc + s.items.length, 0);
}

/** Ficha publicável: ao menos um item com rótulo. */
export function hasAdminContent(sheet: AdminSheet | null | undefined): boolean {
  return !!sheet?.sections.some((s) => s.items.some((it) => it.label.trim()));
}

/** Texto simples da ficha, para o botão "Copiar lista". */
export function adminSheetToText(title: string, sheet: AdminSheet): string {
  const nums = itemNumbers(sheet);
  const byId = new Map(sheet.sections.flatMap((s) => s.items).map((it) => [it.id, it]));
  const lines: string[] = [title.toUpperCase()];
  if (sheet.who?.trim()) lines.push(`Quem pode encaminhar: ${sheet.who.trim()}`);
  for (const s of sheet.sections) {
    if (!s.items.length) continue;
    lines.push("", s.title.trim() || "Itens");
    for (const it of s.items) {
      const extras = [
        it.responsible?.trim() ? `responsável: ${it.responsible.trim()}` : "",
        it.action ? ADMIN_ITEM_ACTION_LABEL[it.action].toLowerCase() : "",
        it.code?.trim() ? `SIGTAP ${it.code.trim()}` : "",
      ].filter(Boolean);
      const note = it.note?.trim() ? ` — ${it.note.trim()}` : "";
      lines.push(
        `${nums.get(it.id)}. ${it.label.trim()}${note}${extras.length ? ` (${extras.join("; ")})` : ""}`,
      );
      for (const b of it.branches ?? []) {
        const target = byId.get(b.target_id);
        if (!target) continue;
        const cond = b.label.trim() ? `Se ${b.label.trim()}: ` : "";
        lines.push(`   ${cond}segue para ${nums.get(target.id)}. ${target.label.trim()}`);
      }
    }
  }
  if (sheet.note?.trim()) lines.push("", `Orientação: ${sheet.note.trim()}`);
  if (sheet.alert?.trim()) lines.push("", `Atenção: ${sheet.alert.trim()}`);
  if (sheet.reference?.trim()) lines.push("", `Referência: ${sheet.reference.trim()}`);
  return lines.join("\n");
}
