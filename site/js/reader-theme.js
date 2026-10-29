// Temas de leitura e "descanso para os olhos" (filtro quente).
// As preferências ficam em localStorage ("intimagraca:leitor").

const KEY = "intimagraca:leitor";

export const CLIMAS = ["Todos", "Calmo", "Energético", "Sério", "Acolhedor"];

// bg: fundo ao redor do livro · barra: cabeçalho e ferramentas · texto: cor do texto da interface
// tint: cor multiplicada sobre as páginas (papel colorido) · escuro: inverte as páginas
export const TEMAS = [
  { id: "classico", nome: "Clássico", clima: ["Sério", "Calmo"], bg: "#F1EEE4", barra: "#F8F6F0", texto: "#344E41", tint: "#FFFFFF" },
  { id: "nevoa", nome: "Névoa", clima: ["Calmo"], bg: "#E6EBF0", barra: "#F3F6F9", texto: "#2B3640", tint: "#E7EDF4" },
  { id: "salvia", nome: "Sálvia", clima: ["Calmo", "Acolhedor"], bg: "#E1E9D8", barra: "#EDF2E6", texto: "#2F4538", tint: "#E3EBD9" },
  { id: "oceano", nome: "Oceano", clima: ["Calmo"], bg: "#D6E6F1", barra: "#E5F0F7", texto: "#17384F", tint: "#DAE9F4" },
  { id: "lavanda", nome: "Lavanda", clima: ["Calmo"], bg: "#E3DDF1", barra: "#EEEAF7", texto: "#3C3358", tint: "#E7E0F5" },
  { id: "areia", nome: "Areia", clima: ["Acolhedor"], bg: "#EBE0CA", barra: "#F4ECDC", texto: "#4A3F2A", tint: "#F1E5C8" },
  { id: "pessego", nome: "Pêssego", clima: ["Acolhedor"], bg: "#F4DCCF", barra: "#FAE9E0", texto: "#5A3426", tint: "#F8DDCE" },
  { id: "papel", nome: "Papel antigo", clima: ["Acolhedor", "Calmo"], bg: "#E6D4AE", barra: "#EFE1C0", texto: "#4B3A1E", tint: "#EDD9AB" },
  { id: "tropical", nome: "Tropical", clima: ["Energético"], bg: "#D2EEE2", barra: "#E3F6EE", texto: "#0F4A38", tint: "#D7F0E5" },
  { id: "citrico", nome: "Cítrico", clima: ["Energético"], bg: "#F5EDC3", barra: "#FAF4D9", texto: "#4A4311", tint: "#F7EEBE" },
  { id: "grafite", nome: "Grafite", clima: ["Sério"], bg: "#23272A", barra: "#2D3236", texto: "#E8EAEC", tint: "#FFFFFF", escuro: true },
  { id: "noturno", nome: "Noturno", clima: ["Sério", "Calmo"], bg: "#0F1914", barra: "#17231D", texto: "#E3EBE5", tint: "#FFFFFF", escuro: true },
  { id: "contraste", nome: "Alto contraste", clima: ["Sério"], bg: "#000000", barra: "#000000", texto: "#FFFFFF", tint: "#FFFFFF", escuro: true, contraste: true },
];

export const PADRAO = {
  tema: "classico",
  hue: 150,
  sat: 40,
  olhos: false,
  olhosNivel: 45,
  volume: 0.6,
  corMarca: "amarelo",
};

// O que vem do navegador (localStorage) pode ter sido alterado à mão: só valores esperados passam.
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const CORES_MARCA = ["amarelo", "verde", "rosa", "azul"];
function sanear(p) {
  const ok = (id) => id === "personalizado" || TEMAS.some((t) => t.id === id);
  return {
    tema: typeof p.tema === "string" && ok(p.tema) ? p.tema : PADRAO.tema,
    hue: num(p.hue, 0, 360, PADRAO.hue),
    sat: num(p.sat, 15, 80, PADRAO.sat),
    olhos: p.olhos === true,
    olhosNivel: num(p.olhosNivel, 0, 100, PADRAO.olhosNivel),
    volume: num(p.volume, 0, 1, PADRAO.volume),
    corMarca: CORES_MARCA.includes(p.corMarca) ? p.corMarca : PADRAO.corMarca,
  };
}

export function lerPrefs() {
  try {
    const bruto = JSON.parse(localStorage.getItem(KEY));
    return bruto && typeof bruto === "object" ? sanear(bruto) : { ...PADRAO };
  } catch {
    return { ...PADRAO };
  }
}

export function salvarPrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* sem storage */ }
}

/** Cores do tema "personalizado" a partir do círculo cromático. */
export function temaPersonalizado(hue, sat) {
  const h = Math.round(hue);
  const s = Math.max(15, Math.min(80, Math.round(sat)));
  return {
    id: "personalizado", nome: "Personalizado", clima: [],
    bg: `hsl(${h} ${Math.round(s * 0.75)}% 90%)`,
    barra: `hsl(${h} ${Math.round(s * 0.6)}% 95%)`,
    texto: `hsl(${h} ${Math.min(60, s)}% 18%)`,
    tint: `hsl(${h} ${s}% 89%)`,
  };
}

export function temaDe(prefs) {
  if (prefs.tema === "personalizado") return temaPersonalizado(prefs.hue, prefs.sat);
  return TEMAS.find((t) => t.id === prefs.tema) || TEMAS[0];
}

/** Aplica o tema (variáveis CSS na raiz) e o filtro de descanso para os olhos. */
export function aplicar(prefs) {
  const t = temaDe(prefs);
  const r = document.documentElement;
  r.style.setProperty("--rd-bg", t.bg);
  r.style.setProperty("--rd-bar", t.barra);
  r.style.setProperty("--rd-text", t.texto);
  r.style.setProperty("--rd-tint", t.tint);
  r.dataset.rdTema = t.id;
  r.dataset.rdEscuro = t.escuro ? "1" : "0";
  r.dataset.rdContraste = t.contraste ? "1" : "0";

  const olho = document.getElementById("rd-eye");
  if (olho) {
    const k = prefs.olhos ? (Math.max(0, Math.min(100, prefs.olhosNivel)) / 100) * 0.62 : 0;
    // do branco (sem efeito) para um âmbar suave; multiplica por cima de tudo
    const g = Math.round(255 - (255 - 176) * k);
    const b = Math.round(255 - (255 - 98) * k);
    olho.style.background = `rgb(255, ${g}, ${b})`;
    olho.style.opacity = prefs.olhos ? "1" : "0";
  }
}
