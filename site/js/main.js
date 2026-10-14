// Monta header/rodapé, renderiza listas da home e liga as interações.
(function () {
  const { icon, cover, ebookCard, escapeHtml } = UI;
  const $ = (s, r = document) => r.querySelector(s);

  // Layout compartilhado
  $("#site-header").innerHTML = UI.header();
  $("#site-footer").innerHTML = UI.footer();

  // ---- Menu mobile (drawer) ----
  const drawer = $("#mobile-menu");
  const toggle = $(".menu-toggle");
  function setMenu(open) {
    drawer.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    requestAnimationFrame(() => drawer.classList.toggle("is-open", open));
    if (open) $("[data-close].icon-btn", drawer).focus();
    else toggle.focus();
  }
  toggle.addEventListener("click", () => setMenu(true));
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]") || e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) setMenu(false);
  });

  // ---- Contador do carrinho (provisório, em memória) ----
  let cart = 0;
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-add-to-cart]")) return;
    cart += 1;
    $("#cart-count").textContent = cart;
    $(".cart").setAttribute("aria-label", `Carrinho, ${cart} itens`);
  });

  // ---- Home ----
  const D = window.LIZIVIDA;
  const fill = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };

  const verse = $("#verse-text");
  if (verse) {
    verse.textContent = `“${D.verse.text}”`;
    $("#verse-ref").textContent = D.verse.reference;
  }

  fill("#categories-list", D.categories.map((c) => `
    <li><a class="card category" href="devocionais.html?categoria=${c.slug}">
      <span class="category__icon">${icon(c.icon, 26)}</span>
      <span class="category__name">${escapeHtml(c.name)}</span>
      <span class="muted">${escapeHtml(c.count)}</span>
    </a></li>`).join(""));

  fill("#featured-list", D.ebooks.map((e) => `<li>${ebookCard(e)}</li>`).join(""));

  fill("#testimonials-list", D.testimonials.map((t) => `
    <li><figure class="card testimonial">
      ${icon("quote", 28)}
      <blockquote>${escapeHtml(t.text)}</blockquote>
      <figcaption>${escapeHtml(t.name)}</figcaption>
    </figure></li>`).join(""));

  const hero = $("#hero-covers");
  if (hero) {
    const [a, b, c] = D.ebooks;
    hero.insertAdjacentHTML("beforeend",
      `<div class="hero__cover hero__cover--left">${cover(b)}</div>
       <div class="hero__cover hero__cover--right">${cover(c)}</div>
       <div class="hero__cover hero__cover--front">${cover(a)}</div>`);
  }

  const progress = [64, 28, 100];
  fill("#library-list", D.ebooks.slice(0, 3).map((e, i) => `
    <li class="library-item">
      <div class="library-item__cover">${cover({ ...e, title: "", author: "" })}</div>
      <div class="library-item__info">
        <p class="library-item__title">${escapeHtml(e.title)}</p>
        <div class="progress-row">
          <div class="progress" role="progressbar" aria-label="Progresso de leitura de ${escapeHtml(e.title)}" aria-valuenow="${progress[i]}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress[i]}%"></span></div>
          <span class="progress-pct">${progress[i]}%</span>
        </div>
      </div>
      <span class="btn btn--primary btn--sm">${progress[i] === 100 ? "Reler" : "Continuar lendo"}</span>
    </li>`).join(""));

  // Ícones estáticos marcados com data-icon
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon, Number(el.dataset.size) || 20));
  });

  // ---- Newsletter ----
  const form = $("#newsletter-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault(); // futuro: integrar ao provedor de e-mail
      $("#newsletter-status").textContent = "Obrigada! Em breve você receberá nossos devocionais.";
      form.reset();
    });
  }
})();

// Header: mostra "Minha conta" se houver sessão do Supabase salva (sem consultar a rede).
(function () {
  try {
    const logged = Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
    const link = document.querySelector(".account-link");
    if (logged && link) link.lastChild.textContent = " Minha conta";
  } catch (_) { /* localStorage indisponível */ }
})();
