// Checkout: o botão "Comprar" leva para a tela de pagamento do próprio site (Pix + cartão).
import { supabase } from "./supabase.js";

async function comprar(id) {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  // Sem login: entra e volta para concluir a compra (igual ao "Obter grátis").
  if (!data.session) {
    location.href = `biblioteca.html?comprar=${encodeURIComponent(id)}`;
    return;
  }
  location.href = `pagamento.html?id=${encodeURIComponent(id)}`;
}

// Delegação: vale para os cards criados depois (catálogo carregado do banco).
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-comprar]");
  if (!btn || btn.disabled) return;
  comprar(btn.dataset.comprar);
});
