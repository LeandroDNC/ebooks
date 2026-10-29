// Revelação ao rolar: elementos abaixo da dobra entram com um leve fade-up.
// Sem dependências. Respeita prefers-reduced-motion e funciona com cards que
// chegam depois (catálogo carregado do banco), via MutationObserver.
(function () {
  "use strict";
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) { return; }

  var SEL = ".ebook-card,.category,.testimonial,.steps li,.benefits li,.section-title,.faq__item";

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });

  function prep(el) {
    if (el.__rev) return;
    el.__rev = 1;
    // Já visível na primeira dobra: aparece normal (evita "piscar").
    var r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) * 0.92) return;
    el.classList.add("reveal");
    io.observe(el);
  }

  function scan(root) {
    if (root.matches && root.matches(SEL)) prep(root);
    var found = root.querySelectorAll ? root.querySelectorAll(SEL) : [];
    for (var i = 0; i < found.length; i++) prep(found[i]);
  }

  function start() {
    scan(document);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes[i];
          if (n.nodeType === 1) scan(n);
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
