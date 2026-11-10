/**
 * Adaptador do formulário "Encaminhamento > Serviço especializado" do e-SUS
 * PEC. Tudo que depende do HTML do PEC fica aqui — se uma atualização do PEC
 * quebrar a extensão, é este arquivo que muda.
 *
 * Mapeado a partir do PEC salvo em `paginas/` (modal de encaminhamento):
 *   - Especialidade:        input[name="especialidadeSisreg"] (combobox)
 *   - Classificação risco:  input[type=radio][name="classificacaoRiscoEncaminhamento"]
 *                           valores ELETIVO | PRIORITARIO | URGENCIA | EMERGENCIA
 *   - Motivo:               editor Draft.js (react-rte), contenteditable com
 *                           aria-label "Insira o motivo do encaminhamento", 1000 caracteres
 *
 * A extensão só ESCREVE nesses campos. Não lê nem envia dado do cidadão.
 */
(function (global) {
  "use strict";

  const MOTIVO_MAX_CHARS = 1000;
  const RISK_TO_PEC = {
    eletivo: "ELETIVO",
    prioritario: "PRIORITARIO",
    urgencia: "URGENCIA",
    emergencia: "EMERGENCIA",
  };
  const PEC_TO_RISK = Object.fromEntries(
    Object.entries(RISK_TO_PEC).map(([k, v]) => [v, k]),
  );

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Normaliza para comparar especialidades: sem acento, caixa alta, espaços simples. */
  function normalize(text) {
    return (text || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  /** Formulário de encaminhamento aberto na tela, ou null. */
  function findForm() {
    const input = document.querySelector('input[name="especialidadeSisreg"]');
    if (!input) return null;
    const root = input.closest("form") || input.closest('[role="region"]') || document.body;
    return { root, especialidadeInput: input };
  }

  function getEspecialidade(form) {
    return normalize(form.especialidadeInput.value);
  }

  function riskInputs(form) {
    return Array.from(
      form.root.querySelectorAll('input[type="radio"][name="classificacaoRiscoEncaminhamento"]'),
    );
  }

  /** Risco marcado no PEC (eletivo/…/emergencia) ou null. */
  function getRisk(form) {
    const checked = riskInputs(form).find((i) => i.checked);
    return checked ? PEC_TO_RISK[checked.value] || null : null;
  }

  /** Marca o radio correspondente. Retorna true se o PEC ficou com esse risco. */
  function setRisk(form, risk) {
    const target = riskInputs(form).find((i) => i.value === RISK_TO_PEC[risk]);
    if (!target) return false;
    if (!target.checked) {
      // O React do PEC escuta o click do input (tabindex=-1 dentro do label).
      target.click();
      if (!target.checked) {
        const wrapper = target.closest('[role="button"]');
        if (wrapper) wrapper.click();
      }
    }
    return target.checked;
  }

  function getMotivoEditor(form) {
    return (
      form.root.querySelector(
        '.public-DraftEditor-content[aria-label="Insira o motivo do encaminhamento"]',
      ) ||
      findEditorByLabel(form.root, "Motivo do encaminhamento")
    );
  }

  function findEditorByLabel(root, labelText) {
    const label = Array.from(root.querySelectorAll("label")).find(
      (l) => normalize(l.textContent) === normalize(labelText),
    );
    const container = label && label.parentElement;
    return container ? container.querySelector('[contenteditable="true"]') : null;
  }

  function readMotivo(editor) {
    return (editor.innerText || "").replace(/\s+/g, " ").trim();
  }

  /** Ponto (nó, offset) no início ou no fim de uma folha `[data-text]` do Draft.js. */
  function leafPoint(leaf, atEnd) {
    const textNode = leaf.firstChild && leaf.firstChild.nodeType === Node.TEXT_NODE ? leaf.firstChild : null;
    if (textNode) return [textNode, atEnd ? textNode.length : 0];
    // Bloco vazio: <span data-offset-key><br data-text="true"></span>
    return [leaf.parentNode, 0];
  }

  /**
   * Seleciona todo o texto do editor ancorando nas folhas do Draft.js — ele só
   * entende seleções dentro de `[data-offset-key]`, não na raiz do editor.
   */
  function selectAll(editor) {
    editor.focus();
    const leaves = editor.querySelectorAll('[data-text="true"]');
    const range = document.createRange();
    if (leaves.length) {
      range.setStart(...leafPoint(leaves[0], false));
      range.setEnd(...leafPoint(leaves[leaves.length - 1], true));
    } else {
      range.selectNodeContents(editor);
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Substitui todo o conteúdo do editor Draft.js por `text`.
   * Nunca altera o DOM do editor direto (execCommand etc.): o React do PEC
   * quebra a página inteira quando o DOM diverge do estado do Draft.js. Usa só
   * eventos que o próprio Draft.js trata e cancela — "colar" para escrever,
   * Backspace para apagar. Retorna true se o editor terminou com esse texto.
   */
  async function writeMotivo(editor, text) {
    const expected = text.replace(/\s+/g, " ").trim();
    if (!editor.isConnected) return false;
    if (readMotivo(editor) === expected) return true;

    // A espera deixa o Draft.js registrar a seleção (evento selectionchange).
    selectAll(editor);
    await wait(30);
    if (!editor.isConnected) return false;
    try {
      if (expected) {
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        editor.dispatchEvent(
          new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
        );
      } else {
        editor.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", keyCode: 8, which: 8, bubbles: true, cancelable: true }),
        );
      }
    } catch {
      /* evento indisponível — cai no retorno false */
    }
    await wait(30);
    return editor.isConnected && readMotivo(editor) === expected;
  }

  global.ViaSusPec = {
    MOTIVO_MAX_CHARS,
    normalize,
    findForm,
    getEspecialidade,
    getRisk,
    setRisk,
    getMotivoEditor,
    readMotivo,
    writeMotivo,
  };
})(globalThis);
