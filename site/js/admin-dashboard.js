// Painel do administrador: indicadores, gráficos (SVG puro) e ranking.
// Dados: função admin_dashboard() (1 chamada). Sem ela, calcula o que dá a partir da tabela books.
import { supabase } from "./supabase.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => UI.escapeHtml(s);
const ico = (n, t = 20) => UI.icon(n, t);
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR");
const TZ = "America/Fortaleza";
const reduzMov = matchMedia("(prefers-reduced-motion: reduce)").matches;

const params = new URLSearchParams(location.search);
const MODO_TESTE = location.hostname === "localhost" && params.has("dev"); // só localhost: dados de exemplo

/* ------------------------------------------------------------------ datas */
const ymLocal = (d) => d.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
function ultimosMeses(n = 6) {
  const hoje = new Date();
  const [a, m] = ymLocal(hoje).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1, 12));
    return d.toISOString().slice(0, 7);
  });
}
const rotuloMes = (ym) =>
  new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
const mesPorExtenso = (ym) =>
  new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: TZ }).replace(".", "") : "—");

/* ------------------------------------------------------------------ dados */
function amostra() {
  const meses = ultimosMeses().map((mes, i) => ({
    mes,
    criados: [2, 3, 1, 4, 3, 5][i],
    publicados: [1, 2, 1, 3, 2, 4][i],
    vendidos: [4, 9, 12, 18, 25, 31][i],
    receita: [118.8, 269.1, 359.4, 540.2, 748.5, 929.3][i],
    gratis: [10, 22, 35, 41, 60, 84][i],
  }));
  const atual = meses[5];
  const top = [
    ["Café com Deus", "Ana Lima", "#344E41", 58, 1740],
    ["Jornada de 21 dias", "Marta Souza", "#A3B18A", 41, 1189],
    ["Oração das manhãs", "Ana Lima", "#C6A667", 33, 889.5],
    ["Casal em oração", "Paulo e Rita", "#8A6D2F", 21, 630],
    ["Descanso da alma", "Marta Souza", "#4E6B5C", 12, 299],
  ].map(([title, author, color, vendidos, receita], i) => ({ id: "ex" + i, title, author, color, cover_url: "", vendidos, receita }));
  return {
    origem: "amostra",
    totais: { ebooks: 14, publicados: 11, rascunhos: 3, gratuitos: 3, criados_mes: atual.criados, publicados_mes: atual.publicados,
      vendidos_total: 99, vendidos_mes: atual.vendidos, receita_total: 2965.3, receita_mes: atual.receita, gratis_total: 252, gratis_mes: atual.gratis },
    meses, top, topGratis: [],
    livros: top.map((t, i) => ({ id: t.id, title: t.title, author: t.author, category: ["Mulheres", "Jovens", "Oração", "Casais", "Família"][i], price: [29.9, 28.9, 26.95, 30, 24.9][i], published: i !== 4, color: t.color, cover_url: "", updated_at: new Date(Date.now() - i * 86400000 * 3).toISOString() })),
  };
}

function normalizar(raw) {
  const t = raw.totais || {};
  const n = (v) => Number(v) || 0;
  return {
    origem: "banco",
    totais: {
      ebooks: n(t.ebooks), publicados: n(t.publicados), rascunhos: n(t.rascunhos), gratuitos: n(t.gratuitos),
      criados_mes: n(t.criados_mes), publicados_mes: n(t.publicados_mes),
      vendidos_total: n(t.vendidos_total), vendidos_mes: n(t.vendidos_mes),
      receita_total: n(t.receita_total), receita_mes: n(t.receita_mes),
      gratis_total: n(t.gratis_total), gratis_mes: n(t.gratis_mes),
    },
    meses: (raw.meses || []).map((m) => ({
      mes: m.mes, criados: n(m.criados), publicados: n(m.publicados), vendidos: n(m.vendidos), receita: n(m.receita), gratis: n(m.gratis),
    })),
    top: (raw.top || []).map((x) => ({ ...x, vendidos: n(x.vendidos), receita: n(x.receita) })),
    topGratis: (raw.top_gratis || []).map((x) => ({ ...x, vendidos: n(x.vendidos), receita: 0 })),
    livros: [],
  };
}

