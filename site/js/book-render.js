// Renderização do ebook (usada pelo editor e, futuramente, pelo leitor do cliente).
// Cada página é um bloco em "container query": tamanhos de fonte em cqw escalam com a largura da página.

export const FONTS = [
  { name: "Cormorant Garamond", css: "'Cormorant Garamond', serif" },
  { name: "Playfair Display", css: "'Playfair Display', serif" },
  { name: "Lora", css: "'Lora', serif" },
  { name: "Merriweather", css: "'Merriweather', serif" },
  { name: "Manrope", css: "'Manrope', sans-serif" },
  { name: "Montserrat", css: "'Montserrat', sans-serif" },
  { name: "Poppins", css: "'Poppins', sans-serif" },
  { name: "Great Vibes", css: "'Great Vibes', cursive" },
  { name: "Dancing Script", css: "'Dancing Script', cursive" },
  { name: "Parisienne", css: "'Parisienne', cursive" },
];

export const LOGO = "assets/logo-intima-graca.svg";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---- Saneamento: o conteúdo vem do banco; nada dele entra em atributo/estilo sem validar ----
const ALINHAMENTOS = ["left", "center", "right", "justify"];
const ESTILOS_LINHA = ["solid", "dashed", "dotted", "double", "fade", "ornament"];
const CORES_MARCA = ["amarelo", "verde", "rosa", "azul"];
const pick = (v, permitidos, padrao) => (permitidos.includes(v) ? v : padrao);
const RE_COR = /^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla)\([0-9a-zA-Z.,%\s/-]{1,40}\)|[a-zA-Z]{3,20})$/;
const cor = (v, padrao) => (typeof v === "string" && RE_COR.test(v.trim()) ? v.trim() : padrao);
/** Só http(s), caminhos relativos e data:image. Qualquer outra coisa (javascript:, etc.) vira "". */
function safeUrl(v) {
  if (typeof v !== "string" || !v || v.length > 4000) return "";
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
  try {
    const u = new URL(v, "https://exemplo.invalid/");
    return /^https?:$/.test(u.protocol) || /^[\w./-]+$/.test(v) ? v : "";
  } catch {
    return "";
  }
}

const fontCss = (name) => (FONTS.find((f) => f.name === name) || FONTS[0]).css;

function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const logoTag = (bg) =>
  `<img class="bk-logo${luminance(bg) < 0.4 ? " is-light" : ""}" src="${LOGO}" alt="Íntima Graça" draggable="false">`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const handleHtml = '<span class="bk-handle" data-handle="1" aria-hidden="true"></span>';

/** Estilo de posição livre (x, y, largura em % da página). */
function freeStyle(f) {
  if (!f) return "";
  return `position:absolute;left:${Number(f.x) || 0}%;top:${Number(f.y) || 0}%;width:${clamp(Number(f.w) || 40, 5, 100)}%;margin:0;z-index:2;`;
}

/** Texto com marcações (<mark>). `marcas`: [{s, e, c, id}] em posições do texto original. */
function textoHtml(text, marcas) {
  const t = String(text ?? "");
  const nl = (x) => esc(x).replace(/\n/g, "<br>");
  if (!marcas || !marcas.length) return nl(t) || "&nbsp;";
  const ms = [...marcas].filter((m) => m.e > m.s).sort((a, b) => a.s - b.s);
  let out = "";
  let pos = 0;
  for (const m of ms) {
    const ini = Math.max(m.s, pos);
    const fim = Math.min(m.e, t.length);
    if (fim <= ini) continue;
    out += nl(t.slice(pos, ini));
    out += `<mark class="bk-mark bk-mark--${pick(m.c, CORES_MARCA, "amarelo")}" data-marca="${esc(m.id || "")}">${nl(t.slice(ini, fim))}</mark>`;
    pos = fim;
  }
  out += nl(t.slice(pos));
  return out || "&nbsp;";
}

