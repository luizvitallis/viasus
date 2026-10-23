/**
 * Service worker: busca os protocolos de encaminhamento publicados no ViaSus
 * e guarda a última cópia em chrome.storage.local — se a internet da UBS
 * cair, o painel continua funcionando com a versão salva.
 */
const DEFAULT_CONFIG = {
  baseUrl: "https://viasus.vercel.app",
  tenant: "caucaia-ce",
};
const CACHE_KEY = "viasus:protocolsCache";
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getConfig() {
  const { config } = await chrome.storage.sync.get("config");
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

async function fetchProtocols(config) {
  const url =
    config.baseUrl.replace(/\/+$/, "") +
    "/api/public/" +
    encodeURIComponent(config.tenant) +
    "/encaminhamentos";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("ViaSus respondeu " + res.status + " em " + url);
  const body = await res.json();
  return body.protocols || [];
}

async function getProtocols(force) {
  const config = await getConfig();
  const { [CACHE_KEY]: cache } = await chrome.storage.local.get(CACHE_KEY);
  const sameSource =
    cache && cache.baseUrl === config.baseUrl && cache.tenant === config.tenant;

  if (!force && sameSource && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { protocols: cache.protocols, config, fetchedAt: cache.fetchedAt };
  }

  try {
    const protocols = await fetchProtocols(config);
    const fetchedAt = Date.now();
    await chrome.storage.local.set({
      [CACHE_KEY]: { protocols, fetchedAt, baseUrl: config.baseUrl, tenant: config.tenant },
    });
    return { protocols, config, fetchedAt };
  } catch (err) {
    return {
      protocols: sameSource ? cache.protocols : [],
      config,
      fetchedAt: sameSource ? cache.fetchedAt : null,
      stale: true,
      error: String(err && err.message ? err.message : err),
    };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "viasus:getProtocols") {
    getProtocols(msg.force).then(sendResponse);
    return true; // resposta assíncrona
  }
  return false;
});