/** Plano B: calcula a partir da tabela books (a administradora enxerga todos). */
function dePartir(livros) {
  const meses = ultimosMeses().map((mes) => ({ mes, criados: 0, publicados: 0, vendidos: 0, receita: 0, gratis: 0 }));
  const idx = Object.fromEntries(meses.map((m, i) => [m.mes, i]));
  livros.forEach((b) => {
    const c = idx[ymLocal(new Date(b.created_at))];
    if (c !== undefined) meses[c].criados++;
    if (b.published) {
      const p = idx[ymLocal(new Date(b.published_at || b.updated_at))];
      if (p !== undefined) meses[p].publicados++;
    }
  });
  const atual = meses[meses.length - 1];
  const livre = (b) => b.price == null || Number(b.price) === 0;
  return {
    origem: "parcial",
    totais: {
      ebooks: livros.length,
      publicados: livros.filter((b) => b.published).length,
      rascunhos: livros.filter((b) => !b.published).length,
      gratuitos: livros.filter((b) => b.published && livre(b)).length,
      criados_mes: atual.criados, publicados_mes: atual.publicados,
      vendidos_total: 0, vendidos_mes: 0, receita_total: 0, receita_mes: 0, gratis_total: 0, gratis_mes: 0,
    },
    meses, top: [], topGratis: [], livros: [],
  };
}

async function carregar() {
  if (MODO_TESTE) return amostra();

  let livros = [];
  let q = await supabase.from("books")
    .select("id,title,author,category,price,color,cover_url,published,created_at,updated_at,published_at")
    .order("updated_at", { ascending: false }).limit(300);
  if (q.error) {
    // coluna published_at ainda não existe
    q = await supabase.from("books")
      .select("id,title,author,category,price,color,cover_url,published,created_at,updated_at")
      .order("updated_at", { ascending: false }).limit(300);
  }
  livros = q.data || [];

  const { data, error } = await supabase.rpc("admin_dashboard");
  const base = !error && data ? normalizar(data) : dePartir(livros);
  base.livros = livros;
  if (!base.top.length && !base.topGratis.length && base.origem === "parcial") {
    // sem a função do banco ainda: mostra os mais recentes como "destaques" (sem números de venda)
    base.topGratis = [];
  }
  return base;
}

/* -------------------------------------------------------------- utilidades */
function contar(el, alvo, formatar = (v) => NUM.format(Math.round(v)), dur = 900) {
  if (reduzMov || alvo === 0) { el.textContent = formatar(alvo); return; }
  const t0 = performance.now();
  const passo = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = formatar(alvo * e);
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

function escalaInteira(max) {
  const topo = Math.max(4, Math.ceil(max / 4) * 4);
  return { topo, passos: [0, 1, 2, 3, 4].map((i) => (topo / 4) * i) };
}

function escalaBonita(max) {
  if (max <= 0) return { topo: 4, passos: [0, 1, 2, 3, 4] };
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const topo = nice * exp;
  return { topo, passos: [0, 1, 2, 3, 4].map((i) => (topo / 4) * i) };
}

const dica = $("#dica");
function mostrarDica(html, x, y) {
  dica.innerHTML = html;
  dica.hidden = false;
  const r = dica.getBoundingClientRect();
  const nx = Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8);
  dica.style.left = `${nx}px`;
  dica.style.top = `${Math.max(8, y - r.height - 14)}px`;
}
const esconderDica = () => { dica.hidden = true; };

