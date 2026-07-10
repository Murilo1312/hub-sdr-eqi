// Logica compartilhada do Hub de Agentes SDR EQI: modal de configuracoes,
// chamada a API da Anthropic, historico local por agente e um renderizador
// de Markdown minimo (sem dependencias externas).

const STORAGE_KEYS = {
  apiKey: "eqi_hub_api_key",
  model: "eqi_hub_model",
  historyPrefix: "eqi_hub_history_"
};

const DEFAULT_MODEL = "claude-sonnet-5";

const AVAILABLE_MODELS = [
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 (equilibrio custo/qualidade)" },
  { value: "claude-opus-4-8", label: "Claude Opus 4.8 (maxima qualidade)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (mais rapido/economico)" }
];

// ---------- Settings (localStorage) ----------

function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.apiKey) || "";
}

function getModel() {
  return localStorage.getItem(STORAGE_KEYS.model) || DEFAULT_MODEL;
}

function saveSettings(apiKey, model) {
  if (apiKey) {
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
  }
  localStorage.setItem(STORAGE_KEYS.model, model || DEFAULT_MODEL);
}

function clearSettings() {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  localStorage.removeItem(STORAGE_KEYS.model);
}

// ---------- Settings modal (injected on every page) ----------

function injectSettingsModal() {
  if (document.getElementById("settings-modal")) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "settings-modal";

  const modelOptions = AVAILABLE_MODELS.map(
    (m) => `<option value="${m.value}">${m.label}</option>`
  ).join("");

  overlay.innerHTML = `
    <div class="modal">
      <button type="button" class="modal-close" id="settings-close" aria-label="Fechar">&times;</button>
      <h2>Configurações</h2>
      <p class="modal-sub">Sua chave é usada só neste navegador, para chamar a API da Anthropic diretamente.</p>
      <div class="field">
        <label for="settings-api-key">Chave da API da Anthropic</label>
        <input type="password" id="settings-api-key" placeholder="sk-ant-..." autocomplete="off">
      </div>
      <div class="field">
        <label for="settings-model">Modelo</label>
        <select id="settings-model">${modelOptions}</select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-primary" id="settings-save">Salvar</button>
        <button type="button" class="btn-secondary" id="settings-clear">Limpar</button>
      </div>
      <div class="modal-footnote">
        A chave fica salva apenas no <strong>localStorage do seu navegador</strong> — nunca é
        enviada a nenhum servidor além da API oficial da Anthropic (api.anthropic.com).
        Nunca cole sua chave em um repositório git ou a compartilhe com terceiros.
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const keyInput = overlay.querySelector("#settings-api-key");
  const modelSelect = overlay.querySelector("#settings-model");

  function openModal() {
    keyInput.value = getApiKey();
    modelSelect.value = getModel();
    overlay.classList.add("is-open");
  }

  function closeModal() {
    overlay.classList.remove("is-open");
  }

  overlay.querySelector("#settings-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector("#settings-save").addEventListener("click", () => {
    saveSettings(keyInput.value.trim(), modelSelect.value);
    closeModal();
  });

  overlay.querySelector("#settings-clear").addEventListener("click", () => {
    clearSettings();
    keyInput.value = "";
    modelSelect.value = DEFAULT_MODEL;
  });

  document.querySelectorAll("[data-open-settings]").forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

// ---------- Top nav (injected on every page) ----------

function injectTopNav(activePage) {
  const mount = document.getElementById("topnav");
  if (!mount) return;

  mount.innerHTML = `
    <a href="index.html" class="topnav__brand">Hub<span>SDR</span> EQI</a>
    <div class="topnav__links">
      <a href="index.html" class="topnav__link ${activePage === "dashboard" ? "is-active" : ""}">Dashboard</a>
      <button type="button" class="btn-settings" data-open-settings>Configurações</button>
    </div>
  `;
}

// ---------- Anthropic API call ----------

async function callAgent(systemPrompt, userInput, { onStatus } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Nenhuma chave de API configurada. Abra Configurações e cole sua chave da Anthropic.");
  }

  if (onStatus) onStatus("Chamando o modelo…");

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userInput }]
      })
    });
  } catch (networkError) {
    throw new Error("Falha de rede ao contatar a API da Anthropic. Verifique sua conexão e tente novamente.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || "";
    } catch (_) {
      // corpo nao era JSON
    }

    if (response.status === 401) {
      throw new Error("Chave de API inválida ou não autorizada. Confira a chave em Configurações.");
    }
    if (response.status === 429) {
      throw new Error("Limite de requisições atingido. Aguarde um instante e tente novamente.");
    }
    throw new Error(`Erro da API (${response.status}): ${detail || "falha desconhecida"}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return text;
}

// ---------- History (localStorage, last 20 runs per agent) ----------

function historyKey(agentId) {
  return `${STORAGE_KEYS.historyPrefix}${agentId}`;
}

function getHistory(agentId) {
  try {
    return JSON.parse(localStorage.getItem(historyKey(agentId)) || "[]");
  } catch (_) {
    return [];
  }
}

function pushHistory(agentId, entry) {
  const list = getHistory(agentId);
  list.unshift(entry);
  const trimmed = list.slice(0, 20);
  localStorage.setItem(historyKey(agentId), JSON.stringify(trimmed));
  return trimmed;
}

function clearHistory(agentId) {
  localStorage.removeItem(historyKey(agentId));
}

// ---------- Minimal Markdown renderer (no external deps) ----------

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(md) {
  if (!md) return "";

  const codeBlocks = [];
  let working = md.replace(/```([\s\S]*?)```/g, (_, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.replace(/^\w*\n/, ""));
    return `@@CODEBLOCK${idx}@@`;
  });

  working = escapeHtml(working);

  working = working.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  working = working.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  working = working.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  working = working.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  working = working.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  working = working.replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = working.split("\n");
  const htmlLines = [];
  let inList = null;

  for (const line of lines) {
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);

    if (ol) {
      if (inList !== "ol") {
        if (inList) htmlLines.push(`</${inList}>`);
        htmlLines.push("<ol>");
        inList = "ol";
      }
      htmlLines.push(`<li>${ol[1]}</li>`);
    } else if (ul) {
      if (inList !== "ul") {
        if (inList) htmlLines.push(`</${inList}>`);
        htmlLines.push("<ul>");
        inList = "ul";
      }
      htmlLines.push(`<li>${ul[1]}</li>`);
    } else {
      if (inList) {
        htmlLines.push(`</${inList}>`);
        inList = null;
      }
      if (line.trim() === "") {
        htmlLines.push("");
      } else if (/^<h[1-3]>/.test(line)) {
        htmlLines.push(line);
      } else {
        htmlLines.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) htmlLines.push(`</${inList}>`);

  let html = htmlLines.join("\n");

  html = html.replace(/@@CODEBLOCK(\d+)@@/g, (_, idx) => {
    return `<pre><code>${escapeHtml(codeBlocks[Number(idx)])}</code></pre>`;
  });

  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  injectSettingsModal();
});
