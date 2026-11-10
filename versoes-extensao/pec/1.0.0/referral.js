/**
 * Gerador de justificativa e risco — PORTE em JS puro de `lib/referral.ts`.
 * O texto que a extensão escreve no PEC tem de ser idêntico ao do
 * visualizador público. Ao mudar lib/referral.ts, mude aqui também e rode
 * `pnpm test:extension`.
 */
(function (global) {
  "use strict";

  const EMPTY_VALUE_PLACEHOLDER = "___";
  const RISKS = ["eletivo", "prioritario", "urgencia", "emergencia"];

  function valueKey(nodeId, fieldId) {
    return nodeId + "::" + fieldId;
  }

  function formatFieldValue(field, raw) {
    const value = raw.trim();
    if (!value) return EMPTY_VALUE_PLACEHOLDER;
    if (field.type === "data") {
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (iso) return iso[3] + "/" + iso[2] + "/" + iso[1];
    }
    return value;
  }

  function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function tokenRegExp(key) {
    return new RegExp("\\{\\s*" + escapeRegExp(key) + "\\s*\\}", "gi");
  }

  function hasFieldToken(text, key) {
    return tokenRegExp(key).test(text || "");
  }

  function renderNodeText(node, values) {
    const original = (node.text_when_checked || "").trim();
    if (!original) return "";

    let text = original;
    const appended = [];
    let hasAppendableField = false;

    for (const field of node.fields || []) {
      const raw = (values[valueKey(node.id, field.id)] || "").trim();

      if (hasFieldToken(original, field.key)) {
        text = text.replace(
          tokenRegExp(field.key),
          raw ? formatFieldValue(field, raw) : EMPTY_VALUE_PLACEHOLDER,
        );
        continue;
      }

      hasAppendableField = true;
      if (!raw) continue;
      const unit = field.unit ? field.unit.trim() : "";
      const sep = unit && /^[%°]/.test(unit) ? "" : " ";
      appended.push(
        field.label + " " + formatFieldValue(field, raw) + (unit ? sep + unit : ""),
      );
    }

    const isList = original.endsWith(":");

    if (appended.length === 0) {
      return isList && hasAppendableField ? "" : text;
    }

    return isList
      ? text + " " + appended.join("; ")
      : text + " (" + appended.join("; ") + ")";
  }

  function generateJustification(data, checkedIds, values) {
    values = values || {};
    const fragments = [];

    (function walk(nodes) {
      for (const n of nodes) {
        if (checkedIds.has(n.id)) {
          const text = renderNodeText(n, values);
          if (text) fragments.push(text);
        }
        if (n.children && n.children.length > 0) walk(n.children);
      }
    })(data.tree);

    const body =
      fragments.length > 0
        ? fragments.join("; ").replace(/\s*[.;]\s*$/, "") + "."
        : "";

    const parts = [
      (data.introduction || "").trim(),
      body,
      (data.closing || "").trim(),
    ].filter(Boolean);

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // Espelha nodeRisk() de lib/referral.ts.
  const RISK_EMOJI = [
    [/\u{1F534}/u, "emergencia"],
    [/[\u{1F7E1}\u{1F7E0}]/u, "urgencia"],
    [/\u{1F7E2}/u, "prioritario"],
    [/\u{1F535}/u, "eletivo"],
  ];

  function nodeRisk(node) {
    if (node.risk) return node.risk;
    for (const [re, risk] of RISK_EMOJI) {
      if (re.test(node.label || "")) return risk;
    }
    return null;
  }

  function computeRisk(tree, checkedIds) {
    let max = -1;
    (function walk(nodes) {
      for (const n of nodes) {
        const risk = checkedIds.has(n.id) ? nodeRisk(n) : null;
        if (risk) max = Math.max(max, RISKS.indexOf(risk));
        if (n.children) walk(n.children);
      }
    })(tree);
    return max >= 0 ? RISKS[max] : null;
  }

  global.ViaSusReferral = {
    RISKS,
    valueKey,
    renderNodeText,
    nodeRisk,
    generateJustification,
    computeRisk,
  };
})(globalThis);
