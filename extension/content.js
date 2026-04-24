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

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === "CLICK_GROUP" && message.grupo) {
      var chatContainers = document.querySelectorAll("._ak72, [data-testid='cell-frame-container'], [role='listitem']");
      for (var i = 0; i < chatContainers.length; i++) {
        var nameEl = chatContainers[i].querySelector("._ak8q span[title]");
        if (nameEl && nameEl.getAttribute("title") === message.grupo) {
          chatContainers[i].querySelector("._ak8k, [data-testid='cell-frame-container']").click();
          break;
        }
      }
    }
  });

  // Extrai apenas digitos de uma string (para comparar numeros de telefone)
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

      // Comparacao por nome (exata, case-insensitive)
      if (senderUpper === valorUpper) {
        return true;
      }

      // Comparacao por numero de telefone (so digitos, ignora formatacao)
      if (valorDigits.length >= 8 && senderDigits.length >= 8) {
        // Checar se um termina com o outro (ignora codigo de pais)
        if (senderDigits.endsWith(valorDigits) || valorDigits.endsWith(senderDigits)) {
          return true;
        }
        // Igualdade exata dos digitos
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
      .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
      .replace(/^~\s*/, "")
      .replace(/^Talvez\s+/i, "")
      .replace(/:$/, "")
      .trim();
  }

  // Verifica se o timestamp indica mensagem de hoje (formato HH:MM)
  function isTodayTimestamp(timeText) {
    if (!timeText) return false;
    timeText = timeText.trim();
    if (/^\d{1,2}:\d{2}$/.test(timeText)) return true;
    return false;
  }

  function scanSidebar() {
    if (!config.ativo || isScanning) return;

    // Verificar se o contexto da extensao ainda e valido
    try {
      chrome.runtime.getURL("");
    } catch (e) {
      window.__monitorGruposAtivo = false;
      return;
    }

    isScanning = true;

    var chatItems = document.querySelectorAll("._ak8k");

    for (var i = 0; i < chatItems.length; i++) {
      var item = chatItems[i];

      // Primeiro checar o title do preview para rejeitar rapido ja processados
      var previewSpan = item.querySelector("span[title].x78zum5");
      if (!previewSpan) continue;

      var fullPreview = previewSpan.getAttribute("title") || "";
      if (!fullPreview) continue;

      // Subir ao container raiz do chat (._ak72)
      var chatContainer = item.closest("._ak72") ||
                          item.closest('[data-testid="cell-frame-container"]') ||
                          item.closest('[role="listitem"]') ||
                          item.parentElement.parentElement.parentElement;

      if (!chatContainer) continue;

      // Nome do grupo: span[title] dentro de ._ak8q
      var groupNameEl = chatContainer.querySelector("._ak8q span[title]");
      if (!groupNameEl) {
        var allTitleSpans = chatContainer.querySelectorAll("span[title][dir='auto']");
        for (var t = 0; t < allTitleSpans.length; t++) {
          var candidate = allTitleSpans[t];
          if (candidate !== previewSpan && candidate.getAttribute("title") !== fullPreview) {
            groupNameEl = candidate;
            break;
          }
        }
      }

      if (!groupNameEl) continue;
      var chatName = groupNameEl.getAttribute("title");
      if (!chatName) continue;

      // Rejeitar rapido: filtro de grupo e msgId antes de processar mais
      if (!matchesGroupFilter(chatName)) continue;

      var msgId = chatName + "|" + fullPreview;
      if (processedMessages.has(msgId)) continue;

      // Verificar timestamp: so processar mensagens de hoje (HH:MM)
      var timeCell = chatContainer.querySelector("._ak8o ._ak8i span") ||
                     chatContainer.querySelector("._ak8o ._ak8i");
      var timeText = timeCell ? timeCell.textContent.trim() : "";
      if (!isTodayTimestamp(timeText)) {
        // Marcar como processado para nao verificar novamente
        processedMessages.add(msgId);
        continue;
      }

      var sender = "";
      var msgText = "";

      // 1) Remetente via span[aria-label] dentro do preview (mais confiavel)
      var senderByLabel = previewSpan.querySelector("span[aria-label]");
      if (senderByLabel) {
        var label = senderByLabel.getAttribute("aria-label") || "";
        if (label && !label.includes("mensage") && !label.includes("não lida") && !label.includes("unread") && !label.includes("Conversa")) {
          sender = cleanSenderName(label);
        }
      }

      // 2) Fallback: span com dir="auto" e _ao3e (remetente em grupo)
      if (!sender) {
        var senderAo3e = previewSpan.querySelector('span[dir="auto"]._ao3e');
        if (senderAo3e && !senderAo3e.querySelector("img")) {
          sender = cleanSenderName(senderAo3e.textContent);
        }
      }

      // 3) Fallback: extrair do title (formato "Remetente: mensagem")
      if (!sender) {
        var cleanPreview = fullPreview.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
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
        var fullText = fullPreview.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
        if (sender && fullText.includes(sender)) {
          var afterSender = fullText.indexOf(sender) + sender.length;
          msgText = fullText.substring(afterSender).replace(/^[:\s~]+/, "").trim();
        } else {
          msgText = fullText;
        }
      }

      // Limpar caracteres invisiveis e validar conteudo real
      msgText = msgText.replace(/[\u200e\u200f\u202a-\u202e\u200b\u00a0]/g, " ").trim();
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

    // Limitar tamanho do Set de mensagens processadas
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
    // Debounce de 2 segundos para agrupar multiplas mutations
    scanTimeout = setTimeout(scanSidebar, 2000);
  }

  function startObserver() {
    // Tentar observar o container mais restrito possivel
    var target = document.querySelector("#pane-side") ||
                 document.querySelector('[aria-label*="lista"]') ||
                 document.querySelector("._ak8l");

    // Se nao achou container restrito, observar #app mas so atributos
    if (!target) {
      target = document.querySelector("#app");
    }
    if (!target) return false;

    var observer = new MutationObserver(function (mutations) {
      // So reagir se houve mudanca em atributo title (preview mudou)
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
      var hasChatItems = app && app.querySelectorAll("._ak8k").length > 0;
      if (app && hasChatItems) {
        clearInterval(checkInterval);

        chrome.runtime.sendMessage({ type: "STATUS_UPDATE", status: "conectado" });

        // Marcar previews atuais como ja processados
        var chatItems = document.querySelectorAll("._ak8k");
        for (var i = 0; i < chatItems.length; i++) {
          var previewSpan = chatItems[i].querySelector("span[title].x78zum5");
          if (!previewSpan) continue;
          var preview = previewSpan.getAttribute("title") || "";
          if (!preview) continue;
          var container = chatItems[i].closest("._ak72") ||
                          chatItems[i].parentElement.parentElement.parentElement;
          if (!container) continue;
          var groupEl = container.querySelector("._ak8q span[title]");
          if (groupEl) {
            processedMessages.add(groupEl.getAttribute("title") + "|" + preview);
          }
        }

        startObserver();

        // Scan periodico como fallback para abas em background
        // O Chrome throttle timers em background para ~1min, mas garante que funcione
        setInterval(function () {
          if (config.ativo) scanSidebar();
        }, 10000);
      }
    }, 2000);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 1000);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(init, 1000);
    });
  }
})();