/* ----------------------------------------------------------------- KPIs */
function delta(atual, anterior) {
  if (anterior === 0 && atual === 0) return { txt: "sem mudança", cls: "neutro" };
  if (anterior === 0) return { txt: "novo", cls: "sobe" };
  const p = ((atual - anterior) / anterior) * 100;
  return { txt: `${p > 0 ? "+" : ""}${Math.round(p)}%`, cls: p > 0 ? "sobe" : p < 0 ? "desce" : "neutro" };
}

function sparkline(valores, cor) {
  const W = 112, H = 36, P = 3;
  const max = Math.max(...valores, 1);
  const pts = valores.map((v, i) => [P + (i * (W - 2 * P)) / (valores.length - 1), H - P - (v / max) * (H - 2 * P)]);
  const linha = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${linha} L${pts[pts.length - 1][0]} ${H - P} L${pts[0][0]} ${H - P} Z`;
  const ult = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
    <path d="${area}" fill="${cor}" opacity="0.14"/>
    <path class="spark__linha" d="${linha}" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${ult[0]}" cy="${ult[1]}" r="3" fill="${cor}"/>
  </svg>`;
}

function renderKpis(d) {
  const m = d.meses, ult = m[m.length - 1], pen = m[m.length - 2] || { criados: 0, publicados: 0, vendidos: 0, receita: 0, gratis: 0 };
  const serie = (k) => m.map((x) => x[k]);
  const itens = [
    { icone: "book", rotulo: "Ebooks no sistema", valor: d.totais.ebooks, fmt: (v) => NUM.format(Math.round(v)),
      sub: `${d.totais.publicados} publicados · ${d.totais.rascunhos} rascunhos`, cor: "#344E41", serie: serie("criados"), delta: null },
    { icone: "sparkles", rotulo: "Criados no mês", valor: d.totais.criados_mes, fmt: (v) => NUM.format(Math.round(v)),
      sub: "novos ebooks", cor: "#7F6428", serie: serie("criados"), delta: delta(ult.criados, pen.criados) },
    { icone: "store", rotulo: "Publicados no mês", valor: d.totais.publicados_mes, fmt: (v) => NUM.format(Math.round(v)),
      sub: "foram para a loja", cor: "#4E6B5C", serie: serie("publicados"), delta: delta(ult.publicados, pen.publicados) },
    { icone: "chart", rotulo: "Vendidos", valor: d.totais.vendidos_total, fmt: (v) => NUM.format(Math.round(v)),
      sub: `${NUM.format(d.totais.vendidos_mes)} neste mês`, cor: "#344E41", serie: serie("vendidos"), delta: delta(ult.vendidos, pen.vendidos) },
    { icone: "coins", rotulo: "Valor das vendas", valor: d.totais.receita_total, fmt: (v) => BRL.format(v),
      sub: `${BRL.format(d.totais.receita_mes)} neste mês`, cor: "#8A6D2F", serie: serie("receita"), delta: delta(ult.receita, pen.receita), destaque: true },
    { icone: "gift", rotulo: "Obtidos grátis", valor: d.totais.gratis_total, fmt: (v) => NUM.format(Math.round(v)),
      sub: `${NUM.format(d.totais.gratis_mes)} neste mês`, cor: "#A3B18A", serie: serie("gratis"), delta: delta(ult.gratis, pen.gratis) },
  ];
  $("#kpis").innerHTML = itens.map((k, i) => `
    <li class="kpi${k.destaque ? " kpi--destaque" : ""}" style="--i:${i}">
      <div class="kpi__topo">
        <span class="kpi__ico">${ico(k.icone, 22)}</span>
        ${k.delta ? `<span class="chip chip--${k.delta.cls}" title="Comparado ao mês anterior">${k.delta.cls === "sobe" ? "▲" : k.delta.cls === "desce" ? "▼" : "•"} ${esc(k.delta.txt)}</span>` : ""}
      </div>
      <p class="kpi__rotulo">${esc(k.rotulo)}</p>
      <p class="kpi__valor" data-valor="${k.valor}">${k.fmt(0)}</p>
      <div class="kpi__base">
        <span class="kpi__sub">${esc(k.sub)}</span>
        ${sparkline(k.serie, k.cor)}
      </div>
    </li>`).join("");
  $("#kpis").querySelectorAll(".kpi").forEach((li, i) => contar($(".kpi__valor", li), itens[i].valor, itens[i].fmt));
}

