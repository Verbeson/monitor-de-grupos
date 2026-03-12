// POST /api/check - Verifica se email tem assinatura ativa no Mercado Pago
export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email obrigatorio" });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: "Servidor nao configurado" });
  }

  try {
    // Buscar assinaturas (preapproval) do email no Mercado Pago
    const searchUrl = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(email.trim().toLowerCase())}&status=authorized&sort=date_created&criteria=desc&limit=5`;

    const response = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MP API error:", response.status, errText);
      return res.status(502).json({ pro: false, error: "Erro ao consultar pagamento" });
    }

    const data = await response.json();
    const results = data.results || [];

    // Verificar se existe assinatura ativa (authorized)
    const activeSubscription = results.find((sub) => {
      return sub.status === "authorized" && sub.payer_email?.toLowerCase() === email.trim().toLowerCase();
    });

    if (activeSubscription) {
      return res.status(200).json({
        pro: true,
        status: "active",
        nextPayment: activeSubscription.next_payment_date || null,
        planId: activeSubscription.preapproval_plan_id || null,
      });
    }

    // Verificar se tem assinatura pausada (pode estar em grace period)
    const pausedUrl = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(email.trim().toLowerCase())}&status=paused&limit=3`;
    const pausedResponse = await fetch(pausedUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (pausedResponse.ok) {
      const pausedData = await pausedResponse.json();
      const pausedSub = (pausedData.results || []).find((sub) => {
        return sub.payer_email?.toLowerCase() === email.trim().toLowerCase();
      });

      if (pausedSub) {
        return res.status(200).json({
          pro: false,
          status: "paused",
          message: "Assinatura pausada. Regularize o pagamento.",
        });
      }
    }

    return res.status(200).json({
      pro: false,
      status: "none",
      message: "Nenhuma assinatura encontrada para este email.",
    });
  } catch (err) {
    console.error("Check error:", err);
    return res.status(500).json({ pro: false, error: "Erro interno" });
  }
}
