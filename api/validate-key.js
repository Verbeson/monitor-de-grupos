// POST /api/validate-key - Valida chave de licenca no servidor com HMAC

import { createHmac } from "crypto";

// Rate limiting em memoria
const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now - entry.start > RATE_WINDOW_MS) rateMap.delete(ip);
  }
}, 60 * 1000);

function validateKeyServer(key, secret) {
  key = key.trim().toUpperCase();
  const parts = key.split("-");
  if (parts.length !== 4 || parts[0] !== "MGP") return { valid: false, reason: "Formato invalido." };
  if (!/^\d{4}$/.test(parts[1])) return { valid: false, reason: "Bloco de data invalido." };
  if (!/^[A-Z0-9]{4}$/.test(parts[2]) || !/^[A-Z0-9]{4}$/.test(parts[3])) return { valid: false, reason: "Blocos de chave invalidos." };

  // Checksum client-side (soma charCodes divisivel por 7)
  const checkStr = parts[2] + parts[3];
  let sum = 0;
  for (let c = 0; c < checkStr.length; c++) sum += checkStr.charCodeAt(c);
  if (sum % 7 !== 0) return { valid: false, reason: "Chave invalida." };

  // Validacao server-side com HMAC: verifica que a chave foi gerada com o secret correto
  const payload = parts[0] + "-" + parts[1] + "-" + parts[2];
  const expectedBlock = createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .substring(0, 4)
    .toUpperCase();
  if (parts[3] !== expectedBlock) return { valid: false, reason: "Chave de licenca invalida." };

  // Verificar validade (AAMM)
  const yy = parseInt(parts[1].substring(0, 2), 10);
  const mm = parseInt(parts[1].substring(2, 4), 10);
  if (mm < 1 || mm > 12) return { valid: false, reason: "Mes invalido na chave." };
  const expDate = new Date(2000 + yy, mm, 0, 23, 59, 59);
  if (new Date() > expDate) {
    return { valid: false, reason: "Chave expirada em " + String(mm).padStart(2, "0") + "/" + (2000 + yy) + "." };
  }

  return { valid: true, expiry: String(mm).padStart(2, "0") + "/" + (2000 + yy) };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Muitas requisicoes. Tente novamente em 1 minuto." });
  }

  const { key } = req.body || {};
  if (!key || typeof key !== "string") {
    return res.status(400).json({ valid: false, reason: "Chave obrigatoria." });
  }

  const secret = process.env.LICENSE_SECRET;
  if (!secret) {
    return res.status(500).json({ valid: false, reason: "Servidor nao configurado." });
  }

  const result = validateKeyServer(key, secret);
  return res.status(200).json(result);
}
