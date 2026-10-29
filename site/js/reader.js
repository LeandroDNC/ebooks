// Leitor: abre o ebook em formato de livro. O conteúdo só é entregue pelo banco
// para o administrador e para quem tem o ebook na biblioteca (políticas RLS).
import { supabase } from "./supabase.js?v=202610291500";
import { buildSequence, FlipBook, renderCover, renderPage } from "./book-render.js?v=202610291500";
import { Marcas } from "./reader-highlight.js?v=202610291500";
import { iniciarFerramentas } from "./reader-tools.js?v=202610291500";

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

const brl = (n) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

// Amostra grátis: capa + primeira página, com convite para comprar/entrar.
// Não precisa comprar para ver isto (função previa_livro no banco).
async function mostrarPrevia(logado) {
  const { data } = await supabase.rpc("previa_livro", { p_id: id });
  if (!data || !data.capa) {
    return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");
  }
  const capa = data.capa;
  const meta = data.meta || {};
  const book = {
    title: capa.title || meta.title || "",
    author: capa.author || meta.author || "",
    coverColor: capa.coverColor,
    coverImage: capa.coverImage,
    coverArt: capa.coverArt,
    coverStyles: capa.coverStyles,
    pages: data.primeira_pagina ? [data.primeira_pagina] : [],
  };
  carregarFontes(book);
  document.title = `${book.title || "Amostra"} | Íntima Graça`;
  $("#rd-title").textContent = book.title || "";
  $("#rd-msg").hidden = true;
  $("#rd-book").hidden = false;
  $("#rd-nav").hidden = false;

  const paginas = [renderCover(book)];
  if (data.primeira_pagina) paginas.push(renderPage(data.primeira_pagina, null, false, null));

  const flip = new FlipBook($("#rd-book"), paginas, (c, t) => {
    $("#rd-count").textContent = `Amostra grátis · ${c + 1} / ${t}`;
  });

  const ajustar = () => {
    const usado = ($(".rd-bar")?.offsetHeight || 0) + ($("#rd-nav")?.offsetHeight || 0) + 140;
    document.documentElement.style.setProperty("--rd-livro-max", `${Math.max(120, window.innerHeight - usado)}px`);
  };
  ajustar();
  addEventListener("resize", ajustar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);

  $("#rd-next").addEventListener("click", () => flip.next());
  $("#rd-prev").addEventListener("click", () => flip.prev());
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowRight") flip.next();
    if (e.key === "ArrowLeft") flip.prev();
  });

  // Convite abaixo do livro
  const preco = meta.price != null && Number(meta.price) > 0 ? ` · ${brl(meta.price)}` : "";
  const cta = document.createElement("div");
  cta.setAttribute(
    "style",
    "margin:14px auto 0;max-width:460px;text-align:center;padding:14px 16px;border-radius:14px;" +
      "background:rgba(52,78,65,.06);border:1px solid rgba(52,78,65,.12)"
  );
  cta.innerHTML =
    '<p style="margin:0 0 10px;font-weight:600">Amostra grátis — leia tudo adquirindo o devocional.</p>' +
    (logado
      ? '<button class="btn btn--primary btn--sm" type="button" id="rd-comprar">Comprar e ler tudo' + preco + "</button>"
      : '<a class="btn btn--primary btn--sm" href="biblioteca.html?comprar=' +
        encodeURIComponent(id) +
        '">Entrar e comprar' + preco + "</a>");
  document.querySelector(".rd-main")?.appendChild(cta);
  if (logado) {
    $("#rd-comprar")?.addEventListener("click", () => {
      location.href = `pagamento.html?id=${encodeURIComponent(id)}`;
    });
  }
}

(async () => {
  if (DEMO) return iniciarLeitura(LIVRO_DEMO, true);
  if (!supabase || !id) return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");

  const { data: session } = await supabase.auth.getSession(); // lê o armazenamento local, sem rede

  // Visitante sem login: só a vitrine pública (o livro é gratuito?)
  if (!session.session) {
    const { data: b } = await supabase.from("books").select("id,price,published").eq("id", id).maybeSingle();
    if (!b || !b.published) return say("Devocional não encontrado. <a href=\"devocionais.html\">Ver devocionais</a>");
    const livre = b.price == null || Number(b.price) === 0;
    if (livre) {
      return say('Este devocional é gratuito. <a class="btn btn--primary btn--sm" href="biblioteca.html?obter=' + encodeURIComponent(id) + '">Entrar e obter</a>');
    }
    return mostrarPrevia(false); // amostra grátis para visitante
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
    return mostrarPrevia(true); // amostra grátis + botão comprar
  }

  return iniciarLeitura(r.conteudo, false, typeof r.progresso === "number" ? r.progresso : -1);
})();
