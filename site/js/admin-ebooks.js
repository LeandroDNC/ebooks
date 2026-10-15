// Biblioteca de ebooks do administrador: grade, filtros e escolha entre ver ou editar.
import { supabase } from "./supabase.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => UI.escapeHtml(s);
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MODO_TESTE = location.hostname === "localhost" && new URLSearchParams(location.search).has("dev");

let todos = [];
let ativo = null;

function amostra() {
  const cats = ["Mulheres", "Jovens", "Oração", "Casais", "Família", "Ansiedade"];
  const cores = ["#344E41", "#A3B18A", "#C6A667", "#8A6D2F", "#4E6B5C", "#6b7f5a"];
  const nomes = ["Café com Deus", "Jornada de 21 dias", "Oração das manhãs", "Casal em oração", "Descanso da alma", "Paz na tempestade", "Gratidão diária", "Fé em movimento"];
  return nomes.map((title, i) => ({
    id: "ex" + i, title, author: ["Ana Lima", "Marta Souza", "Paulo e Rita"][i % 3], category: cats[i % 6],
    price: i % 4 === 3 ? 0 : 24.9 + i, color: cores[i % 6], cover_url: "", published: i % 5 !== 4,
    updated_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  }));
}

async function carregar() {
  if (MODO_TESTE) return amostra();
  const { data } = await supabase.from("books")
    .select("id,title,author,category,price,color,cover_url,published,updated_at")
    .order("updated_at", { ascending: false }).limit(500);
  return data || [];
}

const gratis = (b) => b.price == null || Number(b.price) === 0;

function filtrar() {
  const q = $("#f-busca").value.trim().toLowerCase();
  const sit = $("#f-situacao").value, pre = $("#f-preco").value, cat = $("#f-categoria").value, ord = $("#f-ordem").value;
  let l = todos.filter((b) =>
    (!q || `${b.title} ${b.author || ""}`.toLowerCase().includes(q)) &&
    (!sit || (sit === "pub") === !!b.published) &&
    (!pre || (pre === "gratis") === gratis(b)) &&
    (!cat || b.category === cat));
  if (ord === "titulo") l = [...l].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  else if (ord === "preco") l = [...l].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  return l;
}

function desenhar() {
  const l = filtrar();
  $("#lib-contagem").textContent = `${l.length} de ${todos.length} ${todos.length === 1 ? "ebook" : "ebooks"}`;
  $("#lib-vazio").hidden = l.length > 0;
  $("#lib-grade").innerHTML = l.map((b) => `
    <li>
      <button class="lib-item" type="button" data-id="${esc(b.id)}" aria-label="${esc(b.title)}: ver ou editar">
        <span class="lib-item__capa"><span class="b3d b3d--lib"><span class="b3d__corpo">${UI.cover({ id: b.id, title: b.title, author: b.author, color: "forest", bg: b.color, cover: b.cover_url || "" })}</span></span></span>
        <span class="lib-item__titulo">${esc(b.title)}</span>
        <span class="lib-item__meta">
          <span class="status status--${b.published ? "on" : "off"}">${b.published ? "Publicado" : "Rascunho"}</span>
          <span class="lib-item__preco">${gratis(b) ? '<span class="tag-free">Free</span>' : BRL.format(Number(b.price))}</span>
        </span>
      </button>
    </li>`).join("");
}

function abrirEscolha(id) {
  const b = todos.find((x) => String(x.id) === id);
  if (!b) return;
  ativo = document.activeElement;
  $("#esc-titulo").textContent = b.title;
  $("#esc-capa").innerHTML = `<div class="b3d b3d--s"><div class="b3d__corpo">${UI.cover({ id: b.id, title: b.title, author: b.author, color: "forest", bg: b.color, cover: b.cover_url || "" })}</div></div>`;
  $("#esc-ver").href = `ler.html?id=${encodeURIComponent(b.id)}`;
  $("#esc-editar").href = `admin-ebook.html?id=${encodeURIComponent(b.id)}`;
  $("#escolha").hidden = false;
  $("#esc-editar").focus();
}
function fecharEscolha() {
  $("#escolha").hidden = true;
  if (ativo && ativo.focus) ativo.focus();
}

async function iniciar() {
  $("#gate").hidden = true;
  $("#app").hidden = false;
  document.querySelectorAll("[data-icon]").forEach((el) => {
    if (!el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", UI.icon(el.dataset.icon, Number(el.dataset.size) || 20));
  });
  todos = await carregar();
  const cats = [...new Set(todos.map((b) => b.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("#f-categoria").insertAdjacentHTML("beforeend", cats.map((c) => `<option>${esc(c)}</option>`).join(""));
  ["#f-busca", "#f-situacao", "#f-preco", "#f-categoria", "#f-ordem"].forEach((s) => $(s).addEventListener("input", desenhar));
  $("#f-limpar").addEventListener("click", () => {
    $("#f-busca").value = "";
    ["#f-situacao", "#f-preco", "#f-categoria"].forEach((s) => ($(s).value = ""));
    $("#f-ordem").value = "recente";
    desenhar();
  });
  $("#lib-grade").addEventListener("click", (e) => {
    const it = e.target.closest(".lib-item");
    if (it) abrirEscolha(it.dataset.id);
  });
  $("#esc-fechar").addEventListener("click", fecharEscolha);
  $("#escolha").addEventListener("click", (e) => { if (e.target.id === "escolha") fecharEscolha(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#escolha").hidden) fecharEscolha(); });
  desenhar();
}

async function gate() {
  const msg = $("#gate-msg");
  $("#btn-sair")?.addEventListener("click", async () => { await supabase?.auth.signOut(); location.reload(); });
  if (MODO_TESTE) return iniciar();
  if (!supabase) { msg.textContent = "Configure o Supabase em js/supabase.js."; return; }
  const verificar = async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return false;
    const { data: ok, error } = await supabase.rpc("is_admin");
    if (error) { msg.textContent = "Não foi possível validar o acesso. Tente novamente em instantes."; return false; }
    if (!ok) { msg.textContent = "Esta conta não é a administradora."; await supabase.auth.signOut(); return false; }
    return true;
  };
  if (await verificar()) return iniciar();
  $("#gate-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.textContent = "Aguarde…";
    const { error } = await supabase.auth.signInWithPassword({ email: $("#g-email").value.trim(), password: $("#g-pass").value });
    if (error) { msg.textContent = "E-mail ou senha incorretos."; return; }
    if (await verificar()) iniciar();
  });
}

document.addEventListener("dragstart", (e) => { if (e.target && e.target.tagName === "IMG") e.preventDefault(); });
gate();
