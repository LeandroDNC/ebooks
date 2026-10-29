// Tela de pagamento (Checkout Bricks): Pix + cartão com validação, dentro do próprio site.
// O cartão é tokenizado pelo SDK do Mercado Pago no navegador (dados do cartão não passam
// pelo nosso servidor). O preço é validado no servidor; aqui é só a interface.
import { supabase } from "./supabase.js";

const $ = (s) => document.querySelector(s);
const brl = (n) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
const id = new URLSearchParams(location.search).get("id");

function msg(html) {
  $("#pg-carregando").hidden = true;
  $("#pg-brick").hidden = true;
  $("#pg-msg").hidden = false;
  $("#pg-msg").innerHTML = html;
}

(async () => {
  if (!supabase || !id) {
    return msg('Devocional não encontrado. <a href="devocionais.html">Voltar à loja</a>');
  }

  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    location.replace(`biblioteca.html?comprar=${encodeURIComponent(id)}`);
    return;
  }
  const user = sess.session.user;

  // Preço e título (vitrine pública)
  const { data: book, error } = await supabase
    .from("books")
    .select("id,title,price,published")
    .eq("id", id)
    .maybeSingle();
  if (error || !book || !book.published) {
    return msg('Devocional não encontrado. <a href="devocionais.html">Voltar à loja</a>');
  }
  const preco = Number(book.price);
  if (!preco || preco <= 0) {
    location.replace(`ler.html?id=${encodeURIComponent(id)}`); // gratuito
    return;
  }

  // Já comprou?
  const { data: jaTem } = await supabase
    .from("user_library")
    .select("ebook_id")
    .eq("ebook_id", id)
    .maybeSingle();
  if (jaTem) {
    return msg(
      'Você já tem este devocional. ' +
        '<a class="btn btn--primary btn--sm" href="ler.html?id=' + encodeURIComponent(id) + '">Ler agora</a>'
    );
  }

  $("#pg-titulo").textContent = book.title || "Devocional";
  $("#pg-preco").textContent = brl(preco);
  $("#pg-resumo").hidden = false;

  // Public Key (vem do servidor; pública por design)
  let publicKey = "";
  try {
    const r = await fetch("/api/config");
    publicKey = (await r.json()).public_key;
  } catch (_) { /* ignora */ }
  if (!publicKey || typeof MercadoPago === "undefined") {
    return msg("Pagamento indisponível no momento. Tente novamente mais tarde.");
  }

  const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
  const bricks = mp.bricks();

  await bricks.create("payment", "pg-brick", {
    initialization: {
      amount: preco,
      payer: { email: user.email || "" },
    },
    customization: {
      paymentMethods: {
        creditCard: "all",
        debitCard: "all",
        bankTransfer: "all", // Pix
        maxInstallments: 1,
      },
    },
    callbacks: {
      onReady: () => {
        $("#pg-carregando").hidden = true;
      },
      onSubmit: ({ formData }) =>
        new Promise((resolve, reject) => {
          fetch("/api/processar-pagamento", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${sess.session.access_token}`,
            },
            body: JSON.stringify({ ebook_id: id, formData }),
          })
            .then(async (resp) => {
              const r = await resp.json().catch(() => ({}));
              if (!resp.ok) {
                reject();
                return erro();
              }
              if (r.status === "approved") {
                resolve();
                return sucesso();
              }
              if (r.status === "pending" || r.status === "in_process") {
                resolve();
                if (r.qr_code_base64 || r.qr_code) return pix(r);
                return aguardando();
              }
              reject();
              return erro();
            })
            .catch(() => {
              reject();
              erro();
            });
        }),
      onError: (e) => {
        try { console.log("brick", e); } catch (_) {}
      },
    },
  });

  function sucesso() {
    msg(
      '<h2>Pagamento aprovado! 🎉</h2><p>O devocional já está na sua biblioteca.</p>' +
        '<a class="btn btn--primary btn--sm" href="ler.html?id=' + encodeURIComponent(id) + '">Ler agora</a>'
    );
  }
  function erro() {
    msg(
      'Não foi possível concluir o pagamento. Revise os dados e tente novamente. ' +
        '<a class="btn btn--secondary btn--sm" href="pagamento.html?id=' + encodeURIComponent(id) + '">Tentar de novo</a>'
    );
  }
  function aguardando() {
    msg("Aguardando a confirmação do pagamento. Assim que for aprovado, o devocional aparece na sua biblioteca.");
    poll();
  }
  function pix(r) {
    const img = r.qr_code_base64
      ? '<img alt="QR Code Pix" width="220" height="220" src="data:image/png;base64,' + r.qr_code_base64 + '">'
      : "";
    msg(
      '<h2>Pague com Pix</h2>' + img +
        "<p>Escaneie o QR Code no app do seu banco, ou copie o código abaixo:</p>" +
        '<textarea id="pg-pix-copia" readonly rows="3" style="width:100%">' + (r.qr_code || "") + "</textarea>" +
        '<button class="btn btn--primary btn--sm" id="pg-copiar" type="button">Copiar código Pix</button>' +
        '<p class="muted">Após o pagamento, o devocional aparece sozinho na sua biblioteca.</p>'
    );
    const btn = $("#pg-copiar");
    if (btn) {
      btn.addEventListener("click", () => {
        const t = $("#pg-pix-copia");
        try { t.select(); } catch (_) {}
        if (navigator.clipboard) navigator.clipboard.writeText(r.qr_code || "").catch(() => {});
        else try { document.execCommand("copy"); } catch (_) {}
        btn.textContent = "Copiado!";
      });
    }
    poll();
  }
  // Pix: verifica a biblioteca a cada 5s até o webhook entregar (máx ~5 min).
  function poll() {
    let n = 0;
    const iv = setInterval(async () => {
      n++;
      const { data } = await supabase
        .from("user_library")
        .select("ebook_id")
        .eq("ebook_id", id)
        .maybeSingle();
      if (data) {
        clearInterval(iv);
        sucesso();
      } else if (n > 60) {
        clearInterval(iv);
      }
    }, 5000);
  }
})();
