/**
 * Orquestra a extensão na página do PEC:
 *   1. Observa o campo "Especialidade" do encaminhamento.
 *   2. Se existir protocolo ViaSus publicado para essa especialidade, abre o painel.
 *   3. A cada item marcado, reescreve o "Motivo do encaminhamento" e marca a
 *      "Classificação de risco" com o maior risco entre os itens.
 *   4. Se o profissional editar o motivo ou trocar o risco à mão, a extensão
 *      para de sobrescrever aquele campo (e oferece voltar ao gerado).
 */
(function () {
  "use strict";

  // Pode ser injetado de novo (instalação/atualização com a aba aberta).
  if (globalThis.__viasusPecLoaded) return;
  globalThis.__viasusPecLoaded = true;
  // Painel de uma cópia anterior da extensão (antes de recarregar) sai da tela.
  document.querySelectorAll("#viasus-pec-extension").forEach((el) => el.remove());

  const R = globalThis.ViaSusReferral;
  const PEC = globalThis.ViaSusPec;
  const TICK_MS = 700;
  const VALUE_DEBOUNCE_MS = 450;

  const state = {
    protocols: [],
    config: null,
    especialidade: "",
    protocol: null,
    checked: new Set(),
    values: {},
    justification: "",
    risk: null,
    lastWrittenMotivo: null,
    lastWrittenRisk: null,
    motivoStatus: "idle", // idle | ok | edited | failed
    riskStatus: "idle", // idle | ok | overridden | failed
    copied: false,
    loadedAt: 0,
  };

  let panel = null;
  let syncing = false;
  let syncAgain = false;
  let syncTimer = null;

  function loadProtocols(force) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "viasus:getProtocols", force: !!force }, (res) => {
        if (chrome.runtime.lastError || !res) {
          console.warn("[ViaSus] sem resposta do service worker", chrome.runtime.lastError);
          return resolve();
        }
        if (res.error) console.warn("[ViaSus]", res.error);
        state.protocols = res.protocols || [];
        state.config = res.config;
        state.loadedAt = Date.now();
        resolve();
      });
    });
  }

  function findProtocol(especialidade) {
    if (!especialidade) return null;
    return (
      state.protocols.find(
        (p) => p.especialidade_sisreg && PEC.normalize(p.especialidade_sisreg) === especialidade,
      ) || null
    );
  }

  function resetSelection(protocol) {
    state.protocol = protocol;
    state.checked = new Set();
    state.values = {};
    state.justification = "";
    state.risk = null;
    state.lastWrittenMotivo = null;
    state.lastWrittenRisk = null;
    state.motivoStatus = "idle";
    state.riskStatus = "idle";
    state.copied = false;
  }

  function viewState() {
    return {
      protocol: state.protocol,
      checked: state.checked,
      justification: state.justification,
      risk: state.risk,
      motivoStatus: state.motivoStatus,
      riskStatus: state.riskStatus,
      copied: state.copied,
      maxChars: PEC.MOTIVO_MAX_CHARS,
      baseUrl: state.config ? state.config.baseUrl : "",
      tenant: state.config ? state.config.tenant : "",
      valueKey: R.valueKey,
    };
  }

  function render() {
    if (panel && state.protocol) panel.render(viewState());
  }

  function recompute() {
    const data = state.protocol.referral_data;
    state.justification = R.generateJustification(data, state.checked, state.values);
    state.risk = R.computeRisk(data.tree, state.checked);
    state.copied = false;
  }

  function scheduleSync(delay) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, delay);
  }

  /** Escreve motivo e risco no PEC, respeitando edições manuais. */
  async function sync() {
    if (syncing) {
      syncAgain = true;
      return;
    }
    const form = PEC.findForm();
    if (!form || !state.protocol) return;
    syncing = true;
    const focused = panel && panel.activeElement();

    try {
      if (state.motivoStatus !== "edited") {
        const editor = PEC.getMotivoEditor(form);
        const text = state.justification;
        if (!editor) {
          state.motivoStatus = "failed";
        } else if (text || state.lastWrittenMotivo !== null) {
          const ok = await PEC.writeMotivo(editor, text);
          state.motivoStatus = ok ? "ok" : "failed";
          state.lastWrittenMotivo = text;
        }
      }

      if (state.riskStatus !== "overridden") {
        // Sem risco nos marcados: volta ao padrão do PEC (Eletivo) se já tínhamos mexido.
        const target = state.risk || (state.lastWrittenRisk ? "eletivo" : null);
        if (target) {
          const ok = PEC.setRisk(form, target);
          state.riskStatus = ok ? "ok" : "failed";
          state.lastWrittenRisk = target;
        }
      }
    } finally {
      syncing = false;
    }

    // Devolve o foco ao campo do painel em que o profissional estava digitando.
    if (focused && typeof focused.focus === "function") focused.focus();
    render();
    if (syncAgain) {
      syncAgain = false;
      sync();
    }
  }

  /** Detecta se o profissional mexeu à mão no motivo ou no risco. */
  function detectManualEdits(form) {
    let changed = false;
    if (state.motivoStatus === "ok" && state.lastWrittenMotivo !== null) {
      const editor = PEC.getMotivoEditor(form);
      const expected = state.lastWrittenMotivo.replace(/\s+/g, " ").trim();
      if (editor && PEC.readMotivo(editor) !== expected) {
        state.motivoStatus = "edited";
        changed = true;
      }
    }
    if (state.riskStatus === "ok" && state.lastWrittenRisk) {
      if (PEC.getRisk(form) !== state.lastWrittenRisk) {
        state.riskStatus = "overridden";
        changed = true;
      }
    }
    if (changed) render();
  }

  const handlers = {
    onToggle(id, on) {
      if (on) state.checked.add(id);
      else state.checked.delete(id);
      recompute();
      render();
      scheduleSync(60);
    },
    onValue(key, value) {
      state.values[key] = value;
      recompute();
      render();
      scheduleSync(VALUE_DEBOUNCE_MS);
    },
    onReplaceMotivo() {
      state.motivoStatus = "idle";
      scheduleSync(0);
    },
    onUseProtocolRisk() {
      state.riskStatus = "idle";
      scheduleSync(0);
    },
    async onCopy() {
      try {
        await navigator.clipboard.writeText(state.justification);
        state.copied = true;
      } catch {
        state.copied = false;
      }
      render();
    },
  };

  async function tick() {
    // Extensão recarregada/atualizada: esta cópia ficou órfã — sai de cena.
    if (!chrome.runtime || !chrome.runtime.id) {
      clearInterval(interval);
      if (panel) panel.destroy();
      panel = null;
      return;
    }
    const form = PEC.findForm();
    const especialidade = form ? PEC.getEspecialidade(form) : "";

    if (especialidade !== state.especialidade) {
      state.especialidade = especialidade;
      if (especialidade && Date.now() - state.loadedAt > 5 * 60 * 1000) {
        await loadProtocols(false);
      }
      const protocol = findProtocol(especialidade);
      if (!protocol) {
        if (panel) panel.destroy();
        panel = null;
        resetSelection(null);
        return;
      }
      resetSelection(protocol);
      // Motivo já digitado antes de abrir o protocolo: não sobrescreve.
      const editor = PEC.getMotivoEditor(form);
      if (editor && PEC.readMotivo(editor)) state.motivoStatus = "edited";
      if (!panel) panel = globalThis.ViaSusPanel.createPanel(handlers);
      recompute();
      render();
      return;
    }

    if (form && state.protocol && !syncing) detectManualEdits(form);
  }

  // Começa a observar já; a lista de protocolos chega quando a busca terminar
  // (tick refaz a casa da especialidade quando a lista muda).
  loadProtocols(false).then(() => {
    state.especialidade = "";
    tick();
  });
  const interval = setInterval(tick, TICK_MS);
})();
