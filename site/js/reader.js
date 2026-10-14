// Leitor: abre o ebook em formato de livro. O conteúdo só é entregue pelo banco
// para o administrador e para quem tem o ebook na biblioteca (políticas RLS).
import { supabase } from "./supabase.js";
import { buildSequence, FlipBook } from "./book-render.js";

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get("id");

function say(html) {
  $("#rd-msg").hidden = false;
  $("#rd-msg").innerHTML = html;
}

(async () => {
  if (!supabase || !id) return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    return say("Entre na sua conta para ler este devocional. <a class=\"btn btn--primary btn--sm\" href=\"biblioteca.html\">Entrar</a>");
  }

  const { data, error } = await supabase.from("book_content").select("data").eq("book_id", id).maybeSingle();
  if (error) return say("Não foi possível abrir agora. Tente novamente em instantes.");
  if (!data) {
    return say("Este devocional ainda não está na sua biblioteca. <a href=\"devocionais.html\">Ver devocionais</a>");
  }

  const book = data.data;
  document.title = `${book.title || "Devocional"} | LIZIVIDA`;
  $("#rd-title").textContent = book.title || "";
  $("#rd-msg").hidden = true;
  $("#rd-book").hidden = false;
  $("#rd-nav").hidden = false;

  const key = `lizivida:read:${id}`;
  let start = 0;
  try { start = Number(localStorage.getItem(key)) || 0; } catch { /* sem storage */ }

  const flip = new FlipBook($("#rd-book"), buildSequence(book).map((p) => p.html), (c, t) => {
    $("#rd-count").textContent = `${c + 1} / ${t}`;
    try { localStorage.setItem(key, String(c)); } catch { /* sem storage */ }
  });
  if (start > 0) flip.goTo(start);
  $("#rd-next").addEventListener("click", () => flip.next());
  $("#rd-prev").addEventListener("click", () => flip.prev());
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") flip.next();
    if (e.key === "ArrowLeft") flip.prev();
  });
})();
