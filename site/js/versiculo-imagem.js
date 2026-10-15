// Gera a imagem do versículo (PNG 1080x1350) no navegador, com o estilo do site e a logo.
// Sem bibliotecas: usa <canvas>. Retorna um Blob "image/png".

const L = 1080;
const A = 1350;

const TEMAS = {
  claro: { fundo: "#F8F6F0", texto: "#344E41", ref: "#7F6428", filete: "#C6A667", aspas: "#A3B18A", logo: "#344E41", suave: "rgba(52,78,65,0.7)", moldura: "rgba(198,166,103,0.9)" },
  escuro: { fundo: "#17211C", texto: "#F3F6F1", ref: "#D9BE85", filete: "#C6A667", aspas: "rgba(163,177,138,0.55)", logo: "#F3F6F1", suave: "rgba(243,246,241,0.7)", moldura: "rgba(198,166,103,0.8)" },
};

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo"));
    img.src = url;
  });
}

async function garantirFontes() {
  if (!document.fonts || !document.fonts.load) return;
  const lista = [
    'italic 500 48px "Cormorant Garamond"',
    'normal 600 48px "Cormorant Garamond"',
    '600 30px "Cinzel"',
    '400 100px "Great Vibes"',
    '600 28px "Manrope"',
  ];
  await Promise.all(lista.map((f) => document.fonts.load(f, "Aa").catch(() => null)));
}

/** Quebra o texto em linhas que cabem em `largura`. */
function quebrar(ctx, texto, largura) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else { linhas.push(atual); atual = p; }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function comEspaco(ctx, px, fn) {
  if ("letterSpacing" in ctx) {
    const antes = ctx.letterSpacing;
    ctx.letterSpacing = `${px}px`;
    fn();
    ctx.letterSpacing = antes;
  } else fn();
}

/**
 * @param {{texto?:string, ref:string, versao?:string, rotulo?:string}} v
 * @param {{marca:string, url:string, logo:string, tema?:"claro"|"escuro"}} o
 */
export async function gerarImagem(v, o) {
  await garantirFontes();
  const T = TEMAS[o.tema === "escuro" ? "escuro" : "claro"];
  const cv = document.createElement("canvas");
  cv.width = L;
  cv.height = A;
  const ctx = cv.getContext("2d");
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // fundo + moldura dupla
  ctx.fillStyle = T.fundo;
  ctx.fillRect(0, 0, L, A);
  ctx.strokeStyle = T.moldura;
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, L - 88, A - 88);
  ctx.lineWidth = 1;
  ctx.strokeRect(62, 62, L - 124, A - 124);

  // logo (recolorida pela cor do tema)
  try {
    const img = await carregarImagem(o.logo);
    const lw = 380;
    const lh = Math.round(lw * (img.naturalHeight || 240) / (img.naturalWidth || 636));
    const off = document.createElement("canvas");
    off.width = lw;
    off.height = lh;
    const oc = off.getContext("2d");
    oc.drawImage(img, 0, 0, lw, lh);
    oc.globalCompositeOperation = "source-in";
    oc.fillStyle = T.logo;
    oc.fillRect(0, 0, lw, lh);
    ctx.drawImage(off, (L - lw) / 2, 110, lw, lh);
  } catch {
    ctx.fillStyle = T.logo;
    ctx.font = '600 56px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(o.marca, L / 2, 190);
  }

  // título manuscrito + filete
  ctx.fillStyle = T.texto;
  ctx.font = '400 112px "Great Vibes", "Brush Script MT", cursive';
  ctx.fillText("Versículo do dia", L / 2, 440);
  ctx.fillStyle = T.filete;
  ctx.fillRect(L / 2 - 70, 484, 140, 4);

  // texto + referência: grupo centralizado entre o título e o rodapé
  const temTexto = Boolean(v.texto && v.texto.trim());
  const topo = v.rotulo ? 590 : 520;
  if (v.rotulo) {
    // selo da data especial (Natal, Páscoa...) logo abaixo do filete
    ctx.fillStyle = T.ref;
    ctx.font = '600 30px "Cinzel", Georgia, serif';
    comEspaco(ctx, 8, () => ctx.fillText(v.rotulo.toUpperCase(), L / 2, 548));
  }
  const base = 1215;
  const largura = L - 240;
  const margemAspas = temTexto ? 110 : 0;
  const alturaRef = 100;
  let tam = 66;
  let linhas = [];
  if (temTexto) {
    const texto = v.texto.trim();
    const maxBloco = (base - topo) - margemAspas - alturaRef;
    for (; tam >= 34; tam -= 2) {
      ctx.font = `italic 500 ${tam}px "Cormorant Garamond", Georgia, serif`;
      linhas = quebrar(ctx, texto, largura);
      if (linhas.length * tam * 1.28 <= maxBloco) break;
    }
  }
  const alturaLinha = tam * 1.28;
  const bloco = linhas.length * alturaLinha;
  let y = topo + ((base - topo) - (margemAspas + bloco + alturaRef)) / 2;
  if (temTexto) {
    ctx.fillStyle = T.aspas;
    ctx.font = '600 220px "Cormorant Garamond", Georgia, serif';
    ctx.fillText("“", L / 2, y + 140);
    y += margemAspas;
    ctx.fillStyle = T.texto;
    ctx.font = `italic 500 ${tam}px "Cormorant Garamond", Georgia, serif`;
    let yl = y + tam * 0.85;
    for (const l of linhas) {
      ctx.fillText(l, L / 2, yl);
      yl += alturaLinha;
    }
    y += bloco;
  }

  // referência com filetes laterais (sempre dentro da moldura)
  const yRef = y + 62;
  const ref = (v.ref + (v.versao ? `  ·  ${v.versao}` : "")).toUpperCase();
  ctx.fillStyle = T.ref;
  ctx.font = '600 38px "Cinzel", Georgia, serif';
  let larguraRef = 0;
  comEspaco(ctx, 5, () => {
    larguraRef = ctx.measureText(ref).width;
    ctx.fillText(ref, L / 2, yRef);
  });
  ctx.fillStyle = T.filete;
  const lado = Math.min(110, L / 2 - larguraRef / 2 - 30 - 130);
  if (lado > 20) {
    ctx.fillRect(L / 2 - larguraRef / 2 - 30 - lado, yRef - 14, lado, 2);
    ctx.fillRect(L / 2 + larguraRef / 2 + 30, yRef - 14, lado, 2);
  }

  // rodapé
  let host = "";
  try { host = new URL(o.url).host; } catch { host = ""; }
  ctx.fillStyle = T.suave;
  ctx.font = '600 28px "Manrope", system-ui, sans-serif';
  comEspaco(ctx, 1, () => ctx.fillText(host ? `${o.marca}  ·  ${host}` : o.marca, L / 2, 1262));

  return new Promise((resolve, reject) => {
    cv.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png");
  });
}
