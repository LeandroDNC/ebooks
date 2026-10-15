// Editor de ebooks — Íntima Graça admin.
// Rascunhos: localStorage. Publicação: tabelas books / book_content (esquema em supabase/schema.sql, fora da pasta pública).
import { supabase } from "./supabase.js";
import { FONTS, esc, renderPage, renderCover, buildSequence, FlipBook, coverStyle, coverAutoColor } from "./book-render.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = (p = "b") => p + Math.random().toString(36).slice(2, 9);
const DRAFTS_KEY = "intimagraca:drafts";
// Mesmas categorias da loja (js/data.js). Para criar outra, adicione aqui e em data.js.
const CATEGORIES = ["Mulheres", "Casais", "Jovens", "Família", "Jornadas de 21/30 dias", "Oração"];
const SWATCHES = ["#344E41", "#1F3329", "#A3B18A", "#C6A667", "#F8F6F0", "#FFFFFF", "#000000", "#8A2C1F", "#2F5D8A", "#6B4F7A"];
const isDesktop = () => matchMedia("(min-width: 1100px)").matches;

/* ------------------------------------------------------------------ estado */
let book = null;
let pageIdx = 0;       // -1 = capa
let selected = null;
let lastAdded = null;
let remoteIds = new Set();

const newPage = (bg = "#FFFFFF") => ({ id: uid("p"), bg, blocks: [] });
const newBook = () => ({
  id: uid("e-"), title: "", author: "", category: "", price: "", coverColor: "#344E41", coverImage: null,
  year: new Date().getFullYear(), holder: "", isbn: "", creditsText: "", creditsPosition: "front",
  published: false, pages: [newPage()],
});
const textBlock = (o) => ({ id: uid("k"), type: "text", text: "", font: "Manrope", size: 4, color: "#344E41",
  bold: false, italic: false, underline: false, align: "left", ...o });
const lineBlock = (o) => ({ id: uid("k"), type: "line", style: "solid", color: "#C6A667", thickness: 2, width: 60, align: "center", ...o });
const LINE_STYLES = [["solid", "Contínua"], ["dashed", "Tracejada"], ["dotted", "Pontilhada"], ["double", "Dupla"], ["fade", "Degradê"], ["ornament", "Ornamento"]];
const imageBlock = (o) => ({ id: uid("k"), type: "image", src: "", width: 100, radius: 0, align: "center", alt: "", ...o });

const LAYOUTS = {
  blank: () => [],
  chapter: () => [
    textBlock({ text: "Título do capítulo", font: "Cormorant Garamond", size: 8, bold: true, align: "center" }),
    textBlock({ text: "Escreva seu texto aqui.", size: 4 }),
  ],
  photo: () => [
    imageBlock({ width: 100, radius: 8 }),
    textBlock({ text: "Legenda da foto", size: 3.2, italic: true, align: "center" }),
  ],
  verse: () => [
    textBlock({ text: "“Texto do versículo.”", font: "Cormorant Garamond", size: 7, italic: true, align: "center" }),
    textBlock({ text: "Livro 0:00", size: 3, bold: true, align: "center", color: "#C6A667" }),
  ],
};

/* ------------------------------------------------------- avisos e status */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " is-err" : "");
  t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.classList.add("is-out"); setTimeout(() => t.remove(), 300); }, 2600);
}
function setStatus(text, state = "idle") {
  const el = $("#save-status");
  el.dataset.state = state;
  el.lastElementChild.textContent = text;
}

/* ----------------------------------------------------- rascunho + histórico */
function readDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}"); } catch { return {}; }
}
let undo = [], redo = [], saveTimer;

function snapshot() { return JSON.stringify({ book, pageIdx }); }
function pushHistory() {
  const s = snapshot();
  if (undo[undo.length - 1] === s) return;
  undo.push(s);
  if (undo.length > 30) undo.shift();
  redo = [];
  syncHistoryButtons();
}
function syncHistoryButtons() {
  $("#btn-undo").disabled = undo.length < 2;
  $("#btn-redo").disabled = redo.length === 0;
}
function restore(s) {
  const o = JSON.parse(s);
  book = o.book;
  pageIdx = Math.min(o.pageIdx, book.pages.length - 1);
  selected = null;
  renderAll();
  persist();
}
function doUndo() {
  if (undo.length < 2) return;
  redo.push(undo.pop());
  restore(undo[undo.length - 1]);
  syncHistoryButtons();
}
function doRedo() {
  if (!redo.length) return;
  const s = redo.pop();
  undo.push(s);
  restore(s);
  syncHistoryButtons();
}

function persist() {
  try {
    const all = readDrafts();
    all[book.id] = book;
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    setStatus("Rascunho salvo", "ok");
  } catch {
    setStatus("Rascunho grande demais", "err");
    toast("Muitas fotos para o navegador guardar. Use “Salvar” para enviar ao banco.", true);
  }
}
function changed() {
  setStatus("Salvando…", "busy");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { persist(); pushHistory(); }, 450);
}

/* ---------------------------------------------------------------- render */
const curPage = () => (pageIdx >= 0 ? book.pages[pageIdx] : null);
// Elementos da capa (título, autoria, imagem) se comportam como blocos selecionáveis.
function coverTarget(id) {
  if (id === "cover-art") return book.coverArt || null;
  if (id !== "cover-title" && id !== "cover-author") return null;
  const key = id === "cover-title" ? "title" : "author";
  const st = coverStyle(book, id);
  return new Proxy({ type: "text", id }, {
    get(t, k) {
      if (k === "text") return book[key];
      if (k === "color") return st.color || coverAutoColor(book);
      return k in st ? st[k] : t[k];
    },
    set(t, k, v) {
      if (k === "text") book[key] = v;
      else { book.coverStyles ??= {}; (book.coverStyles[id] ??= {})[k] = v; st[k] = v; }
      return true;
    },
  });
}
const findBlock = (id) => (pageIdx < 0 ? coverTarget(id) : curPage()?.blocks.find((b) => b.id === id));