function blockHtml(b, selectedId, editor, marcas) {
  const sel = b.id === selectedId ? " is-selected" : "";
  const h = sel && editor ? handleHtml : "";
  const free = freeStyle(b.free);
  if (b.type === "text") {
    const style = [
      `font-family:${fontCss(b.font)}`,
      `font-size:${Number(b.size) || 4}cqw`,
      `color:${cor(b.color, "#344E41")}`,
      `font-weight:${b.bold ? 700 : 400}`,
      `font-style:${b.italic ? "italic" : "normal"}`,
      `text-decoration:${b.underline ? "underline" : "none"}`,
      `text-align:${pick(b.align, ALINHAMENTOS, "left")}`,
    ].join(";");
    return `<p class="bk-block bk-text${sel}" data-block="${esc(b.id)}" style="${free}${style}">${textoHtml(b.text, marcas)}${h}</p>`;
  }
  if (b.type === "image") {
    const iw = b.free ? 100 : Number(b.width) || 100;
    const img = safeUrl(b.src)
      ? `<img src="${esc(safeUrl(b.src))}" alt="${esc(b.alt || "")}" draggable="false" style="width:${iw}%;border-radius:${Number(b.radius) || 0}px">`
      : `<span class="bk-img-empty">Foto</span>`;
    return `<figure class="bk-block bk-img${sel}" data-block="${esc(b.id)}" style="${free}text-align:${pick(b.align, ALINHAMENTOS, "center")}">${img}${h}</figure>`;
  }
  if (b.type === "line") {
    const w = b.free ? 100 : Number(b.width) || 60;
    const th = Number(b.thickness) || 2;
    const col = cor(b.color, "#C6A667");
    const st = pick(b.style, ESTILOS_LINHA, "solid");
    const just = b.align === "left" ? "flex-start" : b.align === "right" ? "flex-end" : "center";
    let inner;
    if (st === "ornament") {
      inner = `<span class="bk-line-in bk-orn" style="width:${w}%;--c:${col};--t:${th}px"><i></i><b></b><i></i></span>`;
    } else if (st === "fade") {
      inner = `<span class="bk-line-in" style="width:${w}%;height:${th}px;background:linear-gradient(90deg,transparent,${col},transparent)"></span>`;
    } else if (st === "double") {
      inner = `<span class="bk-line-in" style="width:${w}%;border-top:${th * 3}px double ${col}"></span>`;
    } else {
      inner = `<span class="bk-line-in" style="width:${w}%;border-top:${th}px ${st} ${col}"></span>`;
    }
    return `<div class="bk-block bk-line${sel}" data-block="${esc(b.id)}" style="${free}justify-content:${just}">${inner}${h}</div>`;
  }
  return "";
}

/** Página de conteúdo. Blocos "livres" ficam fora do fluxo, posicionados na página. */
export function renderPage(page, selectedId = null, editor = false, marcas = null) {
  const bg = cor(page.bg, "#FFFFFF");
  const blocks = page.blocks || [];
  const flow = blocks.filter((b) => !b.free).map((b) => blockHtml(b, selectedId, editor, marcas && marcas[b.id])).join("");
  const free = blocks.filter((b) => b.free).map((b) => blockHtml(b, selectedId, editor, marcas && marcas[b.id])).join("");
  return `<div class="bk-page" style="background:${cor(bg, "#FFFFFF")}">
    <div class="bk-body">${flow}</div>
    ${free}
    ${logoTag(bg)}
  </div>`;
}

function coverArtHtml(art, sel) {
  if (!art || !safeUrl(art.src)) return "";
  const cls = `bk-art bk-block${sel ? " is-selected" : ""}`;
  const size = Number(art.size) || 50;
  const pos = `left:${Number(art.x) || 50}%;top:${Number(art.y) || 35}%;width:${size}%;`;
  const ratio = Number(art.ratio) > 0 ? Number(art.ratio) : 1;
  if (art.recolor === false) {
    return `<img class="${cls}" data-block="cover-art" src="${esc(safeUrl(art.src))}" alt="" draggable="false" style="${pos}">`;
  }
  // Recolor: a imagem vira máscara e recebe a cor escolhida (vale para SVG e PNG de uma cor/transparência).
  const m = `url('${String(safeUrl(art.src)).replace(/['"()\\]/g, (c) => "%" + c.charCodeAt(0).toString(16))}')`;
  return `<span class="${cls} bk-art--mask" data-block="cover-art" role="presentation" style="${pos}aspect-ratio:${ratio};background-color:${cor(art.color, "#C6A667")};-webkit-mask-image:${esc(m)};mask-image:${esc(m)}"></span>`;
}

const COVER_DEFAULTS = {
  "cover-title": { font: "Cormorant Garamond", size: 9, color: null, bold: true, italic: false, underline: false, align: "center" },
  "cover-author": { font: "Manrope", size: 3.2, color: null, bold: false, italic: false, underline: false, align: "center" },
};

/** Estilo (mesclado com o padrão) de um texto da capa. */
export function coverAutoColor(book) {
  return book.coverImage || luminance(book.coverColor || "#344E41") < 0.4 ? "#F8F6F0" : "#1F3329";
}

export function coverStyle(book, id) {
  return { ...COVER_DEFAULTS[id], ...(book.coverStyles?.[id] || {}) };
}

