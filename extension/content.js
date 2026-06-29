// Content Script - Injeta no WhatsApp Web e monitora mensagens de grupo
(function () {
  "use strict";

  if (window.__monitorGruposAtivo) return;
  window.__monitorGruposAtivo = true;

  var config = {
    gruposFiltros: ["MONITORAMENTO"],
    numerosIgnorados: [],
    palavrasIgnoradas: [],
    ativo: true,
  };

  var processedMessages = new Set();
  var scanTimeout = null;
  var isScanning = false;
  var pendingAlerts = [];
  var isSendingAlert = false;

  function loadConfig() {
    chrome.storage.local.get(
      { gruposFiltros: ["MONITORAMENTO"], numerosIgnorados: [], palavrasIgnoradas: [], ativo: true },
      function (data) {
        config = data;
      }
    );
  }

  loadConfig();

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local") loadConfig();
  });

  // Seletores resilientes - usa atributos estaveis em vez de classes ofuscadas
  function getChatContainers() {
    var items = document.querySelectorAll('[data-testid="cell-frame-container"]');
    if (items.length > 0) return items;
    var pane = document.querySelector("#pane-side");
    if (pane) {
      items = pane.querySelectorAll('[role="listitem"]');
      if (items.length > 0) return items;
    }
    items = document.querySelectorAll('[role="listitem"]');
    if (items.length > 0) return items;
    return document.querySelectorAll(".__empty_fallback__");
  }

  function getTopLevelTitleSpans(container) {
    var all = container.querySelectorAll("span[title]");
    var result = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var parent = el.parentElement;
      var nested = false;
      while (parent && parent !== container) {
        if (parent.tagName === "SPAN" && parent.hasAttribute("title")) {
          nested = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!nested) result.push(el);
    }
    return result;
  }

  function getGroupNameSpan(container) {
    var spans = getTopLevelTitleSpans(container);
    return spans.length > 0 ? spans[0] : null;
  }

  function getPreviewSpan(container) {
    var spans = getTopLevelTitleSpans(container);
    return spans.length > 1 ? spans[1] : null;
  }

  function getTimestampText(container) {
    var spans = container.querySelectorAll("span");
    for (var i = 0; i < spans.length; i++) {
      var text = spans[i].textContent.trim();
      if (/^\d{1,2}:\d{2}$/.test(text) && !spans[i].hasAttribute("title")) {
        return text;
      }
    }
    return "";
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === "CLICK_GROUP" && message.grupo) {
      var containers = getChatContainers();
      for (var i = 0; i < containers.length; i++) {
        var nameSpan = getGroupNameSpan(containers[i]);
        if (nameSpan && nameSpan.getAttribute("title") === message.grupo) {
          containers[i].click();
          break;
        }
      }
    }
  });

  function onlyDigits(str) {
    return str.replace(/\D/g, "");
  }

  function isIgnored(senderInfo) {
    if (!senderInfo) return false;
    var senderUpper = senderInfo.toUpperCase().trim();
    var senderDigits = onlyDigits(senderInfo);
    return config.numerosIgnorados.some(function (item) {
      var valor = typeof item === "string" ? item : item.numero;
      var ativo = typeof item === "string" ? true : item.ativo !== false;
      if (!ativo) return false;
      var valorUpper = valor.toUpperCase().trim();
      var valorDigits = onlyDigits(valor);

      if (senderUpper === valorUpper) {
        return true;
      }

      if (valorDigits.length >= 8 && senderDigits.length >= 8) {
        if (senderDigits.endsWith(valorDigits) || valorDigits.endsWith(senderDigits)) {
          return true;
        }
        if (senderDigits === valorDigits) {
          return true;
        }
      }

      return false;
    });
  }

  function isMessageIgnored(msgText) {
    if (!config.palavrasIgnoradas || config.palavrasIgnoradas.length === 0) return false;
    var upper = msgText.toUpperCase();
    return config.palavrasIgnoradas.some(function (palavra) {
      return upper.includes(palavra.toUpperCase());
    });
  }

  function matchesGroupFilter(groupName) {
    if (!config.gruposFiltros || config.gruposFiltros.length === 0) return false;
    var upper = groupName.toUpperCase();
    return config.gruposFiltros.some(function (filtro) {
      return upper.includes(filtro.toUpperCase());
    });
  }

  function cleanSenderName(text) {
    if (!text) return "";
    return text
      .replace(/[‎‏‪-‮]/g, "")
      .replace(/^~\s*/, "")
      .replace(/^Talvez\s+/i, "")
      .replace(/:$/, "")
      .trim();
  }

  function isTodayTimestamp(timeText) {
    if (!timeText) return false;
    return /^\d{1,2}:\d{2}$/.test(timeText.trim());
  }

  function scanSidebar() {
    if (!config.ativo || isScanning) return;

    try {
      chrome.runtime.getURL("");
    } catch (e) {
      window.__monitorGruposAtivo = false;
      return;
    }

    isScanning = true;

    var chatContainers = getChatContainers();

    for (var i = 0; i < chatContainers.length; i++) {
      var container = chatContainers[i];

      var previewSpan = getPreviewSpan(container);
      if (!previewSpan) continue;

      var fullPreview = previewSpan.getAttribute("title") || "";
      if (!fullPreview) continue;

      var groupNameEl = getGroupNameSpan(container);
      if (!groupNameEl) continue;

      var chatName = groupNameEl.getAttribute("title");
      if (!chatName) continue;

      if (!matchesGroupFilter(chatName)) continue;

      var msgId = chatName + "|" + fullPreview;
      if (processedMessages.has(msgId)) continue;

      var timeText = getTimestampText(container);
      if (!isTodayTimestamp(timeText)) {
        processedMessages.add(msgId);
        continue;
      }

      var sender = "";
      var msgText = "";

      // 1) Remetente via span[aria-label] dentro do preview
      var senderByLabel = previewSpan.querySelector("span[aria-label]");
      if (senderByLabel) {
        var label = senderByLabel.getAttribute("aria-label") || "";
        if (label && !label.includes("mensage") && !label.includes("não lida") && !label.includes("unread") && !label.includes("Conversa")) {
          sender = cleanSenderName(label);
        }
      }

      // 2) Fallback: span com dir="auto" que parece nome de remetente
      if (!sender) {
        var childSpans = previewSpan.querySelectorAll('span[dir="auto"]');
        for (var d = 0; d < childSpans.length; d++) {
          var cs = childSpans[d];
          if (cs.hasAttribute("title") || cs.querySelector("img")) continue;
          var csText = cs.textContent.trim();
          if (csText.length > 0 && csText.length < 50) {
            sender = cleanSenderName(csText);
            break;
          }
        }
      }

      // 3) Fallback: extrair do title (formato "Remetente: mensagem")
      if (!sender) {
        var cleanPreview = fullPreview.replace(/[‎‏‪-‮]/g, "");
        var colonIdx = cleanPreview.indexOf(":");
        if (colonIdx > 0 && colonIdx < 50) {
          var possibleSender = cleanPreview.substring(0, colonIdx).trim();
          possibleSender = cleanSenderName(possibleSender);
          if (possibleSender && possibleSender.length > 1) {
            sender = possibleSender;
          }
        }
      }

      // Extrair texto da mensagem
      var textSpans = previewSpan.querySelectorAll('span[dir="ltr"], span[dir="rtl"]');
      for (var s = 0; s < textSpans.length; s++) {
        var sp = textSpans[s];
        if (sp.getAttribute("aria-label")) continue;
        if (sp.closest && sp.closest('span[dir="auto"][aria-label]')) continue;
        var txt = sp.textContent.trim();
        if (txt) msgText += (msgText ? " " : "") + txt;
      }

      // Fallback: extrair mensagem do atributo title
      if (!msgText) {
        var fullText = fullPreview.replace(/[‎‏‪-‮]/g, "");
        if (sender && fullText.includes(sender)) {
          var afterSender = fullText.indexOf(sender) + sender.length;
          msgText = fullText.substring(afterSender).replace(/^[:\s~]+/, "").trim();
        } else {
          msgText = fullText;
        }
      }

      msgText = msgText.replace(/[‎‏‪-‮​ ]/g, " ").trim();
      if (!msgText || msgText.length < 2) {
        processedMessages.add(msgId);
        continue;
      }

      processedMessages.add(msgId);

      if (sender && isIgnored(sender)) continue;
      if (isMessageIgnored(msgText)) continue;

      if (msgText.length > 200) {
        msgText = msgText.substring(0, 200) + "...";
      }

      pendingAlerts.push({
        grupo: chatName,
        remetente: sender || "Desconhecido",
        mensagem: msgText,
      });
    }

    if (processedMessages.size > 500) {
      var arr = Array.from(processedMessages);
      processedMessages = new Set(arr.slice(arr.length - 250));
    }

    isScanning = false;
    flushAlerts();
  }

  function flushAlerts() {
    if (isSendingAlert || pendingAlerts.length === 0) return;
    isSendingAlert = true;
    var alert = pendingAlerts.shift();
    try {
      chrome.runtime.sendMessage({ type: "NEW_MESSAGE", data: alert }, function () {
        isSendingAlert = false;
        if (pendingAlerts.length > 0) {
          setTimeout(flushAlerts, 500);
        }
      });
    } catch (e) {
      window.__monitorGruposAtivo = false;
      isSendingAlert = false;
    }
  }

  function scheduleScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanSidebar, 2000);
  }

  function startObserver() {
    var target = document.querySelector("#pane-side") ||
                 document.querySelector('[aria-label*="lista"]') ||
                 document.querySelector("#app");

    if (!target) return false;

    var observer = new MutationObserver(function (mutations) {
      var relevant = false;
      for (var m = 0; m < mutations.length; m++) {
        var mut = mutations[m];
        if (mut.type === "attributes" && mut.attributeName === "title") {
          relevant = true;
          break;
        }
        if (mut.type === "childList" && mut.addedNodes.length > 0) {
          relevant = true;
          break;
        }
      }
      if (relevant) scheduleScan();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    return true;
  }

  function init() {
    var checkInterval = setInterval(function () {
      var app = document.querySelector("#app");
      if (!app) return;

      var containers = getChatContainers();
      if (containers.length === 0) return;

      clearInterval(checkInterval);

      chrome.runtime.sendMessage({ type: "STATUS_UPDATE", status: "conectado" });

      for (var i = 0; i < containers.length; i++) {
        var previewSpan = getPreviewSpan(containers[i]);
        if (!previewSpan) continue;
        var preview = previewSpan.getAttribute("title") || "";
        if (!preview) continue;
        var groupEl = getGroupNameSpan(containers[i]);
        if (groupEl) {
          processedMessages.add(groupEl.getAttribute("title") + "|" + preview);
        }
      }

      startObserver();

      setInterval(function () {
        if (config.ativo) scanSidebar();
      }, 10000);
    }, 2000);
  }

  // Diagnostico acessivel via console: window.__monitorDiagnostico()
  window.__monitorDiagnostico = function () {
    var pane = document.querySelector("#pane-side");
    console.log("=== Monitor de Grupos - Diagnostico ===");
    console.log("#pane-side:", pane ? "ENCONTRADO" : "NAO ENCONTRADO");
    console.log("#app:", document.querySelector("#app") ? "ENCONTRADO" : "NAO ENCONTRADO");

    var containers = getChatContainers();
    console.log("Chat containers encontrados:", containers.length);

    if (containers.length > 0) {
      var first = containers[0];
      var spans = getTopLevelTitleSpans(first);
      console.log("Primeiro container - span[title] encontrados:", spans.length);
      for (var j = 0; j < Math.min(spans.length, 5); j++) {
        console.log("  span[" + j + "]:", spans[j].getAttribute("title"));
      }
      console.log("Timestamp:", getTimestampText(first));
    }

    console.log("Config:", JSON.stringify(config));
    console.log("Ativo:", config.ativo);
    console.log("Mensagens processadas:", processedMessages.size);
    console.log("=======================================");
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 1000);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(init, 1000);
    });
  }
})();
