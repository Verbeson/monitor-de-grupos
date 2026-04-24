// Alert popup - Exibe alerta de nova mensagem
document.addEventListener("DOMContentLoaded", () => {
  var alertGrupo = "";

  chrome.storage.local.get(["lastAlert", "autoCloseSeconds"], (data) => {
    if (data.lastAlert) {
      alertGrupo = data.lastAlert.grupo || "";
      document.getElementById("grupo").textContent = data.lastAlert.grupo;
      document.getElementById("remetente").textContent = data.lastAlert.remetente;
      document.getElementById("mensagem").textContent = data.lastAlert.mensagem;
      chrome.storage.local.remove("lastAlert");
    }

    // Auto-fechamento configuravel
    var seconds = data.autoCloseSeconds || 0;
    if (seconds > 0) {
      var remaining = seconds;
      var btnOk = document.getElementById("btnOk");
      btnOk.textContent = "OK (" + remaining + "s)";

      var countdown = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(countdown);
          window.close();
        } else {
          btnOk.textContent = "OK (" + remaining + "s)";
        }
      }, 1000);
    }
  });

  document.getElementById("btnOpen").addEventListener("click", () => {
    if (alertGrupo) {
      chrome.runtime.sendMessage({ type: "OPEN_GROUP", grupo: alertGrupo });
    }
    window.close();
  });

  document.getElementById("btnOk").addEventListener("click", () => {
    window.close();
  });

  // Fechar com ESC ou Enter
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Enter") {
      window.close();
    }
  });

  // Chamar atencao uma unica vez ao abrir (sem setInterval)
  chrome.windows.getCurrent((win) => {
    if (win) {
      chrome.windows.update(win.id, { drawAttention: true });
    }
  });

  // Tocar som de notificacao do MSN
  try {
    const audioCtx = new AudioContext();
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 0.35;

    var notes = [
      { freq: 783.99, start: 0, dur: 0.1 },
      { freq: 659.25, start: 0.12, dur: 0.1 },
      { freq: 783.99, start: 0.24, dur: 0.1 },
      { freq: 987.77, start: 0.36, dur: 0.15 },
      { freq: 1046.50, start: 0.54, dur: 0.2 },
    ];

    notes.forEach((note) => {
      const osc = audioCtx.createOscillator();
      const noteGain = audioCtx.createGain();
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.type = "sine";
      osc.frequency.value = note.freq;
      noteGain.gain.setValueAtTime(0.8, audioCtx.currentTime + note.start);
      noteGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + note.start + note.dur);
      osc.start(audioCtx.currentTime + note.start);
      osc.stop(audioCtx.currentTime + note.start + note.dur + 0.05);
    });

    setTimeout(() => audioCtx.close(), 1500);
  } catch (_) {}
});
