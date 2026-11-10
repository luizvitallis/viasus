/**
 * Painel lateral da extensão, desenhado dentro de um Shadow DOM para não
 * herdar nem vazar CSS do PEC. O checklist é montado uma vez por protocolo
 * (assim os campos de resultado não perdem o foco a cada clique); só o
 * resumo (risco, status do motivo) é redesenhado.
 */
(function (global) {
  "use strict";

  const RISK_LABEL = {
    eletivo: "Eletivo",
    prioritario: "Prioritário",
    urgencia: "Urgência",
    emergencia: "Emergência",
  };
  const RISK_COLOR = {
    eletivo: "Azul",
    prioritario: "Verde",
    urgencia: "Amarelo",
    emergencia: "Vermelho",
  };
  const CATEGORY_LABEL = {
    condicao: "Condição",
    sinal: "Sinal",
    sintoma: "Sintoma",
    exame: "Exame",
    achado: "Achado",
  };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .panel {
      position: fixed; top: 72px; right: 12px; z-index: 2147483000;
      width: 380px; max-height: calc(100vh - 96px);
      display: flex; flex-direction: column;
      background: #fafaf9; color: #1c1917;
      border: 2px solid #1c1917;
      font: 14px/1.4 "IBM Plex Sans", "Segoe UI", Arial, sans-serif;
      box-shadow: 0 8px 24px rgba(28,25,23,.18);
    }
    .head {
      display: flex; align-items: center; gap: 8px;
      background: #064e3b; color: #fafaf9; padding: 8px 12px;
    }
    .head .kicker { font: 11px/1.2 "IBM Plex Mono", Consolas, monospace; text-transform: uppercase; letter-spacing: .16em; flex: 1; }
    .head button { all: unset; cursor: pointer; padding: 2px 6px; font: 16px/1 Arial, sans-serif; color: #fafaf9; }
    .head button:hover { background: rgba(255,255,255,.15); }
    .title { padding: 10px 12px 8px; border-bottom: 2px solid #1c1917; background: #fff; }
    .title h2 { margin: 0; font: 600 16px/1.25 "IBM Plex Serif", Georgia, serif; }
    .title .meta { margin-top: 2px; font: 11px/1.3 "IBM Plex Mono", Consolas, monospace; color: #78716c; }
    .title a { color: #065f46; }
    .summary { padding: 10px 12px; border-bottom: 2px solid #1c1917; background: #fff; display: grid; gap: 8px; }
    .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .label { font: 11px/1.2 "IBM Plex Mono", Consolas, monospace; text-transform: uppercase; letter-spacing: .14em; color: #44403c; }
    .muted { color: #78716c; font-size: 12px; }
    .ok { color: #065f46; font-size: 12px; }
    .warn { color: #92400e; font-size: 12px; }
    .alert { display: flex; gap: 6px; padding: 8px; border: 2px solid #b91c1c; background: #fef2f2; color: #991b1b; font-size: 13px; }
    .badge { display: inline-block; padding: 1px 6px; border: 1px solid; font: 10px/1.5 "IBM Plex Mono", Consolas, monospace; text-transform: uppercase; letter-spacing: .12em; }
    .r-eletivo { border-color: #0369a1; color: #075985; background: #f0f9ff; }
    .r-prioritario { border-color: #047857; color: #065f46; background: #ecfdf5; }
    .r-urgencia { border-color: #f59e0b; color: #78350f; background: #fffbeb; }
    .r-emergencia { border-color: #b91c1c; color: #991b1b; background: #fef2f2; }
    .btn { all: unset; cursor: pointer; padding: 4px 8px; border: 2px solid #d6d3d1; font-size: 12px; color: #44403c; background: #fff; }
    .btn:hover { border-color: #1c1917; color: #1c1917; }
    .btn.primary { background: #065f46; border-color: #065f46; color: #fafaf9; }
    .btn.primary:hover { background: #064e3b; border-color: #064e3b; }
    .list { overflow-y: auto; padding: 10px 12px 12px; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    li > ul { margin-top: 6px; }
    .item { border: 2px solid #d6d3d1; background: #fff; }
    .item.on { border-color: #047857; }
    .item > label { display: flex; gap: 8px; align-items: flex-start; padding: 7px 8px; cursor: pointer; }
    .item.on > label { background: #ecfdf5; }
    .item input[type=checkbox] { margin: 2px 0 0; width: 16px; height: 16px; accent-color: #065f46; flex: none; }
    .item .lbl { font-weight: 500; }
    .item .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px; align-items: center; }
    .cat { font: 10px/1.2 "IBM Plex Mono", Consolas, monospace; text-transform: uppercase; letter-spacing: .12em; color: #78716c; }
    .fields { display: none; padding: 0 8px 8px 32px; gap: 6px; }
    .item.on > .fields { display: grid; }
    .fields label { display: grid; gap: 2px; font-size: 12px; color: #44403c; }
    .fields input { font: inherit; font-size: 13px; padding: 4px 6px; border: 2px solid #d6d3d1; background: #fff; color: #1c1917; }
    .fields input:focus { outline: none; border-color: #065f46; }
    .tab {
      all: unset; cursor: pointer;
      position: fixed; top: 120px; right: 0; z-index: 2147483000;
      background: #064e3b; color: #fafaf9; padding: 10px 6px;
      writing-mode: vertical-rl; font: 12px/1 "IBM Plex Mono", Consolas, monospace;
      letter-spacing: .16em; text-transform: uppercase; border: 2px solid #1c1917; border-right: 0;
    }
  `;

  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of [].concat(children || [])) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function riskBadge(risk) {
    return h(
      "span",
      { class: "badge r-" + risk, title: "Risco " + RISK_LABEL[risk] + " (" + RISK_COLOR[risk] + ")" },
      RISK_LABEL[risk],
    );
  }

  /**
   * @param {object} handlers onToggle(id, on), onValue(key, value),
   *   onReplaceMotivo(), onUseProtocolRisk(), onCopy()
   */
  function createPanel(handlers) {
    const host = document.createElement("div");
    host.id = "viasus-pec-extension";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.append(h("style", {}, CSS));
    document.documentElement.append(host);

    let collapsed = false;
    let protocolId = null;
    let panel = null;
    let summary = null;
    let tab = null;
    const itemEls = new Map();

    function buildNode(node, valueKey) {
      const risk = globalThis.ViaSusReferral.nodeRisk(node);
      const fields = (node.fields || []).map((f) =>
        h("label", {}, [
          f.label + (f.unit ? " (" + f.unit + ")" : ""),
          h("input", {
            type: f.type === "data" ? "date" : "text",
            inputmode: f.type === "numero" ? "decimal" : undefined,
            placeholder: f.placeholder || "",
            oninput: (e) => handlers.onValue(valueKey(node.id, f.id), e.target.value),
          }),
        ]),
      );
      const checkbox = h("input", {
        type: "checkbox",
        onchange: (e) => handlers.onToggle(node.id, e.target.checked),
      });
      const li = h("li", { class: "item" }, [
        h("label", {}, [
          checkbox,
          h("div", {}, [
            h("div", { class: "lbl" }, node.label),
            risk || node.category
              ? h("div", { class: "tags" }, [
                  risk ? riskBadge(risk) : null,
                  node.category ? h("span", { class: "cat" }, CATEGORY_LABEL[node.category] || node.category) : null,
                ])
              : null,
          ]),
        ]),
        fields.length ? h("div", { class: "fields" }, fields) : null,
        node.children && node.children.length
          ? h("ul", {}, node.children.map((c) => buildNode(c, valueKey)))
          : null,
      ]);
      itemEls.set(node.id, { li, checkbox });
      return li;
    }

    function mount(state) {
      shadow.querySelectorAll(".panel, .tab").forEach((el) => el.remove());
      itemEls.clear();
      const p = state.protocol;
      protocolId = p.id;
      const url = state.baseUrl + "/" + state.tenant + "/protocolos/" + p.slug;

      summary = h("div", { class: "summary" });
      panel = h("div", { class: "panel", role: "complementary", "aria-label": "Protocolo ViaSus" }, [
        h("div", { class: "head" }, [
          h("span", { class: "kicker" }, "ViaSus · Encaminhamento"),
          h("button", { title: "Recolher", "aria-label": "Recolher painel", onclick: () => setCollapsed(true) }, "–"),
        ]),
        h("div", { class: "title" }, [
          h("h2", {}, p.title),
          h("div", { class: "meta" }, [
            "v" + p.version_number + " · ",
            h("a", { href: url, target: "_blank", rel: "noopener" }, "abrir no ViaSus"),
          ]),
        ]),
        summary,
        h("div", { class: "list" }, [
          h("ul", {}, p.referral_data.tree.map((n) => buildNode(n, state.valueKey))),
        ]),
      ]);
      tab = h("button", { class: "tab", title: "Abrir protocolo ViaSus", onclick: () => setCollapsed(false) }, "ViaSus");
      shadow.append(panel, tab);
      applyCollapsed();
    }

    function setCollapsed(v) {
      collapsed = v;
      applyCollapsed();
    }

    function applyCollapsed() {
      if (panel) panel.style.display = collapsed ? "none" : "";
      if (tab) tab.style.display = collapsed ? "" : "none";
    }

    function renderSummary(state) {
      summary.replaceChildren();
      const count = state.checked.size;

      // Classificação de risco
      const riskRow = h("div", { class: "row" }, [h("span", { class: "label" }, "Classificação de risco")]);
      if (state.risk) riskRow.append(riskBadge(state.risk));
      else riskRow.append(h("span", { class: "muted" }, count ? "itens marcados sem risco definido" : "marque os itens"));
      summary.append(riskRow);

      if (state.riskStatus === "overridden" && state.risk) {
        summary.append(
          h("div", { class: "row" }, [
            h("span", { class: "warn" }, "Você escolheu outro risco no PEC — mantido."),
            h("button", { class: "btn", onclick: handlers.onUseProtocolRisk }, "Usar o do protocolo"),
          ]),
        );
      } else if (state.riskStatus === "failed") {
        summary.append(h("span", { class: "warn" }, "Não consegui marcar o risco no PEC. Marque manualmente."));
      }

      if (state.risk === "emergencia") {
        summary.append(
          h("div", { class: "alert", role: "alert" }, [
            h("strong", {}, "!"),
            h("span", {}, "Situação de emergência: encaminhar imediatamente à UPA / emergência hospitalar (SAMU 192). Não aguardar regulação."),
          ]),
        );
      }

      // Motivo do encaminhamento
      const len = state.justification.length;
      const motivoRow = h("div", { class: "row" }, [
        h("span", { class: "label" }, "Motivo"),
        h("span", { class: len > state.maxChars ? "warn" : "muted" }, len + "/" + state.maxChars + " caracteres"),
      ]);
      summary.append(motivoRow);
      if (len > state.maxChars) {
        summary.append(h("span", { class: "warn" }, "Texto acima do limite do PEC — o PEC pode cortar o final. Reduza os itens ou resultados."));
      }
      if (state.motivoStatus === "ok" && count) {
        summary.append(h("span", { class: "ok" }, "Motivo preenchido no PEC."));
      } else if (state.motivoStatus === "edited") {
        summary.append(
          h("div", { class: "row" }, [
            h("span", { class: "warn" }, "Você editou o motivo no PEC — não vou sobrescrever."),
            h("button", { class: "btn", onclick: handlers.onReplaceMotivo }, "Substituir pelo gerado"),
          ]),
        );
      } else if (state.motivoStatus === "failed") {
        summary.append(
          h("div", { class: "row" }, [
            h("span", { class: "warn" }, "Não consegui escrever no campo. Copie e cole:"),
            h("button", { class: "btn primary", onclick: handlers.onCopy }, state.copied ? "Copiado ✓" : "Copiar motivo"),
          ]),
        );
      }
    }

    return {
      render(state) {
        if (!state.protocol) return;
        if (state.protocol.id !== protocolId) mount(state);
        for (const [id, els] of itemEls) {
          const on = state.checked.has(id);
          els.checkbox.checked = on;
          els.li.classList.toggle("on", on);
        }
        renderSummary(state);
      },
      /** Elemento focado dentro do painel (pra devolver o foco após escrever no PEC). */
      activeElement() {
        return shadow.activeElement;
      },
      destroy() {
        host.remove();
      },
    };
  }

  global.ViaSusPanel = { createPanel };
})(globalThis);
