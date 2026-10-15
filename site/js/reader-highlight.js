// Marcador de texto: guarda trechos marcados por livro (localStorage) e calcula posições na seleção.

export const CORES = [
  { id: "amarelo", nome: "Amarelo", css: "#FFE066" },
  { id: "verde", nome: "Verde", css: "#B6E3A1" },
  { id: "rosa", nome: "Rosa", css: "#FFC1D3" },
  { id: "azul", nome: "Azul", css: "#BEDFFF" },
];

const novoId = () => "m" + Math.random().toString(36).slice(2, 9);

export class Marcas {
  constructor(livroId) {
    this.key = `intimagraca:marcas:${livroId}`;
    this.lista = this.ler();
  }

  ler() {
    try {
      const v = JSON.parse(localStorage.getItem(this.key));
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  salvar() {
    try { localStorage.setItem(this.key, JSON.stringify(this.lista)); } catch { /* sem storage */ }
  }

  /** Mapa { idDoBloco: [marcações] } usado pelo renderizador. */
  porBloco() {
    const m = {};
    for (const x of this.lista) (m[x.b] ||= []).push(x);
    return m;
  }

  /** Adiciona e substitui o que se sobrepõe. */
  adicionar(bloco, s, e, cor) {
    this.lista = this.lista.filter((x) => x.b !== bloco || x.e <= s || x.s >= e);
    this.lista.push({ id: novoId(), b: bloco, s, e, c: cor });
    this.salvar();
  }

  remover(id) {
    this.lista = this.lista.filter((x) => x.id !== id);
    this.salvar();
  }

  limparBlocos(ids) {
    const set = new Set(ids);
    this.lista = this.lista.filter((x) => !set.has(x.b));
    this.salvar();
  }

  total() {
    return this.lista.length;
  }
}

const tamanho = (n) =>
  n.nodeType === 3 ? n.data.length : n.nodeName === "BR" ? 1 : [...n.childNodes].reduce((a, c) => a + tamanho(c), 0);

/** Posição (em caracteres do texto original) de um ponto do DOM dentro do bloco. */
function posicao(bloco, no, deslocamento) {
  let total = 0;
  let achou = false;
  const andar = (n) => {
    if (achou) return;
    if (n === no) {
      if (n.nodeType === 3) total += deslocamento;
      else for (let i = 0; i < deslocamento && i < n.childNodes.length; i++) total += tamanho(n.childNodes[i]);
      achou = true;
      return;
    }
    if (n.nodeType === 3) { total += n.data.length; return; }
    if (n.nodeName === "BR") { total += 1; return; }
    for (const c of n.childNodes) { andar(c); if (achou) return; }
  };
  andar(bloco);
  return total;
}

/**
 * Lê a seleção atual e devolve [{ b, s, e }] para cada bloco de texto tocado dentro de `raiz`.
 */
export function lerSelecao(raiz) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return [];
  const r = sel.getRangeAt(0);
  if (!raiz.contains(r.commonAncestorContainer)) return [];
  const saida = [];
  raiz.querySelectorAll(".bk-text[data-block]").forEach((bloco) => {
    if (!r.intersectsNode(bloco)) return;
    const total = tamanho(bloco);
    const todo = document.createRange();
    todo.selectNodeContents(bloco);
    const s = r.compareBoundaryPoints(Range.START_TO_START, todo) <= 0 ? 0 : posicao(bloco, r.startContainer, r.startOffset);
    const e = r.compareBoundaryPoints(Range.END_TO_END, todo) >= 0 ? total : posicao(bloco, r.endContainer, r.endOffset);
    if (e > s) saida.push({ b: bloco.dataset.block, s, e });
  });
  return saida;
}
