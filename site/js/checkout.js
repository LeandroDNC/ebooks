// Checkout: o botão "Comprar" cria o pagamento no servidor e leva ao Mercado Pago.
// Nada secreto aqui: só a sessão do usuário e o id do ebook. Preço e entrega são no servidor.
import { supabase } from "./supabase.js?v=202610291500";

async function comprar(id, btn) {
  if (!supabase) return;
  const label = btn.querySelector(".btn__label");
  const original = label ? label.innerHTML : "";

  const { data } = await supabase.auth.getSession();
  // Sem login: manda entrar e volta para concluir a compra (igual ao "Obter grátis").
  if (!data.session) {
    location.href = `biblioteca.html?comprar=${encodeURIComponent(id)}`;
    return;
  }

  btn.disabled = true;
  if (label) label.textContent = "Abrindo pagamento…";
  try {
    const resp = await fetch("/api/criar-pagamento", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ ebook_id: id }),
    });
    const r = await resp.json().catch(() => ({}));

    // Já tinha o livro: leva direto para a leitura.
    if (resp.status === 409 && r.erro === "ja_adquirido") {
      location.href = `ler.html?id=${encodeURIComponent(id)}`;
      return;
    }
    if (!resp.ok || !r.init_point) throw new Error(r.erro || "falha");
    location.href = r.init_point; // tela de pagamento do Mercado Pago
  } catch (e) {
    btn.disabled = false;
    if (label) {
      label.textContent = "Tentar de novo";
      setTimeout(() => {
        label.innerHTML = original;
      }, 2500);
    }
  }
}

// Delegação: vale para os cards criados depois (catálogo carregado do banco).
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-comprar]");
  if (!btn || btn.disabled) return;
  comprar(btn.dataset.comprar, btn);
});
