const $ = (id) => document.getElementById(id);

function showStatus(res) {
  const status = $("status");
  status.replaceChildren();
  status.className = res.error ? "err" : "";

  if (res.error) status.append("Erro: " + res.error);
  const withSpec = (res.protocols || []).filter((p) => p.especialidade_sisreg);
  const head = document.createElement("div");
  head.textContent =
    withSpec.length +
    " protocolo(s) ligado(s) a uma especialidade do PEC" +
    (res.stale ? " (cópia salva — sem conexão)" : "") +
    ":";
  status.append(head);

  const ul = document.createElement("ul");
  for (const p of withSpec) {
    const li = document.createElement("li");
    li.textContent = p.especialidade_sisreg + " → " + p.title + " (v" + p.version_number + ")";
    ul.append(li);
  }
  status.append(ul);

  const without = (res.protocols || []).length - withSpec.length;
  if (without > 0) {
    const note = document.createElement("div");
    note.className = "muted";
    note.textContent =
      without + " publicado(s) sem especialidade do PEC definida — não abrem no PEC.";
    status.append(note);
  }
}

function load(force) {
  $("status").textContent = "Carregando…";
  chrome.runtime.sendMessage({ type: "viasus:getProtocols", force }, (res) => {
    if (!res) return showStatus({ error: "Extensão sem resposta.", protocols: [] });
    $("baseUrl").value = res.config.baseUrl;
    $("tenant").value = res.config.tenant;
    showStatus(res);
  });
}

$("save").addEventListener("click", async () => {
  const baseUrl = $("baseUrl").value.trim().replace(/\/+$/, "");
  const tenant = $("tenant").value.trim();
  await chrome.storage.sync.set({ config: { baseUrl, tenant } });
  load(true);
});

$("refresh").addEventListener("click", () => load(true));

load(false);
