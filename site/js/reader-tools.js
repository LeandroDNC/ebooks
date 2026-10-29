// Ferramentas do leitor: tema e cores, descanso para os olhos, marcador de texto e sons ambiente.
import { renderPage } from "./book-render.js?v=202610291500";
import { TEMAS, CLIMAS, lerPrefs, salvarPrefs, aplicar } from "./reader-theme.js?v=202610291500";
import { CORES, lerSelecao } from "./reader-highlight.js?v=202610291500";
import { Ambiente, SONS } from "./reader-sound.js?v=202610291500";

const esc = (s) => UI.escapeHtml(s);
const ico = (n, t = 20) => UI.icon(n, t);
const $ = (s, r = document) => r.querySelector(s);

export function iniciarFerramentas({ livroEl, flip, seq, marcas }) {
  const prefs = lerPrefs();
  const amb = new Ambiente();
  amb.volume(prefs.volume);
  const salvar = () => salvarPrefs(prefs);

  const raiz = $("#rd-tools");
  const barra = $(".rd-tools__bar", raiz);
  const pop = $("#rd-pop");
  raiz.hidden = false;

  // camada de cor sobre as páginas (papel colorido)
  const tint = document.createElement("div");
  tint.className = "rd-tint";
  tint.setAttribute("aria-hidden", "true");
  livroEl.appendChild(tint);
  aplicar(prefs);

  /* ------------------------------------------------------------ botões */
  const BOTOES = [
    { id: "tema", rotulo: "Tema", icone: "palette" },
    { id: "olhos", rotulo: "Descanso", icone: "eye" },
    { id: "marcador", rotulo: "Marcador", icone: "marker" },
    { id: "som", rotulo: "Som", icone: "sound" },
  ];
  barra.innerHTML = BOTOES.map((b) => `
    <button type="button" class="rd-tool" data-tool="${b.id}" aria-haspopup="dialog" aria-expanded="false">
      <span class="rd-tool__ico icon-${b.icone}-tile">${ico(b.icone, 22)}</span>
      <span class="rd-tool__txt">${b.rotulo}</span>
    </button>`).join("");

  const atualizarEstados = () => {
    $('[data-tool="olhos"]', barra).classList.toggle("is-ativo", prefs.olhos);
    $('[data-tool="marcador"]', barra).classList.toggle("is-ativo", modoMarcador);
    $('[data-tool="som"]', barra).classList.toggle("is-ativo", Boolean(amb.tocando()));
  };

  /* ------------------------------------------------------------ painéis */
  let aberto = null;
  let clima = "Todos";

  const cabecalho = (titulo) => `
    <header class="rd-pop__top">
      <h2>${titulo}</h2>
      <button type="button" class="rd-pop__x" data-fechar aria-label="Fechar">${ico("x", 18)}</button>
    </header>`;

  function painelTema() {
    const lista = TEMAS.filter((t) => clima === "Todos" || t.clima.includes(clima));
    pop.innerHTML = `${cabecalho("Temas e cores")}
      <p class="rd-pop__sub">Qual clima combina com você?</p>
      <div class="rd-chips" role="group" aria-label="Clima">
        ${CLIMAS.map((c) => `<button type="button" class="rd-chip${c === clima ? " is-on" : ""}" data-clima="${c}">${c}</button>`).join("")}
      </div>
      <div class="rd-temas">
        ${lista.map((t) => `
          <button type="button" class="rd-tema${t.id === prefs.tema ? " is-on" : ""}" data-tema="${t.id}">
            <span class="rd-tema__prev" style="--a:${t.bg};--b:${t.barra};--c:${t.texto};--d:${t.tint}"><i></i><i></i><i></i></span>
            <span class="rd-tema__nome">${esc(t.nome)}</span>
          </button>`).join("")}
      </div>
      <div class="rd-roda-box">
        <div class="rd-roda" id="rd-roda" role="slider" tabindex="0" aria-label="Matiz da cor base" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${Math.round(prefs.hue)}" style="--hue:${prefs.hue}">
          <span class="rd-roda__knob"></span>
        </div>
        <div class="rd-roda__ctl">
          <strong>Círculo cromático</strong>
          <small>Arraste para escolher a cor base</small>
          <label>Intensidade
            <input type="range" id="rd-sat" min="15" max="80" value="${prefs.sat}">
          </label>
          <button type="button" class="rd-btn" data-tema="personalizado">Usar esta cor</button>
        </div>
      </div>`;
    ligarRoda();
  }

  function ligarRoda() {
    const roda = $("#rd-roda");
    if (!roda) return;
    const mover = (ev) => {
      const r = roda.getBoundingClientRect();
      const x = ev.clientX - (r.left + r.width / 2);
      const y = ev.clientY - (r.top + r.height / 2);
      const graus = (Math.atan2(y, x) * 180) / Math.PI + 90;
      prefs.hue = (graus + 360) % 360;
      prefs.tema = "personalizado";
      roda.style.setProperty("--hue", prefs.hue);
      roda.setAttribute("aria-valuenow", String(Math.round(prefs.hue)));
      aplicar(prefs);
      salvar();
    };
    roda.addEventListener("pointerdown", (e) => {
      roda.setPointerCapture(e.pointerId);
      mover(e);
      const mv = (ev) => mover(ev);
      const up = () => { roda.removeEventListener("pointermove", mv); roda.removeEventListener("pointerup", up); painelTema(); };
      roda.addEventListener("pointermove", mv);
      roda.addEventListener("pointerup", up);
    });
    roda.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") prefs.hue = (prefs.hue + 6) % 360;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") prefs.hue = (prefs.hue + 354) % 360;
      else return;
      e.preventDefault();
      prefs.tema = "personalizado";
      roda.style.setProperty("--hue", prefs.hue);
      roda.setAttribute("aria-valuenow", String(Math.round(prefs.hue)));
      aplicar(prefs);
      salvar();
    });
  }

  function painelOlhos() {
    pop.innerHTML = `${cabecalho("Descanso para os olhos")}
      <p class="rd-pop__sub">Deixa a tela mais quente e reduz a luz azul. Bom para ler à noite ou por muito tempo.</p>
      <button type="button" class="rd-switch" role="switch" aria-checked="${prefs.olhos}" data-olhos>
        <span class="rd-switch__track" aria-hidden="true"><span class="rd-switch__knob"></span></span>
        <span>${prefs.olhos ? "Ligado" : "Desligado"}</span>
      </button>
      <label class="rd-slider">
        <span>Intensidade <b id="rd-olhos-v">${prefs.olhosNivel}%</b></span>
        <input type="range" id="rd-olhos" min="0" max="100" value="${prefs.olhosNivel}">
      </label>
      <p class="rd-pop__dica">${ico("clock", 16)} Dica: combine com o tema Papel antigo ou Noturno.</p>`;
  }

  function painelMarcador() {
    pop.innerHTML = `${cabecalho("Marcador de texto")}
      <p class="rd-pop__sub">Ative, escolha a cor e selecione o trecho que deseja destacar. Toque numa marcação para removê-la.</p>
      <button type="button" class="rd-switch" role="switch" aria-checked="${modoMarcador}" data-modo>
        <span class="rd-switch__track" aria-hidden="true"><span class="rd-switch__knob"></span></span>
        <span>${modoMarcador ? "Marcador ligado" : "Marcador desligado"}</span>
      </button>
      <div class="rd-cores" role="group" aria-label="Cor do marcador">
        ${CORES.map((c) => `<button type="button" class="rd-cor${c.id === prefs.corMarca ? " is-on" : ""}" data-cor="${c.id}" style="--c:${c.css}" aria-label="${c.nome}" aria-pressed="${c.id === prefs.corMarca}"></button>`).join("")}
      </div>
      <div class="rd-pop__linha">
        <button type="button" class="rd-btn rd-btn--sec" data-limpar-pagina>Limpar desta página</button>
        <button type="button" class="rd-btn rd-btn--sec" data-alternar-marcas>${livroEl.classList.contains("rd-sem-marcas") ? "Mostrar marcações" : "Ocultar marcações"}</button>
      </div>
      <p class="rd-pop__dica">${ico("marker", 16)} ${marcas.total()} ${marcas.total() === 1 ? "marcação" : "marcações"} neste livro, salvas neste aparelho.</p>`;
  }

  function painelSom() {
    const tocando = amb.tocando();
    pop.innerHTML = `${cabecalho("Sons para ler")}
      <p class="rd-pop__sub">Sons calmos e contínuos, gerados no aparelho. Escolha um e continue a leitura.</p>
      <div class="rd-sons">
        ${SONS.map((s) => `
          <button type="button" class="rd-som${tocando === s.id ? " is-on" : ""}" data-som="${s.id}" aria-pressed="${tocando === s.id}">
            <span class="rd-som__ico">${ico(s.icone, 22)}</span>
            <span class="rd-som__nome">${esc(s.nome)}</span>
            <span class="rd-som__estado" aria-hidden="true">${ico(tocando === s.id ? "pause" : "play", 16)}</span>
          </button>`).join("")}
      </div>
      <label class="rd-slider">
        <span>Volume <b id="rd-vol-v">${Math.round(prefs.volume * 100)}%</b></span>
        <input type="range" id="rd-vol" min="0" max="100" value="${Math.round(prefs.volume * 100)}">
      </label>
      <label class="rd-slider">
        <span>${ico("clock", 16)} Desligar sozinho</span>
        <select id="rd-timer">
          <option value="0">Não desligar</option>
          <option value="15">Em 15 minutos</option>
          <option value="30">Em 30 minutos</option>
          <option value="60">Em 1 hora</option>
        </select>
      </label>
      ${tocando ? `<button type="button" class="rd-btn rd-btn--sec" data-silenciar>Parar o som</button>` : ""}
      ${amb.suportado() ? "" : `<p class="rd-pop__dica">Seu navegador não suporta áudio ambiente.</p>`}`;
    const t = $("#rd-timer");
    if (t && amb.minutos) t.value = String(amb.minutos);
  }

  const PAINEIS = { tema: painelTema, olhos: painelOlhos, marcador: painelMarcador, som: painelSom };

  function abrir(id) {
    if (aberto === id) return fechar();
    aberto = id;
    PAINEIS[id]();
    pop.hidden = false;
    pop.dataset.painel = id;
    barra.querySelectorAll(".rd-tool").forEach((b) => {
      const on = b.dataset.tool === id;
      b.classList.toggle("is-aberto", on);
      b.setAttribute("aria-expanded", String(on));
    });
    const btnX = $("[data-fechar]", pop);
    if (btnX) btnX.focus({ preventScroll: true });
  }
  function fechar() {
    aberto = null;
    pop.hidden = true;
    barra.querySelectorAll(".rd-tool").forEach((b) => { b.classList.remove("is-aberto"); b.setAttribute("aria-expanded", "false"); });
  }

  barra.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (b) abrir(b.dataset.tool);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto) fechar(); });
  document.addEventListener("pointerdown", (e) => {
    if (aberto && !raiz.contains(e.target)) fechar();
  });

  /* ----------------------------------------------- ações dentro dos painéis */
  pop.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-fechar]")) return fechar();

    const cl = t.closest("[data-clima]");
    if (cl) { clima = cl.dataset.clima; return painelTema(); }

    const tm = t.closest("[data-tema]");
    if (tm) {
      prefs.tema = tm.dataset.tema;
      aplicar(prefs);
      salvar();
      return painelTema();
    }

    if (t.closest("[data-olhos]")) {
      prefs.olhos = !prefs.olhos;
      aplicar(prefs);
      salvar();
      painelOlhos();
      return atualizarEstados();
    }

    if (t.closest("[data-modo]")) {
      definirModoMarcador(!modoMarcador);
      return painelMarcador();
    }
    const cor = t.closest("[data-cor]");
    if (cor) { prefs.corMarca = cor.dataset.cor; salvar(); return painelMarcador(); }
    if (t.closest("[data-limpar-pagina]")) {
      const ids = [...(flip.sheets[flip.current]?.querySelectorAll(".bk-text[data-block]") || [])].map((n) => n.dataset.block);
      marcas.limparBlocos(ids);
      renderizar(flip.current);
      return painelMarcador();
    }
    if (t.closest("[data-alternar-marcas]")) {
      livroEl.classList.toggle("rd-sem-marcas");
      return painelMarcador();
    }

    const som = t.closest("[data-som]");
    if (som) {
      if (amb.tocando() === som.dataset.som) amb.parar(1);
      else amb.tocar(som.dataset.som);
      painelSom();
      return atualizarEstados();
    }
    if (t.closest("[data-silenciar]")) {
      amb.parar(1);
      painelSom();
      return atualizarEstados();
    }
  });

  pop.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "rd-sat") { prefs.sat = Number(t.value); prefs.tema = "personalizado"; aplicar(prefs); salvar(); }
    else if (t.id === "rd-olhos") {
      prefs.olhosNivel = Number(t.value);
      if (!prefs.olhos) { prefs.olhos = true; }
      aplicar(prefs);
      salvar();
      $("#rd-olhos-v").textContent = `${prefs.olhosNivel}%`;
      atualizarEstados();
    } else if (t.id === "rd-vol") {
      prefs.volume = Number(t.value) / 100;
      amb.volume(prefs.volume);
      salvar();
      $("#rd-vol-v").textContent = `${t.value}%`;
    }
  });
  pop.addEventListener("change", (e) => {
    if (e.target.id === "rd-timer") {
      amb.minutos = Number(e.target.value);
      amb.temporizador(amb.minutos);
    }
  });
  amb.onFim = () => { amb.minutos = 0; atualizarEstados(); if (aberto === "som") painelSom(); };

  /* ------------------------------------------------------------ marcador */
  let modoMarcador = false;
  const pilula = $("#rd-marcar");

  function renderizar(i) {
    const item = seq[i];
    if (!item || !item.page) return;
    const pg = flip.sheets[i]?.querySelector(".bk-front .bk-page");
    if (!pg) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = renderPage(item.page, null, false, marcas.porBloco());
    pg.replaceWith(tmp.firstElementChild);
  }

  function definirModoMarcador(on) {
    modoMarcador = on;
    flip.locked = on;
    livroEl.classList.toggle("modo-marcador", on);
    if (!on) { window.getSelection()?.removeAllRanges(); pilula.hidden = true; }
    atualizarEstados();
  }

  function marcarSelecao() {
    const face = flip.sheets[flip.current];
    if (!face) return false;
    const itens = lerSelecao(face);
    if (!itens.length) return false;
    itens.forEach((x) => marcas.adicionar(x.b, x.s, x.e, prefs.corMarca));
    window.getSelection()?.removeAllRanges();
    renderizar(flip.current);
    pilula.hidden = true;
    if (aberto === "marcador") painelMarcador();
    return true;
  }

  livroEl.addEventListener("pointerup", (e) => {
    if (!modoMarcador) return;
    const mk = e.target.closest("mark.bk-mark");
    const sel = window.getSelection();
    if (mk && (!sel || sel.isCollapsed)) {
      marcas.remover(mk.dataset.marca);
      renderizar(flip.current);
      if (aberto === "marcador") painelMarcador();
      return;
    }
    if (e.pointerType === "mouse") setTimeout(marcarSelecao, 0);
  });

  document.addEventListener("selectionchange", () => {
    if (!modoMarcador) return;
    const sel = window.getSelection();
    const dentro = sel && !sel.isCollapsed && livroEl.contains(sel.anchorNode);
    pilula.hidden = !dentro;
  });
  pilula.addEventListener("click", marcarSelecao);

  // páginas viradas com marcações salvas: re-renderiza a página que ficou visível
  // (as páginas já nascem com as marcações via buildSequence)

  atualizarEstados();
  return { marcas, amb, prefs, fechar };
}
