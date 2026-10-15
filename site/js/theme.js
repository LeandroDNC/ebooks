// Alternador de tema (claro/escuro).
// - Lembra a escolha em localStorage ("intimagraca:tema").
// - Sem escolha salva, o padrão é o tema claro (não segue o tema do sistema).
// - O atributo data-theme em <html> é definido por um script inline no <head> (sem "piscar").
(function () {
  var KEY = "intimagraca:tema";
  var root = document.documentElement;

  function salvo() {
    try { var v = localStorage.getItem(KEY); return v === "dark" || v === "light" ? v : null; } catch (e) { return null; }
  }
  function atual() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

  function aplicar(tema) {
    root.setAttribute("data-theme", tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "dark" ? "#121a16" : "#f8f6f0");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-checked", String(tema === "dark"));
    });
  }

  function alternar() {
    var novo = atual() === "dark" ? "light" : "dark";
    aplicar(novo);
    try { localStorage.setItem(KEY, novo); } catch (e) { /* sem storage */ }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-theme-toggle]")) alternar();
  });

  aplicar(salvo() || "light");
})();