/* -------------------------------------------- gráfico: receita x vendidos */
function renderVendas(d) {
  const box = $("#g-vendas");
  const m = d.meses;
  const W = 640, H = 290, L = 54, R = 46, T = 18, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const maxR = Math.max(...m.map((x) => x.receita), 0);
  const maxV = Math.max(...m.map((x) => x.vendidos), 0);
  const semVendas = maxR === 0 && maxV === 0;
  const eR = escalaBonita(semVendas ? 0 : maxR);
  const eV = escalaInteira(semVendas ? 0 : maxV);
  const passo = iw / m.length, larg = Math.min(46, passo * 0.5);
  const x = (i) => L + passo * i + passo / 2;
  const yR = (v) => T + ih - (v / eR.topo) * ih;
  const yV = (v) => T + ih - (v / eV.topo) * ih;

  const grade = eR.passos.map((p, i) => {
    const y = T + ih - (i / 4) * ih;
    return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="g-grade"/>
      <text x="${L - 8}" y="${y + 4}" class="g-eixo" text-anchor="end">${semVendas ? "" : p >= 1000 ? NUM.format(Math.round(p)) : String(Math.round(p * 10) / 10).replace(".", ",")}</text>
      <text x="${W - R + 8}" y="${y + 4}" class="g-eixo g-eixo--v" text-anchor="start">${semVendas ? "" : Math.round(eV.passos[i] * 10) / 10}</text>`;
  }).join("");

  const barras = m.map((p, i) => {
    const h = semVendas ? 0 : (p.receita / eR.topo) * ih;
    return `<rect class="g-barra" style="--d:${i * 70}ms" x="${x(i) - larg / 2}" y="${T + ih - h}" width="${larg}" height="${Math.max(h, 0)}" rx="8"/>`;
  }).join("");

  const pts = m.map((p, i) => [x(i), yV(p.vendidos)]);
  const linha = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const pontos = pts.map((p, i) => `<circle class="g-ponto" cx="${p[0]}" cy="${p[1]}" r="5" style="--d:${400 + i * 70}ms"/>`).join("");
  const rotulos = m.map((p, i) => `<text x="${x(i)}" y="${H - 10}" class="g-eixo g-eixo--x" text-anchor="middle">${esc(rotuloMes(p.mes))}</text>`).join("");
  const zonas = m.map((p, i) => `<rect class="g-zona" data-i="${i}" x="${L + passo * i}" y="${T}" width="${passo}" height="${ih}" fill="transparent"/>`).join("");

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receita e unidades vendidas nos últimos 6 meses">
      ${grade}
      ${barras}
      ${semVendas ? "" : `<path class="g-linha" d="${linha}" pathLength="1"/>`}
      ${semVendas ? "" : pontos}
      ${rotulos}
      ${zonas}
    </svg>
    ${semVendas ? `<div class="grafico__vazio"><span>${ico("chart", 28)}</span><strong>Sem vendas ainda</strong><p>Quando o primeiro pagamento for confirmado, a receita e as unidades aparecem aqui.</p></div>` : ""}`;

  box.querySelectorAll(".g-zona").forEach((z) => {
    const i = Number(z.dataset.i);
    z.addEventListener("pointerenter", (e) => {
      const r = z.getBoundingClientRect();
      mostrarDica(`<strong>${esc(mesPorExtenso(m[i].mes))}</strong><span><i class="leg leg--receita"></i>${BRL.format(m[i].receita)}</span><span><i class="leg leg--vendas"></i>${NUM.format(m[i].vendidos)} vendidos</span>`, r.left + r.width / 2, r.top + 24);
    });
    z.addEventListener("pointerleave", esconderDica);
  });
}

/* ----------------------------------------------- gráfico: criados x publicados */
function renderProducao(d) {
  const box = $("#g-producao");
  const m = d.meses;
  const W = 420, H = 250, L = 28, R = 8, T = 14, B = 32;
  const iw = W - L - R, ih = H - T - B;
  const max = Math.max(...m.flatMap((x) => [x.criados, x.publicados]), 0);
  const e = escalaInteira(max);
  const passo = iw / m.length, larg = Math.min(18, passo * 0.28);
  const y = (v) => T + ih - (v / e.topo) * ih;
  const grade = e.passos.map((p, i) => {
    const yy = T + ih - (i / 4) * ih;
    return `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="g-grade"/><text x="${L - 6}" y="${yy + 4}" class="g-eixo" text-anchor="end">${max === 0 ? "" : Math.round(p * 10) / 10}</text>`;
  }).join("");
  const barras = m.map((p, i) => {
    const cx = L + passo * i + passo / 2;
    const h1 = (p.criados / e.topo) * ih, h2 = (p.publicados / e.topo) * ih;
    return `<rect class="g-barra g-barra--criados" style="--d:${i * 60}ms" x="${cx - larg - 2}" y="${T + ih - h1}" width="${larg}" height="${h1}" rx="6"/>
      <rect class="g-barra g-barra--publicados" style="--d:${i * 60 + 40}ms" x="${cx + 2}" y="${T + ih - h2}" width="${larg}" height="${h2}" rx="6"/>
      <text x="${cx}" y="${H - 10}" class="g-eixo g-eixo--x" text-anchor="middle">${esc(rotuloMes(p.mes))}</text>
      <rect class="g-zona" data-i="${i}" x="${L + passo * i}" y="${T}" width="${passo}" height="${ih}" fill="transparent"/>`;
  }).join("");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ebooks criados e publicados por mês">${grade}${barras}</svg>`;
  box.querySelectorAll(".g-zona").forEach((z) => {
    const i = Number(z.dataset.i);
    z.addEventListener("pointerenter", () => {
      const r = z.getBoundingClientRect();
      mostrarDica(`<strong>${esc(mesPorExtenso(m[i].mes))}</strong><span><i class="leg leg--criados"></i>${m[i].criados} criados</span><span><i class="leg leg--publicados"></i>${m[i].publicados} publicados</span>`, r.left + r.width / 2, r.top + 20);
    });
    z.addEventListener("pointerleave", esconderDica);
  });
}

/* --------------------------------------------------------- gráfico: rosca */
function renderSituacao(d) {
  const box = $("#g-situacao");
  const t = d.totais;
  const pagos = Math.max(0, t.publicados - t.gratuitos);
  const fatias = [
    { nome: "Publicados pagos", v: pagos, cor: "#344E41" },
    { nome: "Publicados grátis", v: t.gratuitos, cor: "#A3B18A" },
    { nome: "Rascunhos", v: t.rascunhos, cor: "#C6A667" },
  ];
  const total = fatias.reduce((s, f) => s + f.v, 0);
  const R = 70, C = 2 * Math.PI * R, cx = 100, cy = 100;
  let acum = 0;
  const arcos = total === 0
    ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#e8e4d6" stroke-width="26"/>`
    : fatias.map((f, i) => {
        const len = (f.v / total) * C;
        const arco = `<circle class="g-fatia" style="--d:${i * 120}ms" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${f.cor}" stroke-width="26"
          stroke-dasharray="${Math.max(len - 2, 0)} ${C}" stroke-dashoffset="${-acum}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(f.nome)}: ${f.v}</title></circle>`;
        acum += len;
        return arco;
      }).join("");
  box.innerHTML = `
    <div class="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label="Situação do catálogo: ${fatias.map((f) => `${f.nome} ${f.v}`).join(", ")}">
        ${arcos}
        <text x="100" y="98" text-anchor="middle" class="donut__num">${NUM.format(total)}</text>
        <text x="100" y="118" text-anchor="middle" class="donut__rot">ebooks</text>
      </svg>
      <ul class="donut__leg">
        ${fatias.map((f) => `<li><i style="background:${f.cor}"></i><span>${esc(f.nome)}</span><strong>${f.v}</strong></li>`).join("")}
      </ul>
    </div>`;
}

/* ------------------------------------------------------------- ranking 3D */
function livro3d(b, tam = "m") {
  const cover = UI.cover({ id: b.id, title: b.title, author: b.author, color: "forest", bg: b.color, cover: b.cover_url || "" });
  return `<div class="b3d b3d--${tam}"><div class="b3d__corpo">${cover}</div></div>`;
}

function renderRanking(d) {
  const lista = d.top.length ? d.top : d.topGratis;
  const porVenda = d.top.length > 0;
  $("#ranking-sub").textContent = porVenda ? "Ranking por unidades vendidas" : lista.length ? "Sem vendas ainda: ranking por ebooks obtidos grátis" : "Ranking por unidades vendidas";
  const ol = $("#ranking");
  if (!lista.length) {
    ol.innerHTML = `<li class="vazio vazio--bloco"><span>${ico("trophy", 28)}</span><strong>O ranking aparece com as primeiras vendas</strong><p>Publique um ebook e acompanhe aqui quais se destacam.</p></li>`;
    return;
  }
  const max = Math.max(...lista.map((x) => x.vendidos), 1);
  ol.innerHTML = lista.map((b, i) => `
    <li class="rank" style="--i:${i}">
      <span class="rank__pos rank__pos--${i + 1}">${i + 1}</span>
      ${livro3d(b, "s")}
      <div class="rank__info">
        <p class="rank__titulo">${esc(b.title)}</p>
        <p class="rank__autor">${esc(b.author || "")}</p>
        <div class="rank__barra"><span style="--w:${Math.max(6, (b.vendidos / max) * 100)}%"></span></div>
      </div>
      <div class="rank__nums">
        <strong>${NUM.format(b.vendidos)}</strong><small>${porVenda ? "vendidos" : "obtidos"}</small>
        ${porVenda ? `<span class="rank__valor">${BRL.format(b.receita)}</span>` : ""}
      </div>
      <a class="rank__editar" href="admin-ebook.html?id=${encodeURIComponent(b.id)}" aria-label="Editar ${esc(b.title)}">${ico("arrow", 18)}</a>
    </li>`).join("");
}

/* ----------------------------------------------------------- hero e tabela */
function renderHero(d, nome) {
  const agora = new Date();
  const dia = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  $("#hero-data").textContent = dia.charAt(0).toUpperCase() + dia.slice(1);
  $("#hero-titulo").textContent = nome ? `Olá, ${nome}` : "Olá!";
  const t = d.totais;
  const partes = [];
  partes.push(`Você tem <b>${NUM.format(t.ebooks)}</b> ${t.ebooks === 1 ? "ebook" : "ebooks"} no sistema`);
  partes.push(`<b>${NUM.format(t.publicados_mes)}</b> ${t.publicados_mes === 1 ? "foi publicado" : "foram publicados"} neste mês`);
  if (t.vendidos_mes) partes.push(`e <b>${NUM.format(t.vendidos_mes)}</b> ${t.vendidos_mes === 1 ? "venda" : "vendas"} somaram <b>${BRL.format(t.receita_mes)}</b>`);
  $("#hero-resumo").innerHTML = partes.join(", ").replace(/, e /, " e ") + ".";

  const capas = (d.top.length ? d.top : d.livros).slice(0, 3);
  $("#hero-livros").innerHTML = capas.length
    ? capas.map((b, i) => `<div class="hero__b3d hero__b3d--${i}">${livro3d(b, "g")}</div>`).join("")
    : `<div class="hero__b3d hero__b3d--0"><div class="b3d b3d--g"><div class="b3d__corpo">${UI.cover({ title: "Seu próximo ebook", author: "Íntima Graça", color: "forest" })}</div></div></div>`;

  const av = $("#aviso-origem");
  if (d.origem === "amostra") { av.hidden = false; av.textContent = "Modo de teste: números de exemplo."; }
  else if (d.origem === "parcial") { av.hidden = false; av.textContent = "Vendas e receita aparecem depois que o SQL do painel for aplicado no banco e o checkout estiver ativo."; }
}

function renderTabela(d) {
  const tb = $("#tabela-livros");
  const livros = d.livros.slice(0, 8);
  $("#vazio-livros").hidden = livros.length > 0;
  tb.innerHTML = livros.map((b) => {
    const gratis = b.price == null || Number(b.price) === 0;
    return `<tr>
      <td><div class="celula-livro">${livro3d(b, "p")}<div><strong>${esc(b.title)}</strong><small>${esc(b.author || "")}</small></div></div></td>
      <td>${esc(b.category || "—")}</td>
      <td><span class="status status--${b.published ? "on" : "off"}">${b.published ? "Publicado" : "Rascunho"}</span></td>
      <td class="num">${gratis ? '<span class="tag-free">Free</span>' : BRL.format(Number(b.price))}</td>
      <td>${esc(dataCurta(b.updated_at))}</td>
      <td><a class="btn btn--ghost btn--sm" href="admin-ebook.html?id=${encodeURIComponent(b.id)}">Editar</a></td>
    </tr>`;
  }).join("");
}

/* -------------------------------------------------------------------- app */
function icones() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    if (!el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", ico(el.dataset.icon, Number(el.dataset.size) || 20));
  });
}

