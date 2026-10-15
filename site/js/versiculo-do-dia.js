// Versículo do dia — igual para todos os visitantes, troca à meia-noite de America/Fortaleza.
// ES module, sem variáveis globais. Inicializa em todo elemento [data-versiculo-do-dia].
//
// Atributos opcionais do elemento:
//   data-marca="Nome da marca"   -> usado na mensagem de compartilhamento ("via ...")
//   data-url="https://..."       -> endereço do site no compartilhamento (padrão: raiz do site atual)
// Parâmetros de teste na URL da página:  ?dia=N (1..366)  ou  ?data=MM-DD

import { gerarImagem } from "./versiculo-imagem.js?v=2";

const FUSO = "America/Fortaleza";
const CACHE_KEY = "versiculo-do-dia:v2";
const MARCA_PADRAO = "Íntima Graça";
const DADOS = new URL("../data/versiculos.json", import.meta.url);
const ESPECIAIS = new URL("../data/versiculos-especiais.json", import.meta.url);
const LOGO = new URL("../assets/logo-intima-graca.svg", import.meta.url).href;

// Reserva embutida: usada se o JSON não puder ser carregado.
const RESERVA = [
  { dia: 1, ref: "Salmos 46:10", tema: "descanso", texto: "", versao: "" },
  { dia: 2, ref: "Efésios 2:8", tema: "graça", texto: "", versao: "" },
  { dia: 3, ref: "Jeremias 29:11", tema: "esperança", texto: "", versao: "" },
];

/* ------------------------------------------------------------------ datas */

/** Ano, mês e dia no fuso de Fortaleza. */
function partesNoFuso(data = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(data);
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return { ano: g("year"), mes: g("month"), dia: g("day") };
}

const diaDoAno = ({ ano, mes, dia }) => Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(ano, 0, 0)) / 864e5);
const chaveMD = ({ mes, dia }) => `${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
const chaveDia = (p) => `${p.ano}-${chaveMD(p)}`;
const ehBissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

/** Domingo de Páscoa (calendário gregoriano, algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

/** Dia do mês do n-ésimo domingo. */
function enesimoDomingo(ano, mes, n) {
  const sem = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay(); // 0 = domingo
  return 1 + ((7 - sem) % 7) + 7 * (n - 1);
}

function dataDaRegra(regra, ano) {
  if (regra?.tipo === "pascoa") return pascoa(ano);
  if (regra?.tipo === "domingo") return { mes: regra.mes, dia: enesimoDomingo(ano, regra.mes, regra.n || 1) };
  return null;
}

/* -------------------------------------------------------------- escolha */

/** Escolhe o versículo: data especial primeiro, depois a lista normal. */
export function escolherVersiculo(partes, versiculos, especiais, forcarLista = false) {
  if (!forcarLista && especiais) {
    const fixa = especiais.fixas?.[chaveMD(partes)];
    if (fixa) return { ...fixa };
    for (const m of especiais.moveis || []) {
      const d = dataDaRegra(m.regra, partes.ano);
      if (d && d.mes === partes.mes && d.dia === partes.dia) return { ...m };
    }
  }
  const lista = versiculos?.length ? versiculos : RESERVA;
  const n = forcarLista ? partes.n : diaDoAno(partes);
  // Dia 366 (ano bissexto) reaproveita uma entrada: volta ao início do ciclo.
  const alvo = lista.find((v) => v.dia === n);
  return { ...(alvo || lista[(n - 1) % lista.length]) };
}

/** Lê ?dia=N ou ?data=MM-DD (apenas para testes). */
function simulacao(ano) {
  const q = new URLSearchParams(location.search);
  const dia = Number(q.get("dia"));
  if (dia >= 1 && dia <= 366) {
    if (dia === 366) return { ano, mes: 12, dia: 31, n: 366, forcarLista: true };
    const d = new Date(Date.UTC(ano, 0, dia));
    return { ano, mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), n: dia, forcarLista: false };
  }
  const m = /^(\d{2})-(\d{2})$/.exec(q.get("data") || "");
  if (m) return { ano, mes: Number(m[1]), dia: Number(m[2]), forcarLista: false };
  return null;
}

/* ---------------------------------------------------------------- dados */

async function carregarDados(hoje, ignorarCache) {
  if (!ignorarCache) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && c.data === hoje && Array.isArray(c.versiculos) && c.versiculos.length) return c;
    } catch { /* sem storage ou JSON inválido: busca de novo */ }
  }
  const buscar = async (url, vazio) => {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch { return vazio; }
  };
  const versiculos = await buscar(DADOS, null);
  if (!Array.isArray(versiculos) || !versiculos.length) return null; // cai na reserva
  const especiais = await buscar(ESPECIAIS, { fixas: {}, moveis: [] });
  const dados = { data: hoje, versiculos, especiais };
  if (!ignorarCache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(dados)); } catch { /* ok */ }
  }
  return dados;
}

/* ------------------------------------------------------------ interface */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ICONE_WHATSAPP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.5 11.5a8 8 0 0 1-11.7 7L4 20l1.5-4.6A8 8 0 1 1 20.5 11.5z"/><path d="M9.3 9.2c.2 2.2 2.6 4.6 4.9 4.9l1-1.1-1.6-.9-.7.5c-.8-.3-1.5-1-1.8-1.8l.5-.7-.9-1.6z"/></svg>';

function montar(host, v, marca, urlSite) {
  const temTexto = Boolean(v.texto && v.texto.trim());
  const referencia = v.versao ? `${v.ref} (${v.versao})` : v.ref;

  host.classList.add("versiculo");
  host.setAttribute("aria-label", "Versículo do dia");
  host.innerHTML = `
    <h2 class="versiculo__titulo">Versículo do dia</h2>
    <span class="versiculo__filete" aria-hidden="true"></span>
    ${v.rotulo ? `<p class="versiculo__rotulo">${esc(v.rotulo)}</p>` : ""}
    ${temTexto ? `<blockquote class="versiculo__texto">${esc(v.texto.trim())}</blockquote>` : ""}
    <p class="versiculo__ref"><cite>${esc(v.ref)}</cite>${v.versao ? `<span class="versiculo__versao">${esc(v.versao)}</span>` : ""}</p>
    <div class="versiculo__acoes">
      <button class="versiculo__btn versiculo__btn--principal" type="button" data-compartilhar aria-label="Compartilhar no WhatsApp">
        ${ICONE_WHATSAPP}<span>Compartilhar no WhatsApp</span>
      </button>
    </div>
    <p class="versiculo__aviso" role="status" aria-live="polite"></p>`;

  const aviso = host.querySelector(".versiculo__aviso");
  const avisar = (txt, ms = 3200) => {
    aviso.textContent = txt;
    clearTimeout(aviso._t);
    if (txt) aviso._t = setTimeout(() => { aviso.textContent = ""; }, ms);
  };
  const legenda = `${referencia}
