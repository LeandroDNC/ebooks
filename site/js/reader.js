// Leitor: abre o ebook em formato de livro. O conteúdo só é entregue pelo banco
// para o administrador e para quem tem o ebook na biblioteca (políticas RLS).
import { supabase } from "./supabase.js";
import { buildSequence, FlipBook } from "./book-render.js";
import { Marcas } from "./reader-highlight.js";
import { iniciarFerramentas } from "./reader-tools.js";

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get("id");

function say(html) {
  $("#rd-msg").hidden = false;
  $("#rd-msg").innerHTML = html;
}

const FONTES = {
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,500",
  "Manrope": "Manrope:wght@400;600;700",
  "Playfair Display": "Playfair+Display:ital,wght@0,400;0,700;1,400",
  "Lora": "Lora:ital,wght@0,400;0,700;1,400",
  "Merriweather": "Merriweather:ital,wght@0,400;0,700;1,400",
  "Montserrat": "Montserrat:ital,wght@0,400;0,700;1,400",
  "Poppins": "Poppins:ital,wght@0,400;0,700;1,400",
  "Great Vibes": "Great+Vibes",
  "Dancing Script": "Dancing+Script:wght@400;700",
  "Parisienne": "Parisienne",
};

// Carrega do Google Fonts só as famílias que este livro usa (o leitor fica mais leve).
function carregarFontes(book) {
  const usadas = new Set(["Cormorant Garamond", "Manrope"]);
  (book.pages || []).forEach((p) => (p.blocks || []).forEach((b) => b.font && usadas.add(b.font)));
  Object.values(book.coverStyles || {}).forEach((s) => s && s.font && usadas.add(s.font));
  const fam = [...usadas].filter((f) => FONTES[f]).map((f) => `family=${FONTES[f]}`);
  if (!fam.length) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?${fam.join("&")}&display=swap`;
  document.head.appendChild(l);
}

// Livro de demonstração para testar o leitor sem banco: só em localhost, com ?demo=1
const DEMO = location.hostname === "localhost" && new URLSearchParams(location.search).has("demo");
const LIVRO_DEMO = {
  title: "Devocional das madrugadas", author: "Leandro Marques", coverColor: "#344E41", year: 2026, creditsPosition: "front",
  pages: [
    { id: "p1", bg: "#FFFFFF", blocks: [
      { id: "t1", type: "text", text: "Aquietai-vos", font: "Cormorant Garamond", size: 9, color: "#344E41", bold: true, align: "center" },
      { id: "t2", type: "text", text: "Aquietai-vos, e sabei que eu sou Deus; serei exaltado entre as nações, serei exaltado sobre a terra.\nHoje, respire fundo e entregue a pressa nas mãos de quem governa o tempo.", font: "Manrope", size: 4.2, color: "#344E41", align: "left" },
    ] },
    { id: "p2", bg: "#FFFFFF", blocks: [
      { id: "t3", type: "text", text: "Descanso", font: "Cormorant Garamond", size: 9, color: "#344E41", bold: true, align: "center" },
      { id: "t4", type: "text", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei. O descanso não é fuga: é confiança.", font: "Manrope", size: 4.2, color: "#344E41", align: "left" },
    ] },
  ],
};

async function iniciarLeitura(book, semBanco, progressoInicial = -1) {
  carregarFontes(book);
  document.title = `${book.title || "Devocional"} | Íntima Graça`;
  $("#rd-title").textContent = book.title || "";
  $("#rd-msg").hidden = true;
  $("#rd-book").hidden = false;
  $("#rd-nav").hidden = false;

  // ---- Progresso de leitura: página atual em localStorage (retomar) + percentual no banco ----
  const key = `intimagraca:read:${id || "demo"}`;
  let start = null;
  try {
    const v = localStorage.getItem(key);
    if (v !== null) start = Number(v) || 0;
  } catch { /* sem storage */ }

  // percentual já gravado (nunca diminui); veio junto com o livro, sem consulta extra
  let enviado = typeof progressoInicial === "number" ? progressoInicial : -1;

  const marcas = new Marcas(id || "demo");
  const seq = buildSequence(book, marcas.porBloco());
  const total = seq.length;
  if (start === null) start = enviado > 0 ? Math.max(0, Math.round((enviado / 100) * (total - 1))) : 0;

  let maisLonge = 0;
  let timer = null;
  const percentual = (i) => (total <= 1 ? 100 : Math.round((i / (total - 1)) * 100));

  // Gravações espaçadas: só quando avança >= 10 pontos e passaram >= 20 s (ou ao terminar/sair).
  // Ler um livro inteiro vira ~5 gravações, não uma por página.
  let ultimaGravacao = 0;
  async function salvarProgresso(forcar = false) {
    if (semBanco) return;
    const p = percentual(maisLonge);
    if (p <= enviado) return;
    if (!forcar && p < 100) {
      if (p - enviado < 10) return;
      if (Date.now() - ultimaGravacao < 20000) return;
    }
    const anterior = enviado;
    enviado = p;
    ultimaGravacao = Date.now();
    // ".lt": só grava se aumentou; o RLS garante que é a linha do próprio usuário
    const { error } = await supabase.from("user_library").update({ progress: p }).eq("ebook_id", id).lt("progress", p);
    if (error) enviado = anterior;
  }

  const flip = new FlipBook($("#rd-book"), seq.map((p) => p.html), (c, t) => {
    $("#rd-count").textContent = `${c + 1} / ${t} · ${percentual(Math.max(maisLonge, c))}%`;
    try { localStorage.setItem(key, String(c)); } catch { /* sem storage */ }
    if (c > maisLonge) maisLonge = c;
    clearTimeout(timer);
    timer = setTimeout(() => salvarProgresso(false), 1500);
  });
  if (start > 0) flip.goTo(start);

  // tema, descanso para os olhos, marcador e sons
  const ferramentas = iniciarFerramentas({ livroEl: $("#rd-book"), flip, seq, marcas });

  // o livro ocupa só a altura que sobra (sem rolagem na tela de leitura)
  const ajustarAltura = () => {
    const usado = ($(".rd-bar")?.offsetHeight || 0) + ($("#rd-tools")?.offsetHeight || 0) + ($("#rd-nav")?.offsetHeight || 0);
    const livre = window.innerHeight - usado - 30; // 44 = respiros e margens do bloco central
    document.documentElement.style.setProperty("--rd-livro-max", `${Math.max(120, livre)}px`);
  };
  ajustarAltura();
  addEventListener("resize", ajustarAltura);
  addEventListener("orientationchange", () => setTimeout(ajustarAltura, 250));
  if (window.visualViewport) visualViewport.addEventListener("resize", ajustarAltura);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarAltura);
  addEventListener("pagehide", () => ferramentas.amb.parar(0.1));

  // ao sair ou trocar de aba, grava na hora
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { clearTimeout(timer); salvarProgresso(true); }
  });
  addEventListener("pagehide", () => { clearTimeout(timer); salvarProgresso(true); });
  $("#rd-next").addEventListener("click", () => flip.next());
  $("#rd-prev").addEventListener("click", () => flip.prev());
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowRight") flip.next();
    if (e.key === "ArrowLeft") flip.prev();
  });
}

const SEM_FUNCAO = ["PGRST202", "42883"]; // função ainda não instalada no banco

/** Abre o livro com UMA chamada (abrir_livro). Sem a função instalada, usa 3 consultas (modo legado). */
async function abrirLivro(livroId) {
  const { data, error } = await supabase.rpc("abrir_livro", { p_id: livroId });
  if (!error && data) return data;
  if (error && !SEM_FUNCAO.includes(error.code)) return null;
  const [m, c, l] = await Promise.all([
    supabase.from("books").select("id,title,price,published").eq("id", livroId).maybeSingle(),
    supabase.from("book_content").select("data").eq("book_id", livroId).maybeSingle(),
    supabase.from("user_library").select("progress").eq("ebook_id", livroId).maybeSingle(),
  ]);
  if (c.error) return null;
  const b = m.data;
  return {
    meta: b ? { id: b.id, title: b.title, published: b.published, gratis: b.price == null || Number(b.price) === 0 } : null,
    conteudo: c.data ? c.data.data : null,
    progresso: l.data ? l.data.progress : null,
  };
}

(async () => {
  if (DEMO) return iniciarLeitura(LIVRO_DEMO, true);
  if (!supabase || !id) return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");

  const { data: session } = await supabase.auth.getSession(); // lê o armazenamento local, sem rede

  // Visitante sem login: só a vitrine pública (o livro é gratuito?)
  if (!session.session) {
    const { data: b } = await supabase.from("books").select("id,price,published").eq("id", id).maybeSingle();
    if (!b) return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");
    const livre = Boolean(b.published && (b.price == null || Number(b.price) === 0));
    const alvo = livre ? `biblioteca.html?obter=${encodeURIComponent(id)}` : "biblioteca.html";
    return say(`${livre ? "Este devocional é gratuito. Entre ou crie sua conta para obtê-lo." : "Entre na sua conta para ler este devocional."} <a class="btn btn--primary btn--sm" href="${alvo}">Entrar</a>`);
  }

  // Logada: UMA chamada ao banco com meta + conteúdo (se tiver direito) + progresso
  const r = await abrirLivro(id);
  if (!r) return say("Não foi possível abrir agora. Tente novamente em instantes.");
  const meta = r.meta;
  if (!meta) return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");
  const gratis = Boolean(meta.published && meta.gratis);

  if (!r.conteudo) {
    if (gratis) {
      say('Este devocional é gratuito. <button class="btn btn--primary btn--sm" type="button" id="rd-obter">Obter e ler</button>');
      document.querySelector("#rd-obter").addEventListener("click", async (ev) => {
        ev.target.disabled = true;
        const { error: e2 } = await supabase.rpc("obter_livro_gratis", { p_ebook_id: id });
        if (e2) { ev.target.disabled = false; return say("Não foi possível adicionar agora. Tente de novo."); }
        location.reload();
      });
      return;
    }
    return say("Este devocional ainda não está na sua biblioteca. <a href=\"devocionais.html\">Ver devocionais</a>");
  }

  return iniciarLeitura(r.conteudo, false, typeof r.progresso === "number" ? r.progresso : -1);
})();