function nomeDe(email, meta) {
  const n = (meta && (meta.full_name || meta.name)) || "";
  return String(n || email || "").split(/[\s@]/)[0];
}

async function iniciar(nome) {
  $("#gate").hidden = true;
  $("#app").hidden = false;
  icones();
  const dados = await carregar();
  renderHero(dados, nome);
  renderKpis(dados);
  renderVendas(dados);
  renderSituacao(dados);
  renderRanking(dados);
  renderProducao(dados);
  renderTabela(dados);
  document.body.classList.add("pronto");
}

async function gate() {
  const msg = $("#gate-msg");
  $("#btn-sair")?.addEventListener("click", async () => {
    await supabase?.auth.signOut();
    location.reload();
  });
  if (MODO_TESTE) return iniciar("Ana");
  if (!supabase) { msg.textContent = "Configure o Supabase em js/supabase.js."; return; }

  const verificar = async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return null;
    const { data: ok, error } = await supabase.rpc("is_admin");
    if (error) { msg.textContent = "Não foi possível validar o acesso. Tente novamente em instantes."; return null; }
    if (!ok) { msg.textContent = "Esta conta não é a administradora."; await supabase.auth.signOut(); return null; }
    return s.session.user;
  };

  const u = await verificar();
  if (u) return iniciar(nomeDe(u.email, u.user_metadata));

  $("#gate-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.textContent = "Aguarde…";
    const { error } = await supabase.auth.signInWithPassword({ email: $("#g-email").value.trim(), password: $("#g-pass").value });
    if (error) { msg.textContent = "E-mail ou senha incorretos."; return; }
    const logado = await verificar();
    if (logado) iniciar(nomeDe(logado.email, logado.user_metadata));
  });
}

document.addEventListener("dragstart", (e) => { if (e.target && e.target.tagName === "IMG") e.preventDefault(); });
gate();
