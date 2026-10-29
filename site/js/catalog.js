// Catálogo: lê os ebooks PUBLICADOS no Supabase (tabela books) e mostra na loja.
// Se o banco não responder ou não houver publicados, a página mantém os exemplos de js/data.js.
import { supabase } from "./supabase.js?v=202610291500";

const brl = (n) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
const ehGratis = (n) => n == null || Number(n) === 0;

const CACHE_KEY = "intimagraca:catalogo:v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 min: milhares de visitas viram 1 consulta por navegador
let emVoo = null;

function lerCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

/** Ebooks publicados. Cache de 5 min no navegador, consulta única em andamento e limite de 120. */
export async function fetchPublished() {
  if (!supabase) return [];
  const hit = lerCache();
  if (hit && Array.isArray(hit.itens) && Date.now() - hit.t < CACHE_TTL) return hit.itens.map(toCard);
  if (emVoo) return emVoo;

  emVoo = (async () => {
    const { data, error } = await supabase
      .from("books")
      .select("id,title,author,category,price,color,cover_url")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(120);
    if (error || !data) {
      // sem rede ou banco ocupado: usa o último catálogo guardado, mesmo velho
      return hit && Array.isArray(hit.itens) ? hit.itens.map(toCard) : [];
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), itens: data })); } catch { /* sem storage */ }
    return data.map(toCard);
  })();
  try {
    return await emVoo;
  } finally {
    emVoo = null;
  }
}

/** Linha do banco -> formato usado por UI.ebookCard / UI.cover */
export function toCard(r) {
  return {
    id: r.id,
    title: r.title,
    author: r.author || "",
    category: r.category || "",
    price: ehGratis(r.price) ? "Free" : brl(r.price),
    free: ehGratis(r.price),
    color: "forest",
    cover: r.cover_url || "",
    bg: r.color,
  };
}

/** Atualiza categorias com as contagens reais. */
export function updateCategoryCounts(books) {
  document.querySelectorAll("#categories-list .category").forEach((a) => {
    const name = a.querySelector(".category__name")?.textContent.trim();
    const n = books.filter((b) => b.category === name).length;
    const el = a.querySelector(".muted");
    if (el) el.textContent = n === 1 ? "1 ebook" : `${n} ebooks`;
  });
}

/** Adiciona um ebook gratuito à biblioteca. Sem login, leva para entrar e volta para concluir. */
export async function obterGratis(id) {
  if (!supabase) throw new Error("sem banco");
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    location.href = `biblioteca.html?obter=${encodeURIComponent(id)}`;
    return { redirecionando: true };
  }
  const { error } = await supabase.rpc("obter_livro_gratis", { p_ebook_id: id });
  if (error) throw error;
  return { ok: true };
}

/** Liga os botões "Obter grátis" (delegação: vale para cards criados depois). */
export function ligarObterGratis() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-claim]");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.claim;
    const label = btn.querySelector(".btn__label");
    btn.disabled = true;
    if (label) label.textContent = "Adicionando…";
    try {
      const r = await obterGratis(id);
      if (r.redirecionando) return;
      const ler = document.createElement("a");
      ler.className = "btn btn--primary btn--block btn--cart is-added";
      ler.href = `ler.html?id=${encodeURIComponent(id)}`;
      ler.innerHTML = `${UI.icon("book", 18)}<span class="btn__label">Na biblioteca · Ler</span>`;
      btn.replaceWith(ler);
    } catch (err) {
      btn.disabled = false;
      if (label) label.textContent = "Tentar de novo";
    }
  });
}