function renderAll() {
  renderSelect();
  renderSettings();
  renderStrip();
  renderCanvas(true);
  renderInspector();
}

function renderSelect() {
  const drafts = readDrafts();
  const ids = new Set([...Object.keys(drafts), ...remoteIds, book.id]);
  const label = (id) => (id === book.id ? book : drafts[id])?.title || "Sem título";
  $("#book-select").innerHTML = [...ids]
    .map((id) => `<option value="${esc(id)}"${id === book.id ? " selected" : ""}>${esc(label(id))}${remoteIds.has(id) ? " · no banco" : ""}</option>`)
    .join("");
}

function renderSettings() {
  $("#f-title").value = book.title;
  $("#f-author").value = book.author;
  const cat = $("#f-category");
  const opts = !book.category || CATEGORIES.includes(book.category) ? CATEGORIES : [...CATEGORIES, book.category];
  cat.innerHTML = `<option value="">Escolha…</option>` + opts.map((c) => `<option>${esc(c)}</option>`).join("");
  cat.value = book.category;
  $("#f-price").value = book.price;
  const isLink = (u) => typeof u === "string" && /^https?:/i.test(u);
  $("#f-cover").value = isLink(book.coverImage) ? book.coverImage : "";
  $("#f-art").value = isLink(book.coverArt?.src) ? book.coverArt.src : "";
  $("#f-color").value = book.coverColor;
  $("#f-year").value = book.year;
  $("#f-holder").value = book.holder;
  $("#f-isbn").value = book.isbn;
  $("#f-credits").value = book.creditsText;
  $("#f-credpos").value = book.creditsPosition;
  renderSwatches($("[data-swatch-for='f-color']"), "f-color", book.coverColor);
}

function renderSwatches(box, targetId, current) {
  if (!box) return;
  box.innerHTML = SWATCHES.map((c) =>
    `<button type="button" class="swatch${c.toLowerCase() === String(current).toLowerCase() ? " is-on" : ""}" style="background:${c}" data-swatch="${c}" data-target="${targetId}" aria-label="Cor ${c}"></button>`).join("");
}

function renderStrip() {
  const cover = `<li><button type="button" class="pg-thumb${pageIdx === -1 ? " is-active" : ""}" data-cover="1" aria-label="Editar capa">${renderCover(book)}</button><span class="pg-num">Capa</span></li>`;
  const items = book.pages.map((p, i) => `<li draggable="true" data-i="${i}">
      <button type="button" class="pg-thumb${i === pageIdx ? " is-active" : ""}" data-page="${i}" aria-label="Editar página ${i + 1}">${renderPage(p)}</button>
      <span class="pg-num">${i + 1}</span></li>`).join("");
  $("#pages-list").innerHTML = cover + items +
    `<li><button type="button" class="pg-add" id="btn-add-page" aria-label="Adicionar página">+</button><span class="pg-num">Nova</span></li>`;
  // rola só a tira (scrollIntoView moveria a página inteira)
  const strip = $("#pages-list");
  const on = $(".pg-thumb.is-active", strip);
  if (on) strip.scrollTo({ left: on.parentElement.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2, behavior: "smooth" });
}

function renderCanvas(enter = false) {
  const c = $("#canvas");
  c.innerHTML = pageIdx >= 0 ? renderPage(curPage(), selected, true) : renderCover(book, selected, true);
  if (lastAdded) { c.querySelector(`[data-block="${lastAdded}"]`)?.classList.add("is-new"); lastAdded = null; }
  if (enter) { c.classList.remove("enter"); void c.offsetWidth; c.classList.add("enter"); }
  placeToolbar();
}

function placeToolbar() {
  const q = $("#qtb");
  const el = pageIdx >= 0 && selected && $(`#canvas [data-block="${selected}"]`);
  if (!el) { q.hidden = true; return; }
  const wrap = $("#canvas-wrap").getBoundingClientRect();
  const r = el.getBoundingClientRect();
  q.hidden = false;
  q.style.top = `${Math.max(r.top - wrap.top - 8, 52)}px`;
  q.style.left = `${Math.min(Math.max(r.left - wrap.left + r.width / 2, 90), wrap.width - 90)}px`;
}

const pressed = (v) => (v ? "true" : "false");

function linePreview(style) {
  const c = "#344E41";
  const inner = {
    solid: `<span style="display:block;border-top:2px solid ${c}"></span>`,
    dashed: `<span style="display:block;border-top:2px dashed ${c}"></span>`,
    dotted: `<span style="display:block;border-top:3px dotted ${c}"></span>`,
    double: `<span style="display:block;border-top:6px double ${c}"></span>`,
    fade: `<span style="display:block;height:2px;background:linear-gradient(90deg,transparent,${c},transparent)"></span>`,
    ornament: `<span style="display:flex;align-items:center;gap:4px"><i style="flex:1;height:2px;background:${c}"></i><b style="width:7px;height:7px;background:${c};transform:rotate(45deg)"></b><i style="flex:1;height:2px;background:${c}"></i></span>`,
  }[style];
  return `<span class="pv-line">${inner}</span>`;
}