${urlSite}`;
  const nomeArquivo = `versiculo-do-dia-${(v.ref || "").replace(/[^\w]+/g, "-").toLowerCase()}.png`;

  const gerar = () => {
    const escuro = document.documentElement.getAttribute("data-theme") === "dark" || host.classList.contains("versiculo--escuro");
    return gerarImagem(v, { marca, url: urlSite, logo: host.dataset.logo || LOGO, tema: escuro ? "escuro" : "claro" });
  };
  const baixar = (blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  // Abre o WhatsApp SEM texto: a mensagem tem que ser a imagem colada/anexada.
  const abrirWhatsApp = () => window.open("https://wa.me/", "_blank", "noopener");

  // Cópia de imagem "à moda antiga": funciona também em endereços http (rede local),
  // onde a API moderna da área de transferência é bloqueada pelo navegador.
  const copiarImagemLegado = (blob) => new Promise((resolve) => {
    const fr = new FileReader();
    fr.onerror = () => resolve(false);
    fr.onload = () => {
      const caixa = document.createElement("div");
      caixa.contentEditable = "true";
      caixa.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      const img = new Image();
      img.onload = () => {
        let ok = false;
        try {
          const sel = getSelection();
          const r = document.createRange();
          r.selectNodeContents(caixa);
          sel.removeAllRanges();
          sel.addRange(r);
          ok = document.execCommand("copy");
          sel.removeAllRanges();
        } catch { /* ok permanece false */ }
        caixa.remove();
        resolve(ok);
      };
      img.onerror = () => { caixa.remove(); resolve(false); };
      img.src = fr.result;
      caixa.appendChild(img);
      document.body.appendChild(caixa);
    };
    fr.readAsDataURL(blob);
  });

  // Compartilhar: copia a imagem e abre o WhatsApp; na conversa é só colar (Ctrl+V / toque longo) e enviar.
  host.querySelector("[data-compartilhar]").addEventListener("click", async () => {
    const promessa = gerar();
    avisar("Preparando a imagem…", 8000);
    let copiou = false;

    // 1) API moderna (precisa de HTTPS ou localhost)
    try {
      if (window.isSecureContext && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": promessa })]);
        copiou = true;
      }
    } catch { /* tenta os próximos */ }

    let blob = null;
    try { blob = await promessa; } catch { /* tratado abaixo */ }
    if (!blob) { avisar("Não foi possível gerar a imagem."); return; }

    if (copiou) {
      abrirWhatsApp();
      avisar("Imagem copiada! Cole na conversa do WhatsApp e envie.", 8000);
      return;
    }

    // 2) Celulares com HTTPS: folha de compartilhamento do sistema com a imagem anexada
    const file = new File([blob], nomeArquivo, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Versículo do dia", text: legenda });
        avisar("");
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") { avisar(""); return; }
    }

    // 3) Endereço sem HTTPS: tenta copiar pelo método antigo e também salva o arquivo
    const copiouLegado = await copiarImagemLegado(blob);
    baixar(blob);
    abrirWhatsApp();
    if (!window.isSecureContext) {
      console.warn("Compartilhar imagem direto exige HTTPS (ou localhost). Este endereço usa http.");
    }
    avisar(copiouLegado
      ? "Imagem copiada e salva. Cole na conversa do WhatsApp (se não colar, anexe o arquivo salvo)."
      : "Imagem salva no aparelho. Anexe-a na conversa do WhatsApp.", 9000);
  });
}

async function iniciar(host) {
  // ?limpar=1 apaga o cache do dia (útil depois de editar os JSON)
  if (new URLSearchParams(location.search).has("limpar")) {
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ok */ }
  }
  const marca = host.dataset.marca || MARCA_PADRAO;
  const urlSite = host.dataset.url || `${location.origin}/`;
  try {
    const hoje = partesNoFuso();
    const sim = simulacao(hoje.ano);
    const partes = sim || hoje;
    const dados = await carregarDados(chaveDia(hoje), Boolean(sim));
    const v = escolherVersiculo(partes, dados?.versiculos, dados?.especiais, Boolean(sim?.forcarLista));
    montar(host, v, marca, urlSite);
    host.dataset.versiculoDia = String(v.dia ?? "");
    host.dataset.versiculoRef = v.ref;
  } catch {
    montar(host, RESERVA[0], marca, urlSite);
  }
}

function init() {
  document.querySelectorAll("[data-versiculo-do-dia]").forEach(iniciar);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
