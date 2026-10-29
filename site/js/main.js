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

  // ---- Home ----
  const D = window.INTIMA;
  const fill = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };

  const verse = $("#verse-text");
  if (verse) {
    verse.textContent = `“${D.verse.text}”`;
    $("#verse-ref").textContent = D.verse.reference;
  }

  fill("#categories-list", D.categories.map((c) => `
    <li><a class="card category" href="devocionais.html?categoria=${c.slug}">
      <span class="category__icon">${icon(c.icon, 34)}</span>
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

// Header e menu: com sessão do Supabase salva, mostra o nome da pessoa (sem consultar a rede).
(function () {
  try {
    const chave = Object.keys(localStorage).find((k) => /^sb-.+-auth-token$/.test(k));
    if (!chave) return;
    const s = JSON.parse(localStorage.getItem(chave));
    const u = s && (s.user || (s.currentSession && s.currentSession.user));
    if (!u) return;

    const meta = u.user_metadata || {};
    const email = u.email || "";
    const completo = String(meta.full_name || meta.name || "").trim() || email.split("@")[0] || "Minha conta";
    const primeiro = completo.split(/\s+/)[0];
    const inicial = primeiro.charAt(0).toUpperCase();
    const esc = UI.escapeHtml;

    // Cabeçalho (desktop mostra o nome; celular mostra só a inicial)
    const link = document.querySelector(".account-link");
    if (link) {
      link.classList.add("is-logged");
      link.setAttribute("aria-label", `Minha conta, ${completo}`);
      link.setAttribute("title", completo);
      link.innerHTML = `<span class="account-link__avatar" aria-hidden="true">${esc(inicial)}</span><span class="account-link__name">${esc(primeiro)}</span>`;
    }

    // Menu lateral (celular): cartão da pessoa + Minha conta + Sair
    const entrar = document.querySelector(".drawer__panel > a.btn--gold");
    if (entrar) {
      const bloco = document.createElement("div");
      bloco.className = "drawer__account";
      bloco.innerHTML = `
        <div class="drawer__user">
          <span class="drawer__avatar" aria-hidden="true">${esc(inicial)}</span>
          <span class="drawer__who"><strong>${esc(completo)}</strong>${email ? `<small>${esc(email)}</small>` : ""}</span>
        </div>
        <a class="btn btn--gold btn--block" href="biblioteca.html">Minha conta</a>
        <a class="btn btn--block drawer__logout" href="biblioteca.html?sair=1">Sair</a>`;
      entrar.replaceWith(bloco);
    }
  } catch (_) { /* localStorage indisponível ou sessão ilegível: mantém "Entrar" */ }
})();
