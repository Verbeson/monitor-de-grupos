// Background Service Worker - Gerencia notificacoes e popups de alerta

let connectionStatus = "aguardando";
let alertWindowId = null;
let isCreatingWindow = false;
let alertQueue = [];

// Receber mensagens do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_MESSAGE") {
    enqueueAlert(message.data);
  } else if (message.type === "STATUS_UPDATE") {
    connectionStatus = message.status;
    updateBadge(message.status);
  } else if (message.type === "OPEN_GROUP") {
    openGroupInWhatsApp(message.grupo);
  }
});

// Atualizar badge do icone da extensao
function updateBadge(status) {
  const badges = {
    conectado: { text: "ON", color: "#27ae60" },
    desconectado: { text: "OFF", color: "#e74c3c" },
    aguardando: { text: "...", color: "#f39c12" },
  };
  const badge = badges[status] || badges.aguardando;
  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

function enqueueAlert(data) {
  alertQueue.push({
    grupo: data.grupo,
    remetente: data.remetente,
    mensagem: data.mensagem,
    timestamp: Date.now(),
  });
  processQueue();
}

function processQueue() {
  if (alertQueue.length === 0 || isCreatingWindow) return;

  const alertData = alertQueue.shift();

  chrome.storage.local.set({ lastAlert: alertData }, () => {
    if (alertWindowId !== null) {
      chrome.windows.get(alertWindowId, (win) => {
        if (chrome.runtime.lastError || !win) {
          alertWindowId = null;
          createAlertWindow();
        } else {
          chrome.tabs.query({ windowId: alertWindowId }, (tabs) => {
            if (tabs && tabs.length > 0) {
              chrome.tabs.reload(tabs[0].id, () => {
                chrome.windows.update(alertWindowId, { focused: true, drawAttention: true });
                processQueue();
              });
            } else {
              processQueue();
            }
          });
        }
      });
    } else {
      createAlertWindow();
    }
  });
}

function createAlertWindow() {
  if (isCreatingWindow) return;
  isCreatingWindow = true;

  const popupW = 480;
  const popupH = 300;

  chrome.windows.getLastFocused((currentWindow) => {
    let left = 100;
    let top = 100;

    if (currentWindow && currentWindow.width > 0 && currentWindow.height > 0) {
      left = Math.round(currentWindow.left + (currentWindow.width - popupW) / 2);
      top = Math.round(currentWindow.top + (currentWindow.height - popupH) / 2);
    }

    if (left < 0) left = 0;
    if (top < 0) top = 0;

    chrome.windows.create({
      url: "alert.html",
      type: "popup",
      width: popupW,
      height: popupH,
      focused: true,
      left: left,
      top: top,
    }, (popupWindow) => {
      isCreatingWindow = false;
      if (chrome.runtime.lastError) {
        console.error("[Monitor] Erro ao criar popup:", chrome.runtime.lastError.message);
        alertWindowId = null;
        processQueue();
        return;
      }
      if (popupWindow) {
        alertWindowId = popupWindow.id;
        chrome.windows.update(popupWindow.id, { focused: true, drawAttention: true });
      }
      processQueue();
    });
  });
}

// Abrir grupo no WhatsApp Web
function openGroupInWhatsApp(groupName) {
  chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
      chrome.tabs.sendMessage(tab.id, { type: "CLICK_GROUP", grupo: groupName });
    }
  });
}

// Limpar referencia quando a janela de alerta e fechada
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === alertWindowId) {
    alertWindowId = null;
  }
});

// Inicializar badge
updateBadge("aguardando");

// Ao iniciar, verificar se WhatsApp Web ja esta aberto e re-injetar content script
chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
  if (tabs.length > 0) {
    updateBadge("conectado");
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      }).catch((err) => {
        console.warn("[Monitor] Falha ao reinjetar content script:", err.message);
      });
    }
  }
});

// Verificar se WhatsApp Web esta aberto
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes("web.whatsapp.com") && changeInfo.status === "complete") {
    updateBadge("conectado");
  }
});

chrome.tabs.onRemoved.addListener(() => {
  chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
    if (tabs.length === 0) {
      updateBadge("desconectado");
    }
  });
});
