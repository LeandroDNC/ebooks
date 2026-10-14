// Catálogo: lê os ebooks PUBLICADOS no Supabase (tabela books) e mostra na loja.
// Se o banco não responder ou não houver publicados, a página mantém os exemplos de js/data.js.
import { supabase } from "./supabase.js";

const brl = (n) => (n == null ? "Preço a definir" : `R$ ${Number(n).toFixed(2).replace(".", ",")}`);

export async function fetchPublished() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("books")
    .select("id,title,author,category,price,color,cover_url,updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toCard);
}

/** Linha do banco -> formato usado por UI.ebookCard / UI.cover */
export function toCard(r) {
  return {
    id: r.id,
    title: r.title,
    author: r.author || "",
    category: r.category || "",
    price: brl(r.price),
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
