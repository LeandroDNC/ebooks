// App instalável (PWA): popup de instalação, modo "app" e registro do service worker.
// Sem dependências. Só mexe no que é público; o admin não carrega este arquivo.
(function () {
  "use strict";
  var KEY = "intimagraca:app-popup";
  var ADIAR_DIAS = 14;
  var path = location.pathname.replace(/\.html$/, "");
  var standalone =
    (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;

  function guardar(v) { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* sem storage */ } }
  function ler() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  /* ---------------------------------------------------------- service worker */
  var seguro = location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (seguro && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () { /* ignora */ });
    });
  }

  /* ------------------------------------------------------------- modo "app" */
  if (standalone) {
    document.documentElement.classList.add("app-mode");
    document.addEventListener("DOMContentLoaded", montarModoApp);
    return; // no app instalado não mostra o convite
  }

  function montarModoApp() {
    var atual = /devocionais/.test(path) ? "loja" : "biblioteca";
    var ico = function (n, t) { return window.UI && UI.icon ? UI.icon(n, t) : ""; };
    var barra = document.createElement("header");
    barra.className = "app-bar";
    barra.innerHTML = '<img src="assets/logo-intima-graca.svg" alt="Íntima Graça" width="96" height="36">';
    document.body.insertBefore(barra, document.body.firstChild);
    var nav = document.createElement("nav");
    nav.className = "app-nav";
    nav.setAttribute("aria-label", "Navegação do app");
    nav.innerHTML =
      '<a href="devocionais.html?app=1"' + (atual === "loja" ? ' aria-current="page"' : "") + ">" + ico("bag", 24) + "<span>Loja</span></a>" +
      '<a href="biblioteca.html?app=1"' + (atual === "biblioteca" ? ' aria-current="page"' : "") + ">" + ico("book", 24) + "<span>Biblioteca</span></a>";
    document.body.appendChild(nav);
  }

  /* ------------------------------------------------------ popup de instalação */
  var SEM_POPUP = /^\/(admin|ler|offline)/;
  if (SEM_POPUP.test(location.pathname)) return;

  var ua = navigator.userAgent || "";
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var safariIos = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var evento = null;

  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); evento = e; });
  window.addEventListener("appinstalled", function () { guardar("instalado"); fechar(); });

  var caixa = null;
  var anterior = null;

  function deveMostrar() {
    var v = ler();
    if (v === "instalado") return false;
    if (v && /^\d+$/.test(v) && Date.now() - Number(v) < ADIAR_DIAS * 86400000) return false;
    return true;
  }

  function fechar() {
    if (!caixa) return;
    caixa.remove();
    caixa = null;
    document.removeEventListener("keydown", tecla);
    if (anterior && anterior.focus) anterior.focus();
  }
  function tecla(e) { if (e.key === "Escape") { guardar(Date.now()); fechar(); } }

  function conteudo() {
    var ico = function (n, t) { return window.UI && UI.icon ? UI.icon(n, t) : ""; };
    var plataforma = ios ? "no iPhone ou iPad" : android ? "no Android" : "no computador";
    var passos = "";
    var botao = "";
    if (ios) {
      passos = safariIos
        ? '<ol class="app-pop__passos"><li>Toque em <b>Compartilhar</b> ' + ico("share", 18) + " na barra do Safari.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Confirme em <b>Adicionar</b>.</li></ol>"
        : '<p class="app-pop__nota">Para instalar no iPhone, abra este site no <b>Safari</b> e use Compartilhar &gt; Adicionar à Tela de Início.</p>';
    } else if (evento) {
      botao = '<button type="button" class="btn btn--primary" data-app-instalar>' + ico("download", 20) + " Instalar o app</button>";
    } else {
      passos = android
        ? '<ol class="app-pop__passos"><li>Abra o menu <b>&#8942;</b> do navegador.</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li></ol>'
        : '<ol class="app-pop__passos"><li>No Chrome ou Edge, clique no ícone de instalar ' + ico("download", 18) + " na barra de endereços (ou no menu &#8942;).</li><li>Escolha <b>Instalar</b>.</li></ol>";
    }
    return (
      '<div class="app-pop__ico">' + ico(ios || android ? "phone" : "monitor", 30) + "</div>" +
      '<h2 id="app-pop-titulo">Leve a Íntima Graça com você</h2>' +
      '<p class="app-pop__txt">Instale o app ' + plataforma + ": abre direto na sua biblioteca e na loja de ebooks, em tela cheia e sem abrir o navegador.</p>" +
      '<ul class="app-pop__lista"><li>' + ico("checkring", 20) + "<span>Seus devocionais sempre à mão</span></li><li>" + ico("checkring", 20) + "<span>Leitura em tela cheia</span></li><li>" + ico("checkring", 20) + "<span>Acesso rápido pelo ícone</span></li></ul>" +
      passos + '<div class="app-pop__acoes">' + botao + '<button type="button" class="btn btn--ghost" data-app-depois>Agora não</button></div>'
    );
  }

  function abrir(forcar) {
    if (caixa || (forcar !== true && !deveMostrar())) return;
    anterior = document.activeElement;
    caixa = document.createElement("div");
    caixa.className = "app-pop";
    caixa.innerHTML = '<div class="app-pop__caixa" role="dialog" aria-modal="true" aria-labelledby="app-pop-titulo">' + conteudo() + "</div>";
    document.body.appendChild(caixa);
    caixa.addEventListener("click", function (e) {
      if (e.target === caixa || e.target.closest("[data-app-depois]")) { guardar(Date.now()); fechar(); return; }
      if (e.target.closest("[data-app-instalar]") && evento) {
        evento.prompt();
        evento.userChoice.then(function (r) { guardar(r && r.outcome === "accepted" ? "instalado" : Date.now()); evento = null; fechar(); });
      }
    });
    document.addEventListener("keydown", tecla);
    var primeiro = caixa.querySelector("button");
    if (primeiro) primeiro.focus();
  }

  // espera um pouco para o navegador avisar se dá para instalar e para a página assentar
  window.addEventListener("load", function () { setTimeout(abrir, 2500); });
  // botão "Baixar o app" da página: abre o convite mesmo que tenha sido dispensado antes
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-app-abrir]")) abrir(true);
  });
})();
