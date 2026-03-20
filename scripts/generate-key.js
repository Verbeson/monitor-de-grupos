#!/usr/bin/env node
// Gerador de chaves de licenca Pro - Monitor de Grupos
// Uso: node scripts/generate-key.js [AAMM]
// Exemplo: node scripts/generate-key.js 2612  (valida ate dezembro/2026)
//          node scripts/generate-key.js        (valida ate o mes atual + 1 mes)

import { createHmac, randomBytes } from "crypto";

const LICENSE_SECRET = process.env.LICENSE_SECRET;
if (!LICENSE_SECRET) {
  console.error("Erro: defina a variavel LICENSE_SECRET.");
  console.error("Exemplo: LICENSE_SECRET='sua-secret' node scripts/generate-key.js");
  process.exit(1);
}

// Pegar AAMM do argumento ou gerar padrao (+1 mes)
let aamm = process.argv[2];
if (!aamm) {
  const now = new Date();
  let month = now.getMonth() + 2; // +1 porque getMonth e 0-based, +1 para proximo mes
  let year = now.getFullYear() - 2000;
  if (month > 12) {
    month = 1;
    year++;
  }
  aamm = String(year).padStart(2, "0") + String(month).padStart(2, "0");
}

if (!/^\d{4}$/.test(aamm)) {
  console.error("Erro: AAMM deve ter 4 digitos. Exemplo: 2612");
  process.exit(1);
}

const mm = parseInt(aamm.substring(2, 4), 10);
if (mm < 1 || mm > 12) {
  console.error("Erro: mes invalido. Use 01-12.");
  process.exit(1);
}

// Gerar bloco 3 (4 caracteres alfanumericos aleatorios)
function randomBlock() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(4);
  let block = "";
  for (let i = 0; i < 4; i++) {
    block += chars[bytes[i] % chars.length];
  }
  return block;
}

// Gerar bloco 4 via HMAC do payload
function generateBlock4(prefix, aamm, block3) {
  const payload = prefix + "-" + aamm + "-" + block3;
  return createHmac("sha256", LICENSE_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 4)
    .toUpperCase();
}

// Gerar ate encontrar uma chave que tambem passe o checksum client-side (soma % 7 === 0)
let attempts = 0;
while (attempts < 10000) {
  const block3 = randomBlock();
  const block4 = generateBlock4("MGP", aamm, block3);

  // Verificar checksum client-side
  const checkStr = block3 + block4;
  let sum = 0;
  for (let c = 0; c < checkStr.length; c++) sum += checkStr.charCodeAt(c);

  if (sum % 7 === 0) {
    const key = `MGP-${aamm}-${block3}-${block4}`;
    const expYear = 2000 + parseInt(aamm.substring(0, 2), 10);
    const expMonth = aamm.substring(2, 4);

    console.log("");
    console.log("  Chave gerada com sucesso!");
    console.log("");
    console.log(`  Chave:     ${key}`);
    console.log(`  Validade:  ${expMonth}/${expYear}`);
    console.log("");
    process.exit(0);
  }

  attempts++;
}

console.error("Erro: nao foi possivel gerar chave apos 10000 tentativas. Tente novamente.");
process.exit(1);