function renderInspector() {
  const box = $("#inspector");
  const onCover = pageIdx < 0;
  const page = curPage();
  const b = findBlock(selected);
  if (onCover && !b) {
    box.innerHTML = `<h2>Capa</h2><div class="empty-ins">Toque no <b>título</b>, na <b>autoria</b> ou na <b>imagem</b> dentro da capa para mudar fonte, cor e tamanho.</div>
      <p class="muted" style="margin-top:1rem">Cor de fundo, foto e imagem da capa ficam em “Livro”, na seção Capa. A logo da Íntima Graça aparece em todas as páginas.</p>`;
    return;
  }

  let html = onCover
    ? `<h2>Capa</h2>`
    : `<h2>Página ${pageIdx + 1}</h2>
    <div class="field"><label for="p-bg">Cor de fundo</label>
      <div class="colorrow"><input id="p-bg" type="color" value="${esc(page.bg)}"><div class="swatches" data-swatch-for="p-bg"></div></div></div>`;

  if (!b) {
    html += `<div class="empty-ins">Toque em um título, texto ou foto da página para editar, ou adicione um novo elemento.</div>
      <div class="rowbtns">
        <button type="button" class="btn btn--ghost btn--sm" data-act="page-up"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg> Mover para trás</button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="page-down">Mover para frente <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="page-dup">Duplicar página</button>
        <button type="button" class="btn btn--ghost btn--sm btn--danger" data-act="page-del">Excluir página</button>
      </div>`;
    box.innerHTML = html;
    renderSwatches($("[data-swatch-for='p-bg']", box), "p-bg", page.bg);
    return;
  }

  const heading = b.type === "line" ? "Linha"
    : b.type === "text" ? (onCover ? (b.id === "cover-title" ? "Título da capa" : "Autoria") : "Texto")
    : onCover ? "Imagem da capa" : "Foto";
  html += `<h3>${heading}</h3>`;
  if (onCover && selected === "cover-art") {
    const rc = b.recolor !== false;
    html += `
      <label class="check"><input id="a-recolor" type="checkbox"${rc ? " checked" : ""}> Pintar com uma cor</label>
      ${rc ? `<div class="field"><label for="a-color">Cor da imagem</label>
        <div class="colorrow"><input id="a-color" type="color" value="${esc(b.color || "#C6A667")}"><div class="swatches" data-swatch-for="a-color"></div></div></div>` : `<p class="muted">Usando as cores originais do arquivo.</p>`}
      <div class="field"><label for="a-size">Tamanho: <span id="a-size-v">${Number(b.size) || 0}</span>%</label>
        <input id="a-size" type="range" min="10" max="100" step="1" value="${Number(b.size) || 0}"></div>
      <div class="field"><label for="a-x">Posição horizontal</label><input id="a-x" type="range" min="0" max="100" step="1" value="${Number(b.x) || 0}"></div>
      <div class="field"><label for="a-y">Posição vertical</label><input id="a-y" type="range" min="0" max="100" step="1" value="${Number(b.y) || 0}"></div>
      <p class="muted">Dica: arraste a imagem direto na capa.</p>`;
  } else if (b.type === "line") {
    html += `
      <span class="sr-only" id="lines-label">Estilo da linha</span>
      <div class="linegrid" role="group" aria-labelledby="lines-label">
        ${LINE_STYLES.map(([v, l]) => `<button type="button" data-linestyle="${v}" aria-pressed="${pressed(v === b.style)}" aria-label="${l}" title="${l}">${linePreview(v)}</button>`).join("")}
      </div>
      <div class="field"><label for="l-color">Cor da linha</label>
        <div class="colorrow"><input id="l-color" type="color" value="${esc(b.color)}"><div class="swatches" data-swatch-for="l-color"></div></div></div>
      <div class="field"><label for="l-th">Espessura: <span id="l-th-v">${Number(b.thickness) || 0}</span>px</label>
        <input id="l-th" type="range" min="1" max="12" step="1" value="${Number(b.thickness) || 0}"></div>
      <div class="field"><label for="l-w">Comprimento: <span id="l-w-v">${Number(b.width) || 0}</span>%</label>
        <input id="l-w" type="range" min="10" max="100" step="5" value="${Number(b.width) || 0}"></div>
      <div class="seg" role="group" aria-label="Alinhamento">
        ${[["left", "Esq."], ["center", "Centro"], ["right", "Dir."]]
          .map(([v, l]) => `<button type="button" data-align="${v}" aria-pressed="${pressed(v === b.align)}">${l}</button>`).join("")}
      </div>`;
  } else if (b.type === "text") {
    html += `
      <div class="field"><label for="b-text">Conteúdo</label><textarea id="b-text" rows="4">${esc(b.text)}</textarea></div>
      <span class="sr-only" id="fonts-label">Fonte</span>
      <div class="fontgrid" role="group" aria-labelledby="fonts-label">
        ${FONTS.map((f) => `<button type="button" data-font="${esc(f.name)}" aria-pressed="${pressed(f.name === b.font)}" style="font-family:${f.css}">${esc(f.name.split(" ")[0])}</button>`).join("")}
      </div>
      <div class="field"><label for="b-size">Tamanho: <span id="b-size-v">${Number(b.size) || 0}</span></label>
        <input id="b-size" type="range" min="1.5" max="24" step="0.5" value="${Number(b.size) || 0}"></div>
      <div class="field"><label for="b-color">Cor do texto</label>
        <div class="colorrow"><input id="b-color" type="color" value="${esc(b.color)}"><div class="swatches" data-swatch-for="b-color"></div></div></div>
      <div class="seg" role="group" aria-label="Estilo">
        <button type="button" data-toggle="bold" aria-pressed="${pressed(b.bold)}"><b>N</b></button>
        <button type="button" data-toggle="italic" aria-pressed="${pressed(b.italic)}"><i>I</i></button>
        <button type="button" data-toggle="underline" aria-pressed="${pressed(b.underline)}"><u>S</u></button>
      </div>
      <div class="seg" role="group" aria-label="Alinhamento">
        ${[["left", "Esq."], ["center", "Centro"], ["right", "Dir."], ["justify", "Just."]]
          .map(([v, l]) => `<button type="button" data-align="${v}" aria-pressed="${pressed(v === b.align)}">${l}</button>`).join("")}
      </div>`;
  } else {
    html += `
      <div class="field"><label for="b-url">Link da imagem</label><input id="b-url" type="url" inputmode="url" placeholder="https://…/foto.jpg" autocomplete="off" value="${esc(b.src || "")}"></div>
      <div class="field"><label for="b-width">Largura: <span id="b-width-v">${Number(b.width) || 0}</span>%</label>
        <input id="b-width" type="range" min="20" max="100" step="5" value="${Number(b.width) || 0}"></div>
      <div class="field"><label for="b-radius">Cantos arredondados: <span id="b-radius-v">${Number(b.radius) || 0}</span>px</label>
        <input id="b-radius" type="range" min="0" max="60" step="2" value="${Number(b.radius) || 0}"></div>
      <div class="seg" role="group" aria-label="Alinhamento">
        ${[["left", "Esq."], ["center", "Centro"], ["right", "Dir."]]
          .map(([v, l]) => `<button type="button" data-align="${v}" aria-pressed="${pressed(v === b.align)}">${l}</button>`).join("")}
      </div>
      <div class="field"><label for="b-alt">Descrição da foto (acessibilidade)</label><input id="b-alt" type="text" value="${esc(b.alt || "")}"></div>`;
  }
  if (selected !== "cover-art") {
    html += b.free
      ? `<button type="button" class="btn btn--ghost btn--sm btn--block" data-act="blk-unfree">Voltar ao fluxo da página</button>`
      : `<p class="muted">Arraste o elemento na página para mover onde quiser. Use a bolinha dourada no canto para aumentar ou diminuir.</p>`;
  }
  if (!onCover) html += `<div class="rowbtns">
      <button type="button" class="btn btn--ghost btn--sm" data-act="blk-up">Subir</button>
      <button type="button" class="btn btn--ghost btn--sm" data-act="blk-down">Descer</button>
      <button type="button" class="btn btn--ghost btn--sm" data-act="blk-dup">Duplicar</button>
      <button type="button" class="btn btn--ghost btn--sm btn--danger" data-act="blk-del">Excluir</button>
    </div>`;
  box.innerHTML = html;
  if (page) renderSwatches($("[data-swatch-for='p-bg']", box), "p-bg", page.bg);
  renderSwatches($("[data-swatch-for='b-color']", box), "b-color", b.color);
  renderSwatches($("[data-swatch-for='a-color']", box), "a-color", b.color);
  renderSwatches($("[data-swatch-for='l-color']", box), "l-color", b.color);
}

/* ----------------------------------------------------------- painéis (mobile) */
function openSheet(id) {
  if (isDesktop()) return;
  $$(".sheet").forEach((s) => s.classList.toggle("is-open", s.id === id));
  $("#sheet-bg").hidden = false;
}
function closeSheets() {
  $$(".sheet").forEach((s) => s.classList.remove("is-open"));
  $("#sheet-bg").hidden = true;
}

/* --------------------------------------------------------------- imagens */
// Valida o link e descobre proporção e se o servidor permite pintar (CORS).
function probeImage(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) return resolve({ ok: false });
    } catch { return resolve({ ok: false }); }
    const done = (img, cors) => resolve({
      ok: true, cors,
      ratio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1,
    });
    const a = new Image();
    a.crossOrigin = "anonymous";
    a.onload = () => done(a, true);
    a.onerror = () => {
      const b = new Image();
      b.onload = () => done(b, false);
      b.onerror = () => resolve({ ok: false });
      b.src = url;
    };
    a.src = url;
  });
}

// Aplica o handler ao colar/digitar um link (com pequena espera) e ao confirmar.
function onUrlInput(input, fn) {
  let t;
  const run = () => { clearTimeout(t); const v = input.value.trim(); if (v) fn(v); };
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 600); });
  input.addEventListener("change", run);
}


/* ----------------------------------------------------------------- ações */
function addBlock(kind) {
  if (pageIdx < 0) { toast("Escolha uma página para adicionar elementos."); return; }
  const b = kind === "line"
    ? lineBlock({})
    : kind === "image"
    ? imageBlock({})
    : textBlock(kind === "title"
        ? { text: "Título da página", font: "Cormorant Garamond", size: 8, bold: true, align: "center" }
        : { text: "Escreva seu texto aqui.", size: 4 });
  curPage().blocks.push(b);
  selected = b.id;
  lastAdded = b.id;
  renderCanvas();
  renderStrip();
  renderInspector();
  changed();
  if (!isDesktop()) openSheet("sheet-insp");
}

function addPage(layout) {
  const p = newPage();
  p.blocks = (LAYOUTS[layout] || LAYOUTS.blank)();
  const at = pageIdx >= 0 ? pageIdx + 1 : 0;
  book.pages.splice(at, 0, p);
  pageIdx = at;
  selected = null;
  renderAll();
  changed();
}

function handleAct(a) {
  if (a === "blk-unfree") {
    const t = findBlock(selected);
    if (t) t.free = null;
    renderAll();
    changed();
    return;
  }
  const page = curPage();
  const blocks = page?.blocks;
  const i = blocks ? blocks.findIndex((x) => x.id === selected) : -1;
  const swap = (arr, x, y) => { if (y >= 0 && y < arr.length) { [arr[x], arr[y]] = [arr[y], arr[x]]; return y; } return x; };
  if (a === "blk-up" && i >= 0) swap(blocks, i, i - 1);
  else if (a === "blk-down" && i >= 0) swap(blocks, i, i + 1);
  else if (a === "blk-dup" && i >= 0) { const c = JSON.parse(JSON.stringify(blocks[i])); c.id = uid("k"); blocks.splice(i + 1, 0, c); selected = c.id; lastAdded = c.id; }
  else if (a === "blk-del" && i >= 0) { blocks.splice(i, 1); selected = null; toast("Elemento excluído"); }
  else if (a === "page-up") pageIdx = swap(book.pages, pageIdx, pageIdx - 1);
  else if (a === "page-down") pageIdx = swap(book.pages, pageIdx, pageIdx + 1);
  else if (a === "page-dup") {
    const c = JSON.parse(JSON.stringify(page));
    c.id = uid("p");
    c.blocks.forEach((x) => (x.id = uid("k")));
    book.pages.splice(pageIdx + 1, 0, c);
    pageIdx++;
    selected = null;
  } else if (a === "page-del") {
    if (!confirm("Excluir esta página?")) return;
    book.pages.splice(pageIdx, 1);
    if (!book.pages.length) book.pages.push(newPage());
    pageIdx = Math.min(pageIdx, book.pages.length - 1);
    selected = null;
  } else return;
  renderAll();
  changed();
}

/* --------------------------------------------------------------- bindings */
function bindSettings() {
  const map = {
    "#f-title": "title", "#f-author": "author", "#f-category": "category", "#f-price": "price",
    "#f-color": "coverColor", "#f-year": "year", "#f-holder": "holder", "#f-isbn": "isbn",
    "#f-credits": "creditsText", "#f-credpos": "creditsPosition",
  };
  Object.entries(map).forEach(([sel, key]) =>
    $(sel).addEventListener("input", (e) => {
      book[key] = e.target.value;
      if (key === "title") renderSelect();
      if (key === "coverColor") renderSwatches($("[data-swatch-for='f-color']"), "f-color", e.target.value);
      renderStrip();
      if (pageIdx < 0) renderCanvas();
      changed();
    }));
  onUrlInput($("#f-cover"), async (url) => {
    const p = await probeImage(url);
    if (!p.ok) return toast("Não consegui abrir esse link de imagem.", true);
    book.coverImage = url;
    book.coverUrl = url;
    pageIdx = -1;
    renderStrip(); renderCanvas(true); renderInspector();
    changed();
  });
  onUrlInput($("#f-art"), async (url) => {
    const p = await probeImage(url);
    if (!p.ok) return toast("Não consegui abrir esse link de imagem.", true);
    book.coverArt = { src: url, ratio: p.ratio, color: "#C6A667", recolor: p.cors, size: 50, x: 50, y: 35 };
    pageIdx = -1;
    selected = "cover-art";
    renderStrip(); renderCanvas(true); renderInspector();
    changed();
    if (!p.cors) toast("Esse site não permite pintar a imagem: mantive as cores originais.");
    if (!isDesktop()) { closeSheets(); openSheet("sheet-insp"); }
  });
  $("#btn-cover-clear").addEventListener("click", () => {
    book.coverImage = null;
    book.coverUrl = null;
    $("#f-cover").value = "";
    renderStrip();
    if (pageIdx < 0) renderCanvas();
    changed();
  });
  $("#btn-art-clear").addEventListener("click", () => {
    book.coverArt = null;
    $("#f-art").value = "";
    if (selected === "cover-art") selected = null;
    renderCanvas(); renderStrip(); renderInspector(); changed();
  });
  $("#btn-cover-clear").addEventListener("click", () => {
    book.coverImage = null;
    book.coverUrl = null;
    renderStrip();
    if (pageIdx < 0) renderCanvas();
    changed();
  });
}

function bindCanvas() {
  const canvas = $("#canvas");
  // Mover e redimensionar elementos (texto, foto, linha, títulos da capa)
  canvas.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-block]");
    if (!el || el.dataset.block === "cover-art" || el.isContentEditable || (e.button && e.button > 0)) return;
    const b = findBlock(el.dataset.block);
    const pageEl = canvas.querySelector(".bk-page");
    if (!b || !pageEl) return;
    const isHandle = !!e.target.closest("[data-handle]");
    const pr = pageEl.getBoundingClientRect();
    const r0 = el.getBoundingClientRect();
    const f0 = b.free
      ? { x: Number(b.free.x), y: Number(b.free.y), w: Number(b.free.w) }
      : { x: ((r0.left - pr.left) / pr.width) * 100, y: ((r0.top - pr.top) / pr.height) * 100, w: (r0.width / pr.width) * 100 };
    const size0 = Number(b.size) || 4;
    const sx = e.clientX, sy = e.clientY;
    let started = false, target = el;
    const lim = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const move = (ev) => {
      if (!started) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
        started = true;
        selected = b.id;
        b.free = { ...f0 };
        renderCanvas();
        target = canvas.querySelector(`[data-block="${b.id}"]`);
        canvas.classList.add("is-dragging");
      }
      const dx = ((ev.clientX - sx) / pr.width) * 100;
      const dy = ((ev.clientY - sy) / pr.height) * 100;
      const f = b.free;
      if (isHandle) {
        f.w = Math.round(lim(f0.w + dx, 8, 100) * 10) / 10;
        if (b.type === "text") b.size = Math.round(lim(size0 * (f.w / f0.w), 1.5, 24) * 10) / 10;
      } else {
        let nx = lim(f0.x + dx, -5, 95);
        const cx = nx + f0.w / 2;
        if (Math.abs(cx - 50) < 1.5) nx = 50 - f0.w / 2; // ímã no centro da página
        f.x = Math.round(nx * 10) / 10;
        f.y = Math.round(lim(f0.y + dy, -5, 95) * 10) / 10;
      }
      if (target) {
        target.style.left = f.x + "%";
        target.style.top = f.y + "%";
        target.style.width = f.w + "%";
        if (b.type === "text") target.style.fontSize = b.size + "cqw";
      }
    };
    const up = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      canvas.classList.remove("is-dragging");
      if (started) { renderCanvas(); renderStrip(); renderInspector(); changed(); }
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });

  // Arrastar a imagem da capa
  canvas.addEventListener("pointerdown", (e) => {
    const art = e.target.closest("[data-block='cover-art']");
    if (!art || pageIdx >= 0 || !book.coverArt) return;
    const rect = canvas.querySelector(".bk-page").getBoundingClientRect();
    let moved = false;
    art.setPointerCapture(e.pointerId);
    const move = (ev) => {
      moved = true;
      book.coverArt.x = Math.round(Math.min(100, Math.max(0, ((ev.clientX - rect.left) / rect.width) * 100)));
      book.coverArt.y = Math.round(Math.min(100, Math.max(0, ((ev.clientY - rect.top) / rect.height) * 100)));
      art.style.left = book.coverArt.x + "%";
      art.style.top = book.coverArt.y + "%";
    };
    const up = () => {
      art.removeEventListener("pointermove", move);
      art.removeEventListener("pointerup", up);
      if (moved) { renderStrip(); changed(); }
    };
    art.addEventListener("pointermove", move);
    art.addEventListener("pointerup", up);
  });

  canvas.addEventListener("click", (e) => {
    if (e.target.closest("[contenteditable='true']")) return;
    const el = e.target.closest("[data-block]");
    selected = el ? el.dataset.block : null;
    renderCanvas();
    renderInspector();
  });

  // Edição direta: duplo clique/toque no texto
  canvas.addEventListener("dblclick", (e) => {
    const el = e.target.closest(".bk-text, [data-block='cover-title'], [data-block='cover-author']");
    if (!el) return;
    const b = findBlock(el.dataset.block);
    if (!b) return;
    selected = b.id;
    el.contentEditable = "true";
    el.focus();
    getSelection().selectAllChildren(el);
    el.addEventListener("input", () => { b.text = el.innerText; changed(); });
    el.addEventListener("blur", () => { el.contentEditable = "false"; renderCanvas(); renderStrip(); renderInspector(); }, { once: true });
  });

  $$("[data-add]").forEach((btn) => btn.addEventListener("click", () => addBlock(btn.dataset.add)));
  $$("[data-open]").forEach((btn) => btn.addEventListener("click", () => openSheet(btn.dataset.open)));
  $$("[data-close-sheet]").forEach((btn) => btn.addEventListener("click", closeSheets));
  $("#sheet-bg").addEventListener("click", closeSheets);

  // Barra flutuante do elemento
  $("#qtb").addEventListener("click", (e) => {
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (a) handleAct(a);
  });

  // Tira de páginas
  const strip = $("#pages-list");
  strip.addEventListener("click", (e) => {
    if (e.target.closest("#btn-add-page")) { $("#layouts").hidden = false; return; }
    const t = e.target.closest(".pg-thumb");
    if (!t) return;
    pageIdx = t.dataset.cover ? -1 : Number(t.dataset.page);
    selected = null;
    renderStrip();
    renderCanvas(true);
    renderInspector();
  });
  let dragFrom = null;
  strip.addEventListener("dragstart", (e) => {
    const li = e.target.closest("li[data-i]");
    if (!li) return;
    dragFrom = Number(li.dataset.i);
    li.classList.add("is-drag");
    e.dataTransfer.effectAllowed = "move";
  });
  strip.addEventListener("dragover", (e) => {
    const li = e.target.closest("li[data-i]");
    if (dragFrom === null || !li) return;
    e.preventDefault();
    $$(".is-drop", strip).forEach((x) => x.classList.remove("is-drop"));
    li.classList.add("is-drop");
  });
  strip.addEventListener("drop", (e) => {
    const li = e.target.closest("li[data-i]");
    if (dragFrom === null || !li) return;
    e.preventDefault();
    const to = Number(li.dataset.i);
    const [moved] = book.pages.splice(dragFrom, 1);
    book.pages.splice(to, 0, moved);
    pageIdx = to;
    dragFrom = null;
    renderAll();
    changed();
  });
  strip.addEventListener("dragend", () => { dragFrom = null; $$(".is-drag,.is-drop", strip).forEach((x) => x.classList.remove("is-drag", "is-drop")); });

  // Modelos de página
  $("#layouts").addEventListener("click", (e) => {
    const l = e.target.closest("[data-layout]");
    if (l) { $("#layouts").hidden = true; addPage(l.dataset.layout); return; }
    if (e.target.closest("[data-close-modal]") || e.target.id === "layouts") $("#layouts").hidden = true;
  });

  addEventListener("resize", placeToolbar);
}

function bindInspector() {
  const box = $("#inspector");
  const apply = (b, key, val, valueLabelId) => {
    b[key] = val;
    if (pageIdx < 0 && key === "text") { renderSelect(); $("#f-title").value = book.title; $("#f-author").value = book.author; }
    if (valueLabelId) { const v = $(`#${valueLabelId}`, box); if (v) v.textContent = val; }
    renderCanvas();
    renderStrip();
    changed();
  };

  box.addEventListener("input", (e) => {
    const id = e.target.id;
    if (id === "p-bg") {
      curPage().bg = e.target.value;
      renderSwatches($("[data-swatch-for='p-bg']", box), "p-bg", e.target.value);
      renderCanvas(); renderStrip(); changed();
      return;
    }
    const b = findBlock(selected);
    if (!b) return;
    if (id === "a-color") { apply(b, "color", e.target.value); renderSwatches($("[data-swatch-for='a-color']", box), "a-color", e.target.value); }
    else if (id === "a-size") apply(b, "size", Number(e.target.value), "a-size-v");
    else if (id === "a-x") apply(b, "x", Number(e.target.value));
    else if (id === "a-y") apply(b, "y", Number(e.target.value));
    else if (id === "a-recolor") { b.recolor = e.target.checked; renderCanvas(); renderStrip(); renderInspector(); changed(); }
    else if (id === "l-color") { apply(b, "color", e.target.value); renderSwatches($("[data-swatch-for='l-color']", box), "l-color", e.target.value); }
    else if (id === "l-th") apply(b, "thickness", Number(e.target.value), "l-th-v");
    else if (id === "l-w") apply(b, "width", Number(e.target.value), "l-w-v");
    else if (id === "b-text") apply(b, "text", e.target.value);
    else if (id === "b-size") apply(b, "size", Number(e.target.value), "b-size-v");
    else if (id === "b-color") { apply(b, "color", e.target.value); renderSwatches($("[data-swatch-for='b-color']", box), "b-color", e.target.value); }
    else if (id === "b-width") apply(b, "width", Number(e.target.value), "b-width-v");
    else if (id === "b-radius") apply(b, "radius", Number(e.target.value), "b-radius-v");
    else if (id === "b-alt") { b.alt = e.target.value; changed(); }
  });

  // Link da imagem: renderiza na página assim que for colado.
  let urlTimer;
  const applyUrl = async () => {
    const input = $("#b-url", box);
    const b = findBlock(selected);
    if (!input || !b) return;
    const v = input.value.trim();
    if (!v) { b.src = ""; renderCanvas(); renderStrip(); changed(); return; }
    const p = await probeImage(v);
    if (!p.ok) return toast("Não consegui abrir esse link de imagem.", true);
    b.src = v;
    renderCanvas(); renderStrip(); changed();
  };
  box.addEventListener("input", (e) => {
    if (e.target.id !== "b-url") return;
    clearTimeout(urlTimer);
    urlTimer = setTimeout(applyUrl, 600);
  });
  box.addEventListener("change", (e) => { if (e.target.id === "b-url") applyUrl(); });
  box.addEventListener("click", (e) => {
    const b = findBlock(selected);
    const sw = e.target.closest("[data-swatch]");
    if (sw) {
      const t = $(`#${sw.dataset.target}`);
      t.value = sw.dataset.swatch;
      t.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const ls = e.target.closest("[data-linestyle]");
    if (ls && b) { apply(b, "style", ls.dataset.linestyle); renderInspector(); return; }
    const font = e.target.closest("[data-font]");
    if (font && b) { apply(b, "font", font.dataset.font); renderInspector(); return; }
    const al = e.target.closest("[data-align]");
    if (al && b) { apply(b, "align", al.dataset.align); renderInspector(); return; }
    const tg = e.target.closest("[data-toggle]");
    if (tg && b) { apply(b, tg.dataset.toggle, !b[tg.dataset.toggle]); renderInspector(); return; }
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (a) handleAct(a);
  });

  // Swatches do painel "Livro"
  $("#sheet-book").addEventListener("click", (e) => {
    const sw = e.target.closest("[data-swatch]");
    if (!sw) return;
    const t = $(`#${sw.dataset.target}`);
    t.value = sw.dataset.swatch;
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/* --------------------------------------------------------- visualização */
let flip = null;
function openPreview() {
  $("#preview").hidden = false;
  flip = new FlipBook($("#pv-book"), buildSequence(book).map((p) => p.html), (c, t) => {
    $("#pv-count").textContent = `${c + 1} / ${t}`;
  });
}

/* ------------------------------------------------------- banco / publicar */
function serialize() {
  const { coverUrl, ...rest } = book;
  return JSON.parse(JSON.stringify(rest));
}

async function saveToDb(publish) {
  if (!supabase) return toast("Supabase não configurado.", true);
  if (!book.title.trim()) { openSheet("sheet-book"); $("#f-title").focus(); return toast("Dê um título ao ebook.", true); }
  if (publish === true && !book.category) {
    openSheet("sheet-book");
    $("#f-category").focus();
    return toast("Escolha a categoria para publicar.", true);
  }
  const raw = JSON.stringify(book);
  if (raw.includes('"data:image')) {
    return toast("Há imagens antigas enviadas do computador. Troque por links antes de salvar.", true);
  }
  setStatus("Salvando…", "busy");
  try {
    const coverUrl = book.coverImage || null;
    if (publish !== undefined) book.published = publish;

    const row = {
      id: book.id, title: book.title.trim(), author: book.author, category: book.category,
      price: book.price === "" ? null : Number(book.price), color: book.coverColor, cover_url: coverUrl,
      published: book.published, updated_at: new Date().toISOString(),
    };
    const r1 = await supabase.from("books").upsert(row);
    if (r1.error) throw r1.error;
    const r2 = await supabase.from("book_content").upsert({ book_id: book.id, data: serialize(), updated_at: row.updated_at });
    if (r2.error) throw r2.error;

    remoteIds.add(book.id);
    renderSelect();
    persist();
    setStatus(book.published ? "Publicado" : "Salvo no banco", "ok");
    toast(book.published ? "Ebook publicado!" : "Salvo no banco como rascunho.");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao salvar", "err");
    toast("Erro ao salvar: " + (err.message || "verifique o esquema do banco."), true);
  }
}

async function loadRemote(id) {
  const { data, error } = await supabase.from("book_content").select("data").eq("book_id", id).single();
  if (error) { toast("Não foi possível abrir este ebook.", true); return null; }
  const b = { ...newBook(), ...data.data };
  const paths = [];
  b.pages.forEach((p) => p.blocks.forEach((x) => x.type === "image" && x.path && paths.push(x.path)));
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("book-pages").createSignedUrls(paths, 3600);
    const map = Object.fromEntries((urls || []).map((u) => [u.path, u.signedUrl]));
    b.pages.forEach((p) => p.blocks.forEach((x) => { if (x.path) x.src = map[x.path] || ""; }));
  }
  if (b.coverUrl) b.coverImage = b.coverUrl;
  if (b.coverArt?.url) b.coverArt.src = b.coverArt.url;
  return b;
}

async function openBook(id) {
  const drafts = readDrafts();
  let b = drafts[id];
  if (!b && remoteIds.has(id)) b = await loadRemote(id);
  if (!b) return;
  book = b;
  pageIdx = 0;
  selected = null;
  undo = []; redo = [];
  pushHistory();
  renderAll();
}

/* ------------------------------------------------------------ inicialização */
function bindBar() {
  $("#book-select").addEventListener("change", (e) => openBook(e.target.value));

  const more = $("#menu-more");
  const toggleMore = (open) => { more.hidden = !open; $("#btn-more").setAttribute("aria-expanded", String(open)); };
  $("#btn-more").addEventListener("click", (e) => { e.stopPropagation(); toggleMore(more.hidden); });
  document.addEventListener("click", () => toggleMore(false));

  $("#btn-new").addEventListener("click", () => {
    book = newBook(); pageIdx = 0; selected = null; undo = []; redo = [];
    pushHistory(); renderAll(); persist();
    if (!isDesktop()) openSheet("sheet-book");
  });
  $("#btn-undo").addEventListener("click", doUndo);
  $("#btn-redo").addEventListener("click", doRedo);
  $("#btn-preview").addEventListener("click", openPreview);
  $("#pv-close").addEventListener("click", () => ($("#preview").hidden = true));
  $("#pv-next").addEventListener("click", () => flip?.next());
  $("#pv-prev").addEventListener("click", () => flip?.prev());
  $("#btn-save").addEventListener("click", () => saveToDb());
  $("#btn-publish").addEventListener("click", () => saveToDb(true));
  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(book)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(book.title || "ebook").replace(/\W+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("#btn-logout").addEventListener("click", async () => { await supabase?.auth.signOut(); location.reload(); });

  // Mobile: salvar/publicar também pelo menu
  [["Publicar", () => saveToDb(true)], ["Salvar no banco", () => saveToDb()]].forEach(([label, fn]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.className = "only-mobile";
    b.addEventListener("click", fn);
    more.prepend(b);
  });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === "Escape") { $("#preview").hidden = true; $("#layouts").hidden = true; closeSheets(); }
    if ((e.ctrlKey || e.metaKey) && !typing) {
      if (e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
      else if (e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); }
    }
    if ((e.key === "Delete" || e.key === "Backspace") && !typing && selected) { e.preventDefault(); handleAct("blk-del"); }
  });
}

async function startApp() {
  $("#gate").hidden = true;
  $("#app").hidden = false;
  if (supabase) {
    const { data } = await supabase.from("books").select("id");
    remoteIds = new Set((data || []).map((r) => r.id));
  }
  const drafts = readDrafts();
  const first = Object.keys(drafts)[0];
  book = first ? drafts[first] : newBook();
  bindSettings();
  bindCanvas();
  bindInspector();
  bindBar();
  pushHistory();
  renderAll();
  setStatus("Pronto");
}

async function gate() {
  const msg = $("#gate-msg");
  // Modo de teste do editor, só em localhost: abre sem login (salvar no banco continua exigindo o admin).
  if (location.hostname === "localhost" && location.search.includes("dev=1")) return startApp();
  if (!supabase) {
    msg.textContent = "Configure o Supabase em js/supabase.js.";
    return;
  }
  const check = async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return false;
    const { data: ok, error } = await supabase.rpc("is_admin");
    if (error) { msg.textContent = "Não foi possível validar o acesso. Tente novamente em instantes."; return false; }
    if (!ok) { msg.textContent = "Esta conta não é a administradora."; await supabase.auth.signOut(); return false; }
    return true;
  };
  if (await check()) return startApp();

  $("#gate-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.textContent = "Aguarde…";
    const { error } = await supabase.auth.signInWithPassword({
      email: $("#g-email").value.trim(), password: $("#g-pass").value,
    });
    if (error) { msg.textContent = "E-mail ou senha incorretos."; return; }
    if (await check()) startApp();
  });
}

gate();