function coverTextStyle(st, auto) {
  return [
    `font-family:${fontCss(st.font)}`,
    `font-size:${Number(st.size) || 4}cqw`,
    `color:${cor(st.color || auto, auto)}`,
    `font-weight:${st.bold ? 700 : 400}`,
    `font-style:${st.italic ? "italic" : "normal"}`,
    `text-decoration:${st.underline ? "underline" : "none"}`,
    `text-align:${pick(st.align, ALINHAMENTOS, "center")}`,
  ].join(";");
}

export function renderCover(book, selectedId = null, editor = false) {
  const bg = cor(book.coverColor, "#344E41");
  const withImg = !!safeUrl(book.coverImage);
  const auto = withImg || luminance(bg) < 0.4 ? "#F8F6F0" : "#1F3329";
  const img = withImg ? `<img class="bk-cover-img" src="${esc(safeUrl(book.coverImage))}" alt="" draggable="false">` : "";
  const mk = (id, tag, extra, text) => {
    const st = coverStyle(book, id);
    const on = selectedId === id;
    const free = freeStyle(st.free);
    const el = `<${tag} class="bk-block${extra}${on ? " is-selected" : ""}" data-block="${id}" style="${free}${coverTextStyle(st, auto)}">${esc(text)}${on && editor ? handleHtml : ""}</${tag}>`;
    return { el, free: !!st.free };
  };
  const t = mk("cover-title", "h1", "", book.title || "Título do ebook");
  const a = mk("cover-author", "p", " bk-cover-author", book.author || "Nome da autora");
  return `<div class="bk-page bk-cover" style="background:${cor(bg, "#344E41")};color:${auto}">
    ${img}
    ${coverArtHtml(book.coverArt, selectedId === "cover-art")}
    <div class="bk-cover-text${withImg ? " has-img" : ""}">${t.free ? "" : t.el}${a.free ? "" : a.el}</div>
    ${t.free ? t.el : ""}${a.free ? a.el : ""}
    ${logoTag(withImg ? "#000000" : bg)}
  </div>`;
}

/** Página de créditos e direitos autorais (gerada automaticamente). */
export function creditsPage(book) {
  const year = book.year || new Date().getFullYear();
  const holder = book.holder || book.author || "Nome do titular";
  const lines = [
    book.title || "Título do ebook",
    book.author ? `Autoria: ${book.author}` : "",
    `© ${year} ${holder}. Todos os direitos reservados.`,
    book.isbn ? `ISBN: ${book.isbn}` : "",
    book.creditsText || "",
    "Publicado por Íntima Graça. A reprodução, total ou parcial, sem autorização prévia é proibida (Lei nº 9.610/1998).",
  ].filter(Boolean);
  return {
    id: "credits",
    bg: "#F8F6F0",
    blocks: lines.map((t, i) => ({
      id: "c" + i, type: "text", text: t, font: i === 0 ? "Cormorant Garamond" : "Manrope",
      size: i === 0 ? 6 : 2.6, color: "#344E41", bold: i === 0, italic: false, underline: false, align: "center",
    })),
  };
}

/** Sequência final de páginas: capa, créditos (início ou fim) e conteúdo. */
export function buildSequence(book, marcas = null) {
  const cred = creditsPage(book);
  const credits = { html: renderPage(cred, null, false, marcas), kind: "credits", page: cred };
  const seq = [{ html: renderCover(book), kind: "cover", page: null }];
  const front = (book.creditsPosition || "front") === "front";
  if (front) seq.push(credits);
  (book.pages || []).forEach((p) => seq.push({ html: renderPage(p, null, false, marcas), kind: "page", page: p }));
  if (!front) seq.push(credits);
  return seq;
}

