// Cloudflare Pages Function — webhook do Mercado Pago.
// Rota publicada: POST /api/webhook-mp   (arquivo em site/functions/api/webhook-mp.js)
//
// É AQUI que o ebook é entregue: valida a notificação, confirma o pagamento
// direto no Mercado Pago e grava em `orders` + `user_library` com a service_role.
// O navegador nunca participa desta etapa.
//
// Variável de ambiente extra (marque como Secret):
//   MP_WEBHOOK_SECRET -> "Assinatura secreta" gerada no painel de Webhooks do Mercado Pago.

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparação de tempo constante (não vaza onde a assinatura diverge).
function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function onRequestPost({ request, env }) {
  try {
    const url = new URL(request.url);
    const tipo = url.searchParams.get("type") || url.searchParams.get("topic");
    let dataId = url.searchParams.get("data.id") || url.searchParams.get("id");

    const bodyText = await request.text();
    let body = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      /* algumas notificações antigas vêm como form */
    }
    if (!dataId && body && body.data && body.data.id) dataId = String(body.data.id);
    const acao = body.action || "";

    // Só tratamos eventos de pagamento.
    if ((tipo && tipo !== "payment") || (acao && !acao.startsWith("payment"))) {
      return new Response("ok", { status: 200 });
    }
    if (!dataId) return new Response("ok", { status: 200 });

    // 1) Valida a assinatura x-signature (barra webhook falso).
    const xsig = request.headers.get("x-signature") || "";
    const xreq = request.headers.get("x-request-id") || "";
    const partes = Object.fromEntries(
      xsig
        .split(",")
        .map((p) => p.split("=").map((s) => s.trim()))
        .filter((a) => a.length === 2)
    );
    const ts = partes.ts;
    const v1 = partes.v1;
    if (!env.MP_WEBHOOK_SECRET || !ts || !v1) {
      return new Response("sem assinatura", { status: 401 });
    }

    let manifest = `id:${String(dataId).toLowerCase()};`;
    if (xreq) manifest += `request-id:${xreq};`;
    manifest += `ts:${ts};`;
    const esperado = await hmacHex(env.MP_WEBHOOK_SECRET, manifest);
    if (!igualSeguro(esperado, v1)) {
      return new Response("assinatura invalida", { status: 401 });
    }

    // 2) Confirma o pagamento direto no Mercado Pago (fonte da verdade).
    const payResp = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
      { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } }
    );
    if (!payResp.ok) return new Response("ok", { status: 200 });
    const pay = await payResp.json();

    if (pay.status !== "approved") return new Response("ok", { status: 200 });

    // 3) De quem é e qual ebook? Vem do external_reference que NÓS criamos.
    const ref = String(pay.external_reference || "");
    let userId, ebookId;
    if (ref.includes(":")) {
      [userId, ebookId] = ref.split(":");
    } else {
      userId = pay.metadata && pay.metadata.user_id;
      ebookId = pay.metadata && pay.metadata.ebook_id;
    }
    if (!userId || !ebookId) return new Response("ok", { status: 200 });

    const h = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    };

    // 4) Registra a venda. Idempotente pelo id do pagamento (webhook pode repetir).
    await fetch(`${env.SUPABASE_URL}/rest/v1/orders?on_conflict=provider_payment_id`, {
      method: "POST",
      headers: { ...h, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        ebook_id: ebookId,
        amount: Number(pay.transaction_amount) || 0,
        status: "paid",
        provider: "mercadopago",
        provider_payment_id: String(pay.id),
      }),
    });

    // 5) Entrega o ebook na biblioteca. Idempotente pela PK (user_id, ebook_id).
    await fetch(`${env.SUPABASE_URL}/rest/v1/user_library?on_conflict=user_id,ebook_id`, {
      method: "POST",
      headers: { ...h, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, ebook_id: ebookId }),
    });

    return new Response("ok", { status: 200 });
  } catch (e) {
    // Responder 200 evita reentrega infinita; o erro real fica nos logs da função.
    return new Response("ok", { status: 200 });
  }
}
