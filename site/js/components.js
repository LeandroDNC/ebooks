// Ícones (traçado estilo Lucide), capas, cards, header, menu mobile e rodapé.
(function () {
  const P = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    userplus: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 16 0M19 8v6M22 11h-6"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    sprout: '<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    cross: '<path d="M12 2v20M5 8h14"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2H4c-1.2 0-2 .8-2 2v6c0 1.2.8 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2h-4c-1.2 0-2 .8-2 2v6c0 1.2.8 2 2 2h.8c.2 0 .2 0 .2 1v1c0 1-1 2-2 2z"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>',
    insta: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    play: '<path d="m5 3 14 9-14 9z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v7M14 20h3"/>',
    bank: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l9 5H3z"/>',
  };

  function icon(name, size) {
    const s = size || 20;
    return `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Capa gerada em CSS/SVG; usa imagem real se `cover` estiver preenchido.
  function cover(e, extra) {
    const cls = "cover" + (extra ? " " + extra : "");
    if (e.cover) {
      return `<div class="${cls}"><img src="${escapeHtml(e.cover)}" alt="Capa do ebook ${escapeHtml(e.title)}" loading="lazy"></div>`;
    }
    const bgStyle = e.bg ? ` style="background:${escapeHtml(e.bg)}"` : "";
    return `<div class="${cls} cover--${e.color || "forest"}"${bgStyle} role="img" aria-label="Capa do ebook ${escapeHtml(e.title)}">
      <span class="cover__frame" aria-hidden="true"></span>
      <svg class="cover__leaf" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M24 42V20M24 28c-6 0-10-4-10-10 6 0 10 4 10 10zM24 24c5 0 9-3.5 9-9-5 0-9 3.5-9 9z"/></svg>
      <span class="cover__title">${escapeHtml(e.title)}</span>
      <span class="cover__author">${escapeHtml(e.author || "LIZIVIDA")}</span>
    </div>`;
  }

  function ebookCard(e) {
    return `<article class="card ebook-card">
      <a href="ler.html?id=${encodeURIComponent(e.id)}" aria-label="${escapeHtml(e.title)}">${cover(e)}</a>
      <div class="ebook-card__body">
        <span class="badge">${escapeHtml(e.category)}</span>
        <h3>${escapeHtml(e.title)}</h3>
        <p class="muted">${escapeHtml(e.author)}</p>
        <p class="price">${escapeHtml(e.price)}</p>
        <button class="btn btn--primary btn--block" type="button" data-add-to-cart="${escapeHtml(e.id)}">${icon("bag", 16)} Adicionar ao carrinho</button>
      </div>
    </article>`;
  }

  function header() {
    const links = LIZIVIDA.nav.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("");
    const mlinks = LIZIVIDA.nav.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("");
    return `
    <div class="announcement">Acesso imediato na sua biblioteca após a compra</div>
    <header class="site-header">
      <div class="container header-inner">
        <button class="icon-btn menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-menu">${icon("menu", 22)}</button>
        <a class="logo" href="index.html" aria-label="LIZIVIDA — página inicial"><img class="logo-img" src="assets/logo-lizivida.svg" alt="LIZIVIDA" width="119" height="52"></a>
        <nav class="main-nav" aria-label="Principal"><ul>${links}</ul></nav>
        <form class="search" role="search" action="devocionais.html">
          <label class="sr-only" for="busca">Buscar devocionais</label>
          ${icon("search", 16)}
          <input id="busca" name="q" type="search" placeholder="Buscar devocionais">
        </form>
        <div class="header-actions">
          <a class="btn btn--ghost account-link" href="biblioteca.html">${icon("user", 18)} Entrar</a>
          <a class="icon-btn cart" href="#" aria-label="Carrinho, 0 itens">${icon("bag", 22)}<span class="cart__count" id="cart-count">0</span></a>
        </div>
      </div>
    </header>
    <div class="drawer" id="mobile-menu" hidden>
      <div class="drawer__overlay" data-close></div>
      <div class="drawer__panel on-forest" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="drawer__top">
          <a class="logo" href="index.html" aria-label="LIZIVIDA — página inicial"><img class="logo-img logo-img--light" src="assets/logo-lizivida.svg" alt="LIZIVIDA" width="119" height="52"></a>
          <button class="icon-btn" type="button" aria-label="Fechar menu" data-close>${icon("x", 22)}</button>
        </div>
        <form class="search search--light" role="search" action="devocionais.html">
          <label class="sr-only" for="busca-mobile">Buscar devocionais</label>
          ${icon("search", 16)}
          <input id="busca-mobile" name="q" type="search" placeholder="Buscar devocionais">
        </form>
        <nav aria-label="Menu mobile"><ul class="drawer__links">${mlinks}</ul></nav>
        <a class="btn btn--gold btn--block" href="biblioteca.html">Entrar / Minha conta</a>
      </div>
    </div>`;
  }

  function footer() {
    const links = [
      ["devocionais.html", "Loja"], ["biblioteca.html", "Minha conta"], ["#", "Ajuda"],
      ["#", "Política de privacidade"], ["#", "Termos"],
    ].map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("");
    const socials = [["insta", "Instagram"], ["play", "YouTube"], ["chat", "WhatsApp"], ["mail", "E-mail"]]
      .map(([i, l]) => `<li><a class="icon-btn icon-btn--ring" href="#" aria-label="${l}">${icon(i, 18)}</a></li>`).join("");
    return `
    <footer class="site-footer on-forest" id="contato">
      <div class="container footer-grid">
        <div>
          <img class="logo-img logo-img--light logo-img--lg" src="assets/logo-lizivida.svg" alt="LIZIVIDA" width="165" height="72">
          <span class="rule" aria-hidden="true"></span>
          <p class="footer-desc">Devocionais digitais para nutrir sua fé todos os dias, sempre à mão na sua biblioteca.</p>
        </div>
        <nav aria-label="Rodapé"><ul class="footer-links">${links}</ul></nav>
        <div>
          <p class="eyebrow eyebrow--gold">Redes sociais</p>
          <ul class="socials">${socials}</ul>
          <p class="eyebrow eyebrow--gold">Formas de pagamento</p>
          <ul class="payments">
            <li>${icon("qr", 18)} Pix</li><li>${icon("card", 18)} Cartão</li><li>${icon("bank", 18)} Boleto</li>
          </ul>
        </div>
      </div>
      <p class="footer-copy">© LIZIVIDA. Todos os direitos reservados.</p>
    </footer>`;
  }

  window.UI = { icon, cover, ebookCard, header, footer, escapeHtml };
})();