/**
 * Livro com virada de página 3D.
 * - A folha acompanha o dedo/mouse (arrastar) e termina com animação suave.
 * - Sombra dinâmica na dobra, leve curvatura (skew) e sombra projetada na página de baixo.
 * - Toque/clique na metade direita avança, na esquerda volta.
 */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class FlipBook {
  constructor(root, pagesHtml, onChange) {
    this.root = root;
    this.onChange = onChange;
    this.current = 0;
    this.total = pagesHtml.length;
    this.busy = false;
    this.locked = false;
    this.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("bk-book");
    root.innerHTML = pagesHtml
      .map((h) => `<div class="bk-sheet">
          <div class="bk-face bk-front">${h}<i class="bk-shade"></i><i class="bk-cast"></i></div>
          <div class="bk-face bk-back"><i class="bk-shade"></i></div>
        </div>`)
      .join("");
    this.sheets = [...root.querySelectorAll(".bk-sheet")];
    this.rest();
    this.bind();
  }

  /** Repouso: páginas viradas à esquerda, as demais à direita. */
  rest() {
    this.sheets.forEach((el, i) => {
      const flipped = i < this.current;
      this.place(el, flipped ? -180 : 0);
      el.style.zIndex = flipped ? i : this.total - i;
      el.style.visibility = i < this.current - 1 ? "hidden" : "visible";
    });
    this.root.querySelectorAll(".bk-cast").forEach((n) => (n.style.opacity = 0));
    this.root.dataset.last = String(this.current >= this.total - 1);
    this.root.dataset.first = String(this.current === 0);
    this.onChange?.(this.current, this.total);
  }

  /** Aplica ângulo (−180..0) com sombra e curvatura proporcionais. */
  place(el, angle) {
    const p = clampN(-angle / 180, 0, 1);
    const s = Math.sin(p * Math.PI);
    el.style.transform = `rotateY(${angle.toFixed(2)}deg) skewY(${(-s * 1.8).toFixed(2)}deg)`;
    const op = (s * 0.55).toFixed(3);
    el.querySelectorAll(".bk-shade").forEach((n) => (n.style.opacity = op));
  }

  /** Sombra que a folha em movimento projeta na página revelada. */
  cast(k, angle) {
    const next = this.sheets[k + 1]?.querySelector(".bk-cast");
    if (!next) return;
    const p = clampN(-angle / 180, 0, 1);
    next.style.opacity = (Math.sin(p * Math.PI) * 0.45).toFixed(3);
  }

  animate(k, from, to, done) {
    const el = this.sheets[k];
    el.style.zIndex = 999;
    el.style.visibility = "visible";
    this.busy = true;
    const dur = this.reduce ? 0 : 260 + 520 * (Math.abs(to - from) / 180);
    const t0 = performance.now();
    const step = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      const a = from + (to - from) * ease(t);
      this.place(el, a);
      this.cast(k, a);
      if (t < 1) requestAnimationFrame(step);
      else { this.busy = false; done?.(); }
    };
    requestAnimationFrame(step);
  }

  next() {
    if (this.busy || this.current >= this.total - 1) return;
    this.animate(this.current, 0, -180, () => { this.current++; this.rest(); });
  }
  prev() {
    if (this.busy || this.current <= 0) return;
    this.animate(this.current - 1, -180, 0, () => { this.current--; this.rest(); });
  }
  goTo(i) {
    this.current = clampN(i, 0, this.total - 1);
    this.rest();
  }

  bind() {
    const root = this.root;
    let d = null;

    root.addEventListener("pointerdown", (e) => {
      if (this.locked || this.busy || (e.button && e.button > 0)) return;
      d = { x: e.clientX, y: e.clientY, id: e.pointerId, lastX: e.clientX, lastT: performance.now(), v: 0, active: false, dir: 0, k: -1, angle: 0 };
    });

    root.addEventListener("pointermove", (e) => {
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.active) {
        if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0 && this.current < this.total - 1) { d.dir = 1; d.k = this.current; }
        else if (dx > 0 && this.current > 0) { d.dir = -1; d.k = this.current - 1; }
        else { d = null; return; }
        d.active = true;
        try { root.setPointerCapture(e.pointerId); } catch { /* ok */ }
        const el = this.sheets[d.k];
        el.style.zIndex = 999;
        el.style.visibility = "visible";
        root.classList.add("is-dragging");
      }
      const w = root.clientWidth || 1;
      const prog = d.dir === 1 ? clampN(-dx / w, 0, 1) : clampN(dx / w, 0, 1);
      d.angle = d.dir === 1 ? -180 * prog : -180 + 180 * prog;
      this.place(this.sheets[d.k], d.angle);
      this.cast(d.k, d.angle);
      const now = performance.now();
      d.v = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
      d.lastX = e.clientX;
      d.lastT = now;
    });

    const end = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const st = d;
      d = null;
      root.classList.remove("is-dragging");
      try { root.releasePointerCapture(e.pointerId); } catch { /* ok */ }

      if (!st.active) {
        // toque simples: metade direita avança, esquerda volta
        if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) return;
        const r = root.getBoundingClientRect();
        if (e.clientX - r.left > r.width / 2) this.next(); else this.prev();
        return;
      }
      const prog = Math.abs(st.angle - (st.dir === 1 ? 0 : -180)) / 180;
      const flick = st.dir === 1 ? st.v < -0.35 : st.v > 0.35;
      const complete = prog > 0.35 || flick;
      const to = st.dir === 1 ? (complete ? -180 : 0) : (complete ? 0 : -180);
      this.animate(st.k, st.angle, to, () => {
        if (complete) this.current += st.dir;
        this.rest();
      });
    };
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
  }
}
