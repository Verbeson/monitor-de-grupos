// Popup de configuracao da extensao
document.addEventListener("DOMContentLoaded", () => {
  const grupoList = document.getElementById("grupoList");
  const grupoInput = document.getElementById("grupoInput");
  const grupoAddBtn = document.getElementById("grupoAddBtn");
  const grupoInputRow = document.getElementById("grupoInputRow");
  const grupoLimit = document.getElementById("grupoLimit");
  const numList = document.getElementById("numList");
  const numInput = document.getElementById("numInput");
  const numAddBtn = document.getElementById("numAddBtn");
  const numInputRow = document.getElementById("numInputRow");
  const numLimit = document.getElementById("numLimit");
  const palavraList = document.getElementById("palavraList");
  const palavraInput = document.getElementById("palavraInput");
  const palavraAddBtn = document.getElementById("palavraAddBtn");
  const palavraInputRow = document.getElementById("palavraInputRow");
  const palavraLimit = document.getElementById("palavraLimit");
  const toggleAtivo = document.getElementById("toggleAtivo");
  const openWA = document.getElementById("openWA");
  const statusPanel = document.getElementById("statusPanel");
  const statusIcon = document.getElementById("statusIcon");
  const statusText = document.getElementById("statusText");
  const planBadge = document.getElementById("planBadge");
  const proInput = document.getElementById("proInput");
  const activateBtn = document.getElementById("activateBtn");
  const keyError = document.getElementById("keyError");
  const keySuccess = document.getElementById("keySuccess");
  const proStatus = document.getElementById("proStatus");
  const proActivation = document.getElementById("proActivation");
  const proActive = document.getElementById("proActive");
  const proSection = document.getElementById("proSection");
  const proInfo = document.getElementById("proInfo");
  const proEmailDisplay = document.getElementById("proEmailDisplay");
  const deactivateBtn = document.getElementById("deactivateBtn");

  const API_URL = "https://monitor-de-grupos.vercel.app";

  const FREE_LIMIT = 1;
  const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

  let config = {
    gruposFiltros: ["MONITORAMENTO"],
    numerosIgnorados: [],
    palavrasIgnoradas: [],
    ativo: true,
  };

  let isPro = false;
  let proMethod = ""; // "email" ou "key"

  // Validar chave de licenca no servidor
  function validateKeyServer(key, callback) {
    fetch(API_URL + "/api/validate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key.trim().toUpperCase() }),
    })
      .then((res) => res.json())
      .then((data) => callback(null, data))
      .catch((err) => callback(err, null));
  }

  // Verificar assinatura na API
  function checkSubscription(email, callback) {
    fetch(API_URL + "/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
      .then((res) => res.json())
      .then((data) => callback(null, data))
      .catch((err) => callback(err, null));
  }

  // Carregar plano do storage
  function loadPlan() {
    chrome.storage.local.get(
      { proEmail: "", proKey: "", proMethod: "", proActive: false, proLastCheck: 0, proStatus: "" },
      (data) => {
        proMethod = data.proMethod || "";
        if (data.proActive) {
          if (proMethod === "key" && data.proKey) {
            // Manter ativo por cache local, revalidar no servidor a cada 24h
            isPro = true;
            proInput.value = data.proKey;
            var now = Date.now();
            if (now - data.proLastCheck > CHECK_INTERVAL_MS) {
              revalidateKey(data.proKey);
            }
          } else if (data.proEmail) {
            isPro = true;
            proInput.value = data.proEmail;
            // Verificar se precisa revalidar (a cada 24h)
            var now = Date.now();
            if (now - data.proLastCheck > CHECK_INTERVAL_MS) {
              revalidateSubscription(data.proEmail);
            }
          }
        } else {
          isPro = false;
          proInput.value = data.proEmail || data.proKey || "";
        }
        updatePlanUI(data.proStatus || "");
      }
    );
  }

  // Revalidar chave de licenca no servidor
  function revalidateKey(key) {
    validateKeyServer(key, (err, data) => {
      if (err) return; // Se falhar, manter estado atual
      if (data && data.valid) {
        isPro = true;
        chrome.storage.local.set({
          proActive: true,
          proLastCheck: Date.now(),
          proStatus: "active",
        });
      } else {
        isPro = false;
        chrome.storage.local.set({
          proActive: false,
          proLastCheck: Date.now(),
          proStatus: data ? "invalid" : "none",
        });
        updatePlanUI(data ? "invalid" : "none");
      }
    });
  }

  // Revalidar assinatura silenciosamente
  function revalidateSubscription(email) {
    checkSubscription(email, (err, data) => {
      if (err) return; // Se falhar, manter estado atual
      if (data && data.pro) {
        isPro = true;
        chrome.storage.local.set({
          proActive: true,
          proLastCheck: Date.now(),
          proStatus: "active",
        });
      } else {
        isPro = false;
        chrome.storage.local.set({
          proActive: false,
          proLastCheck: Date.now(),
          proStatus: data ? data.status : "none",
        });
        updatePlanUI(data ? data.status : "none");
      }
    });
  }

  // Atualizar UI conforme plano
  function updatePlanUI(status) {
    if (isPro) {
      planBadge.textContent = "PRO";
      planBadge.className = "plan-badge pro";
      proStatus.style.display = "";
      proStatus.textContent = "Ativo";
      proActivation.style.display = "none";
      proActive.style.display = "";
      proSection.className = "pro-section active";
      proInfo.textContent = "Todas as funcionalidades desbloqueadas.";
      chrome.storage.local.get({ proEmail: "", proKey: "", proMethod: "" }, (d) => {
        if (d.proMethod === "key" && d.proKey) {
          var parts = d.proKey.split("-");
          proEmailDisplay.textContent = "Chave: " + parts[0] + "-" + parts[1] + "-****-****";
        } else {
          proEmailDisplay.textContent = d.proEmail || "";
        }
      });
    } else {
      if (status === "paused") {
        planBadge.textContent = "PAUSADO";
        planBadge.className = "plan-badge free";
      } else {
        planBadge.textContent = "FREE";
        planBadge.className = "plan-badge free";
      }
      proStatus.style.display = "none";
      proActivation.style.display = "";
      proActive.style.display = "none";
      proSection.className = "pro-section";
    }
    updateLimits();
  }

  // Atualizar visibilidade dos inputs conforme limites
  function updateLimits() {
    if (isPro) {
      grupoInputRow.style.display = "";
      grupoLimit.style.display = "none";
      numInputRow.style.display = "";
      numLimit.style.display = "none";
      palavraInputRow.style.display = "";
      palavraLimit.style.display = "none";
    } else {
      var grupoAtLimit = config.gruposFiltros.length >= FREE_LIMIT;
      grupoInputRow.style.display = grupoAtLimit ? "none" : "";
      grupoLimit.style.display = grupoAtLimit ? "" : "none";

      var numAtLimit = config.numerosIgnorados.length >= FREE_LIMIT;
      numInputRow.style.display = numAtLimit ? "none" : "";
      numLimit.style.display = numAtLimit ? "" : "none";

      var palavraAtLimit = config.palavrasIgnoradas.length >= FREE_LIMIT;
      palavraInputRow.style.display = palavraAtLimit ? "none" : "";
      palavraLimit.style.display = palavraAtLimit ? "" : "none";
    }
  }

  // Scroll para secao Pro
  function scrollToProSection() {
    proSection.scrollIntoView({ behavior: "smooth" });
    proInput.focus();
  }

  document.getElementById("grupoUpgrade").addEventListener("click", scrollToProSection);
  document.getElementById("numUpgrade").addEventListener("click", scrollToProSection);
  document.getElementById("palavraUpgrade").addEventListener("click", scrollToProSection);

  // Ativar Pro (email OU chave de licenca)
  activateBtn.addEventListener("click", () => {
    var val = proInput.value.trim();
    keyError.style.display = "none";
    keySuccess.style.display = "none";

    if (!val) {
      keyError.textContent = "Digite um email ou chave de licenca.";
      keyError.style.display = "";
      return;
    }

    // Detectar se e chave (MGP-...) ou email (contem @)
    if (val.toUpperCase().startsWith("MGP-")) {
      // Validacao por chave de licenca no servidor
      activateBtn.textContent = "Verificando...";
      activateBtn.disabled = true;

      validateKeyServer(val, (err, data) => {
        activateBtn.textContent = "Ativar";
        activateBtn.disabled = false;

        if (err) {
          keyError.textContent = "Erro ao verificar. Tente novamente.";
          keyError.style.display = "";
          return;
        }

        if (data && data.valid) {
          isPro = true;
          proMethod = "key";
          chrome.storage.local.set({
            proKey: val.toUpperCase(),
            proMethod: "key",
            proActive: true,
            proLastCheck: Date.now(),
            proStatus: "active",
          });
          keySuccess.textContent = "Chave valida! Pro ativo ate " + data.expiry + ".";
          keySuccess.style.display = "";
          updatePlanUI("active");
        } else {
          keyError.textContent = (data && data.reason) || "Chave de licenca invalida.";
          keyError.style.display = "";
        }
      });
    } else if (val.includes("@")) {
      // Validacao por email (Mercado Pago)
      var email = val.toLowerCase();
      activateBtn.textContent = "Verificando...";
      activateBtn.disabled = true;

      checkSubscription(email, (err, data) => {
        activateBtn.textContent = "Ativar";
        activateBtn.disabled = false;

        if (err) {
          keyError.textContent = "Erro ao verificar. Tente novamente.";
          keyError.style.display = "";
          return;
        }

        if (data && data.pro) {
          isPro = true;
          proMethod = "email";
          chrome.storage.local.set({
            proEmail: email,
            proMethod: "email",
            proActive: true,
            proLastCheck: Date.now(),
            proStatus: "active",
          });
          keySuccess.textContent = "Assinatura ativa! Plano Pro desbloqueado.";
          keySuccess.style.display = "";
          updatePlanUI("active");
        } else if (data && data.status === "paused") {
          keyError.textContent = "Assinatura pausada. Regularize o pagamento no Mercado Pago.";
          keyError.style.display = "";
          chrome.storage.local.set({ proEmail: email, proActive: false, proStatus: "paused" });
          updatePlanUI("paused");
        } else {
          keyError.textContent = "Nenhuma assinatura encontrada. Use o email da sua conta Mercado Pago (o mesmo usado no pagamento).";
          keyError.style.display = "";
          chrome.storage.local.set({ proEmail: email, proActive: false, proStatus: "none" });
        }
      });
    } else {
      keyError.textContent = "Digite um email valido ou uma chave no formato MGP-AAMM-XXXX-XXXX.";
      keyError.style.display = "";
    }
  });

  proInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") activateBtn.click();
  });

  // Desconectar Pro
  deactivateBtn.addEventListener("click", () => {
    chrome.storage.local.set({
      proEmail: "",
      proKey: "",
      proMethod: "",
      proActive: false,
      proLastCheck: 0,
      proStatus: "",
    });
    isPro = false;
    proMethod = "";
    proInput.value = "";
    keySuccess.style.display = "none";
    keyError.style.display = "none";
    updatePlanUI("");
  });

  // Carregar config
  function loadConfig() {
    chrome.storage.local.get(
      {
        gruposFiltros: ["MONITORAMENTO"],
        numerosIgnorados: [],
        palavrasIgnoradas: [],
        ativo: true,
      },
      (data) => {
        config = data;
        toggleAtivo.checked = config.ativo;
        renderGrupos();
        renderNumeros();
        renderPalavras();
        updateLimits();
      }
    );
  }

  // Salvar config
  function saveConfig() {
    chrome.storage.local.set({
      gruposFiltros: config.gruposFiltros,
      numerosIgnorados: config.numerosIgnorados,
      palavrasIgnoradas: config.palavrasIgnoradas,
      ativo: config.ativo,
    });
  }

  // Renderizar lista de grupos
  function renderGrupos() {
    grupoList.innerHTML = "";
    if (config.gruposFiltros.length === 0) {
      grupoList.innerHTML = '<li class="empty">Nenhum grupo configurado</li>';
      return;
    }
    config.gruposFiltros.forEach((g, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${escapeHtml(g)}</span>
        <button class="btn btn-remove btn-small" data-idx="${i}">X</button>
      `;
      li.querySelector("button").addEventListener("click", () => {
        config.gruposFiltros.splice(i, 1);
        saveConfig();
        renderGrupos();
        updateLimits();
      });
      grupoList.appendChild(li);
    });
  }

  // Renderizar lista de contatos ignorados
  function renderNumeros() {
    numList.innerHTML = "";
    if (config.numerosIgnorados.length === 0) {
      numList.innerHTML = '<li class="empty">Nenhum contato ignorado</li>';
      return;
    }
    config.numerosIgnorados.forEach((item, i) => {
      const num = typeof item === "string" ? item : item.numero;
      const ativo = typeof item === "string" ? true : item.ativo !== false;
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${escapeHtml(num)}</span>
        <span>
          <span class="badge-ativo ${ativo ? "on" : "off"}">${ativo ? "ATIVO" : "INATIVO"}</span>
          <button class="btn btn-toggle btn-small" data-idx="${i}" title="Ativar/Desativar">&#x21C5;</button>
          <button class="btn btn-remove btn-small" data-idx="${i}" title="Remover">X</button>
        </span>
      `;
      li.querySelectorAll("button")[0].addEventListener("click", () => {
        if (typeof config.numerosIgnorados[i] === "string") {
          config.numerosIgnorados[i] = { numero: config.numerosIgnorados[i], ativo: false };
        } else {
          config.numerosIgnorados[i].ativo = !config.numerosIgnorados[i].ativo;
        }
        saveConfig();
        renderNumeros();
      });
      li.querySelectorAll("button")[1].addEventListener("click", () => {
        config.numerosIgnorados.splice(i, 1);
        saveConfig();
        renderNumeros();
        updateLimits();
      });
      numList.appendChild(li);
    });
  }

  // Renderizar lista de palavras ignoradas
  function renderPalavras() {
    palavraList.innerHTML = "";
    if (config.palavrasIgnoradas.length === 0) {
      palavraList.innerHTML = '<li class="empty">Nenhuma palavra configurada</li>';
      return;
    }
    config.palavrasIgnoradas.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${escapeHtml(p)}</span>
        <button class="btn btn-remove btn-small" data-idx="${i}">X</button>
      `;
      li.querySelector("button").addEventListener("click", () => {
        config.palavrasIgnoradas.splice(i, 1);
        saveConfig();
        renderPalavras();
        updateLimits();
      });
      palavraList.appendChild(li);
    });
  }

  // Adicionar grupo
  grupoAddBtn.addEventListener("click", () => {
    if (!isPro && config.gruposFiltros.length >= FREE_LIMIT) return;
    const val = grupoInput.value.trim();
    if (val && !config.gruposFiltros.includes(val)) {
      config.gruposFiltros.push(val);
      saveConfig();
      renderGrupos();
      grupoInput.value = "";
      updateLimits();
    }
  });

  grupoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") grupoAddBtn.click();
  });

  // Adicionar contato ignorado
  numAddBtn.addEventListener("click", () => {
    if (!isPro && config.numerosIgnorados.length >= FREE_LIMIT) return;
    const val = numInput.value.trim();
    if (!val) return;
    const exists = config.numerosIgnorados.some((item) => {
      const num = typeof item === "string" ? item : item.numero;
      return num.toLowerCase() === val.toLowerCase();
    });
    if (!exists) {
      config.numerosIgnorados.push({ numero: val, ativo: true });
      saveConfig();
      renderNumeros();
      numInput.value = "";
      updateLimits();
    }
  });

  numInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") numAddBtn.click();
  });

  // Adicionar palavra ignorada
  palavraAddBtn.addEventListener("click", () => {
    if (!isPro && config.palavrasIgnoradas.length >= FREE_LIMIT) return;
    const val = palavraInput.value.trim();
    if (!val) return;
    const exists = config.palavrasIgnoradas.some((p) => p.toLowerCase() === val.toLowerCase());
    if (!exists) {
      config.palavrasIgnoradas.push(val);
      saveConfig();
      renderPalavras();
      palavraInput.value = "";
      updateLimits();
    }
  });

  palavraInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") palavraAddBtn.click();
  });

  // Toggle monitoramento
  toggleAtivo.addEventListener("change", () => {
    config.ativo = toggleAtivo.checked;
    saveConfig();
  });

  // Abrir WhatsApp Web
  openWA.addEventListener("click", () => {
    chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: "https://web.whatsapp.com" });
      }
    });
  });

  // Verificar status da conexao
  function checkStatus() {
    chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        statusPanel.className = "status-panel conectado";
        statusIcon.textContent = "\u2705";
        statusText.textContent = "WhatsApp Web aberto";
        statusText.className = "status-text conectado";
      } else {
        statusPanel.className = "status-panel desconectado";
        statusIcon.textContent = "\u274C";
        statusText.textContent = "WhatsApp Web nao esta aberto";
        statusText.className = "status-text desconectado";
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Inicializar
  loadPlan();
  loadConfig();
  checkStatus();
});
