// Cloudflare Pages Function — cria o pagamento no Mercado Pago (Checkout Pro).
// Rota publicada: POST /api/criar-pagamento
// (arquivo em site/functions/api/criar-pagamento.js)
//
// Variáveis de ambiente (Cloudflare Pages > Settings > Environment variables).
// Marque como "Secret" as que são secretas:
//   MP_ACCESS_TOKEN            -> Access Token de PRODUÇÃO do Mercado Pago   (SECRETO)
//   SUPABASE_URL               -> https://rkegombxusjkdveieqrw.supabase.co
//   SUPABASE_ANON_KEY          -> chave anon (pública) do Supabase
//   SUPABASE_SERVICE_ROLE_KEY  -> chave service_role do Supabase            (SECRETO)
//   SITE_URL                   -> https://seu-dominio.com  (sem barra no fim)
//
// O navegador envia: Authorization: Bearer <token da sessão Supabase> e { ebook_id }.
// Regra de ouro: o PREÇO vem SEMPRE do banco, nunca do navegador.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  try {
    // 1) Quem é o comprador? Validamos o token da sessão no servidor.
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

    // 2) Qual ebook? Lemos o preço do banco (nunca confiar no navegador).
    const body = await request.json().catch(() => ({}));
    const ebookId = String(body.ebook_id || "").trim();
    if (!ebookId || ebookId.length > 64) return json({ erro: "ebook_invalido" }, 400);

    const svc = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    };

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

    // 3) Já comprou? Não cobra de novo.
    const libResp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/user_library?user_id=eq.${userId}` +
        `&ebook_id=eq.${encodeURIComponent(ebookId)}&select=ebook_id`,
      { headers: svc }
    );
    const jaTem = libResp.ok ? await libResp.json() : [];
    if (Array.isArray(jaTem) && jaTem.length) return json({ erro: "ja_adquirido" }, 409);

    // 4) Cria a preferência no Mercado Pago (Checkout Pro: Pix + cartão + boleto).
    const base = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const pref = {
      items: [
        {
          id: String(book.id),
          title: book.title ? String(book.title).slice(0, 250) : "Ebook",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(preco.toFixed(2)),
        },
      ],
      // Liga o pagamento ao comprador e ao ebook. É lido no webhook; não confiamos no navegador.
      external_reference: `${userId}:${ebookId}`,
      metadata: { user_id: userId, ebook_id: ebookId },
      notification_url: `${base}/api/webhook-mp`,
      back_urls: {
        success: `${base}/biblioteca.html?pago=1`,
        pending: `${base}/biblioteca.html?pendente=1`,
        failure: `${base}/devocionais.html?falhou=1`,
      },
      auto_return: "approved",
      statement_descriptor: "INTIMAGRACA",
      // Só cartão e Pix: remove boleto (ticket) e pagamento em lotérica/caixa (atm).
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
      },
    };

    const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(pref),
    });
    const pr = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok || !pr.init_point) return json({ erro: "falha_pagamento" }, 502);

    return json({ init_point: pr.init_point });
  } catch (e) {
    return json({ erro: "erro_interno" }, 500);
  }
}
