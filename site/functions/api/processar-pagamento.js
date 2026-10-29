// Cloudflare Pages Function — processa o pagamento (Checkout Bricks).
// Rota: POST /api/processar-pagamento
//
// Recebe do Payment Brick: { ebook_id, formData }.
//  - Cartão: formData tem token, installments, payment_method_id, issuer_id.
//  - Pix: formData sem token, payment_method_id "pix".
// O PREÇO vem SEMPRE do banco (nunca do navegador).
// Cartão aprovado -> entrega na hora. Pix -> devolve o QR; a entrega vem pelo webhook.

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function entregar(env, userId, ebookId, preco, paymentId) {
  const h = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
  await fetch(`${env.SUPABASE_URL}/rest/v1/orders?on_conflict=provider_payment_id`, {
    method: "POST",
    headers: { ...h, Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      ebook_id: ebookId,
      amount: Number(preco) || 0,
      status: "paid",
      provider: "mercadopago",
      provider_payment_id: String(paymentId),
    }),
  });
  await fetch(`${env.SUPABASE_URL}/rest/v1/user_library?on_conflict=user_id,ebook_id`, {
    method: "POST",
    headers: { ...h, Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, ebook_id: ebookId }),
  });
}

export async function onRequestPost({ request, env }) {
  try {
    // 1) Comprador (valida o token da sessão no servidor)
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ erro: "sem_sessao" }, 401);

    const userResp = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) return json({ erro: "sessao_invalida" }, 401);
    const user = await userResp.json();
    const userId = user && user.id;
    if (!userId) return json({ erro: "sessao_invalida" }, 401);

    // 2) Dados recebidos
    const body = await request.json().catch(() => ({}));
    const ebookId = String(body.ebook_id || "").trim();
    const fd = body.formData || {};
    if (!ebookId || ebookId.length > 64) return json({ erro: "ebook_invalido" }, 400);

    const svc = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    };

    // 3) Preço do banco
    const bookResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/books?id=eq.${encodeURIComponent(ebookId)}` +
        `&published=eq.true&select=id,title,price`,
      { headers: svc }
    );
    const books = bookResp.ok ? await bookResp.json() : [];
    const book = Array.isArray(books) ? books[0] : null;
    if (!book) return json({ erro: "ebook_nao_encontrado" }, 404);
    const preco = Number(book.price);
    if (!preco || preco <= 0) return json({ erro: "ebook_gratuito" }, 400);

    // 4) Já tem?
    const libResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/user_library?user_id=eq.${userId}` +
        `&ebook_id=eq.${encodeURIComponent(ebookId)}&select=ebook_id`,
      { headers: svc }
    );
    const jaTem = libResp.ok ? await libResp.json() : [];
    if (Array.isArray(jaTem) && jaTem.length) return json({ status: "approved", ja: true });

    const base = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");

    // 5) Monta o pagamento (preço sempre do banco)
    const pay = {
      transaction_amount: Number(preco.toFixed(2)),
      description: book.title ? String(book.title).slice(0, 250) : "Ebook",
      external_reference: `${userId}:${ebookId}`,
      notification_url: `${base}/api/webhook-mp`,
      metadata: { user_id: userId, ebook_id: ebookId },
      payer: {},
    };
    const payerEmail = (fd.payer && fd.payer.email) || user.email;
    if (payerEmail) pay.payer.email = payerEmail;
    if (fd.payer && fd.payer.identification && fd.payer.identification.number) {
      pay.payer.identification = fd.payer.identification;
    }

    if (fd.token) {
      // Cartão
      pay.token = fd.token;
      pay.installments = Number(fd.installments) || 1;
      if (fd.payment_method_id) pay.payment_method_id = fd.payment_method_id;
      if (fd.issuer_id) pay.issuer_id = fd.issuer_id;
    } else {
      // Pix (ou método sem token)
      pay.payment_method_id = fd.payment_method_id || "pix";
    }

    // 6) Cria o pagamento no Mercado Pago
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(pay),
    });
    const r = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok) return json({ erro: "falha_pagamento", detalhe: r.message || "" }, 502);

    const status = r.status;

    // 7) Aprovado na hora (cartão): entrega já. O webhook também entrega (é idempotente).
    if (status === "approved") {
      await entregar(env, userId, ebookId, preco, r.id);
    }

    // 8) Devolve o necessário (para o Pix, o QR vem aqui)
    const td = r.point_of_interaction && r.point_of_interaction.transaction_data;
    return json({
      status,
      status_detail: r.status_detail,
      id: r.id,
      qr_code: td ? td.qr_code : undefined,
      qr_code_base64: td ? td.qr_code_base64 : undefined,
      ticket_url: td ? td.ticket_url : undefined,
    });
  } catch (e) {
    return json({ erro: "erro_interno" }, 500);
  }
}
