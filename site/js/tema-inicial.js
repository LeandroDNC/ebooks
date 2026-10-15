// Executa ANTES de a página desenhar (sem "piscar" de tema) e migra chaves antigas do navegador.
(function () {
  // Em produção o console não revela mensagens internas (erros de rede, códigos do banco).
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!local && window.console) {
    ["log", "info", "debug", "warn", "error", "trace"].forEach(function (m) { console[m] = function () {}; });
  }
  try {
    // chaves "lizivida:*" (nome antigo) -> "intimagraca:*"
    var antigas = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("lizivida:") === 0) antigas.push(k);
    }
    antigas.forEach(function (k) {
      var novo = "intimagraca:" + k.slice(9);
      if (localStorage.getItem(novo) === null) localStorage.setItem(novo, localStorage.getItem(k));
      localStorage.removeItem(k);
    });

    var t = localStorage.getItem("intimagraca:tema");
    if (t !== "dark" && t !== "light") {
      t = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) { /* sem storage */ }
})();
