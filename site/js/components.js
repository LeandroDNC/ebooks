// Ícones (traçado estilo Lucide), capas, cards, header, menu mobile e rodapé.
(function () {
  // Conjunto próprio, grade 24x24, traço 1.6 arredondado, duotone suave:
  // [preenchimento translúcido, contorno, detalhe em dourado]. Tudo inline (sem requisições).
  const HEART = "M12 20.5S3.5 15.4 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 6.2-8.5 11.3-8.5 11.3z";
  const BOOK = "M12 7c-1.5-1.2-3.5-1.8-6.5-1.8v13c3 0 5 .6 6.5 1.8 1.5-1.2 3.5-1.8 6.5-1.8v-13C15.5 5.2 13.5 5.8 12 7z";
  const P = {
    menu: ["", "M4 7h16M4 12h16M4 17h10"],
    x: ["", "M6 6l12 12M18 6 6 18"],
    search: ['<circle cx="11" cy="11" r="6.5"/>', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'],
    bag: ['<path d="M5 8h14l1 12H4z"/>', '<path d="M5 8h14l1 12H4z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>', '<path d="M9.5 12.5a2.5 2.5 0 0 0 5 0"/>'],
    user: ['<circle cx="12" cy="8" r="4"/>', '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'],
    userplus: ['<circle cx="10" cy="8" r="4"/>', '<circle cx="10" cy="8" r="4"/><path d="M2.5 20.5a7.5 7.5 0 0 1 15 0"/>', '<path d="M19 7.5v6M16 10.5h6"/>'],
    zap: ['<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>', '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>'],
    phone: ['<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>', '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>', '<path d="M10.5 18.5h3"/>'],
    shield: ['<path d="M12 21.5s7.5-3.5 7.5-9.5V5.5L12 2.8 4.5 5.5V12c0 6 7.5 9.5 7.5 9.5z"/>', '<path d="M12 21.5s7.5-3.5 7.5-9.5V5.5L12 2.8 4.5 5.5V12c0 6 7.5 9.5 7.5 9.5z"/>', '<path d="m8.8 12 2.4 2.4 4-4.4"/>'],
    heart: [`<path d="${HEART}"/>`, `<path d="${HEART}"/>`],
    users: ['<circle cx="9" cy="8" r="3.8"/>', '<circle cx="9" cy="8" r="3.8"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.8 3.8 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>'],
    rings: ["", '<circle cx="8.5" cy="14" r="5.2"/><circle cx="15.5" cy="14" r="5.2"/>', '<path d="M12 2.6l1.6 1.8L12 6.2l-1.6-1.8z"/>'],
    sprout: ['<path d="M12 13c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 15.5c0-3.2-2.4-5-5.5-5 0 3.2 2.4 5 5.5 5z"/>', '<path d="M12 21v-8"/><path d="M12 13c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 15.5c0-3.2-2.4-5-5.5-5 0 3.2 2.4 5 5.5 5z"/>'],
    home: ['<path d="M4 10.5 12 4l8 6.5V20H4z"/>', '<path d="M4 10.5 12 4l8 6.5V20H4z"/>', '<path d="M12 17s-2.7-1.6-2.7-3.4a1.5 1.5 0 0 1 2.7-.9 1.5 1.5 0 0 1 2.7.9c0 1.8-2.7 3.4-2.7 3.4z"/>'],
    calendar: ['<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/>', '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v3.5M16 3v3.5M3.5 10h17"/>', '<path d="m9.2 15.2 1.9 1.9 3.7-3.9"/>'],
    cross: ["", `<path d="${BOOK}"/><path d="M12 7v13"/>`, '<path d="M12 1.5v4M10.2 3.2h3.6"/>'],
    prayer: [`<path d="${BOOK}"/>`, `<path d="${BOOK}"/><path d="M12 7v13"/>`, '<path d="M12 1.2v3.8M10.2 2.9h3.6"/>'],
    book: [`<path d="${BOOK}"/>`, `<path d="${BOOK}"/><path d="M12 7v13"/>`],
    checkring: ["", "m8.2 12.6 2.9 2.9 5.4-5.8", "", '<circle cx="12" cy="12" r="9.5"/>'],
    sun: ['<circle cx="12" cy="12" r="4"/>', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'],
    moon: ['<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.6 8.6 0 1 0 10.2 10.2z"/>', '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.6 8.6 0 1 0 10.2 10.2z"/>'],
    palette: ['<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2.1-.9 2.1-1.9 0-.6-.3-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/>', '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2.1-.9 2.1-1.9 0-.6-.3-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/>', '<path d="M7.6 11.2h.01M10 7.6h.01M14.4 7.6h.01"/>'],
    eye: ['<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/>', '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/>', '<circle cx="12" cy="12" r="2.6"/>'],
    marker: ['<path d="M15.6 3.6l4.8 4.8-8.4 8.4H7.2v-4.8z"/>', '<path d="M15.6 3.6l4.8 4.8-8.4 8.4H7.2v-4.8z"/>', '<path d="M3.5 20.5h9"/>'],
    sound: ['<path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"/>', '<path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"/>', '<path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.4 6.6a8 8 0 0 1 0 10.8"/>'],
    rain: ['<path d="M7 14.5a4.2 4.2 0 1 1 .7-8.3A5.2 5.2 0 0 1 17.6 7.5 3.5 3.5 0 0 1 17 14.5z"/>', '<path d="M7 14.5a4.2 4.2 0 1 1 .7-8.3A5.2 5.2 0 0 1 17.6 7.5 3.5 3.5 0 0 1 17 14.5z"/>', '<path d="M8.5 17.5l-1 2.2M12.5 17.5l-1 2.2M16.5 17.5l-1 2.2"/>'],
    waves: ["", '<path d="M2.5 8.5c2-2 4-2 6 0s4 2 6 0 4-2 7 0"/><path d="M2.5 13.5c2-2 4-2 6 0s4 2 6 0 4-2 7 0"/><path d="M2.5 18.5c2-2 4-2 6 0s4 2 6 0 4-2 7 0"/>'],
    wind: ["", '<path d="M3 9h10.2a2.6 2.6 0 1 0-2.6-2.6"/><path d="M3 13.5h14a3 3 0 1 1-3 3"/><path d="M3 18h6"/>'],
    flame: ['<path d="M12 21c-4 0-6.5-2.8-6.5-6.3 0-3 2-4.8 3.2-6.7.5 1.4 1.4 2.2 2.3 2.6C11 7.3 12.6 5 13 3c3.3 2.4 5.5 6 5.5 9.8C18.5 18.2 15.8 21 12 21z"/>', '<path d="M12 21c-4 0-6.5-2.8-6.5-6.3 0-3 2-4.8 3.2-6.7.5 1.4 1.4 2.2 2.3 2.6C11 7.3 12.6 5 13 3c3.3 2.4 5.5 6 5.5 9.8C18.5 18.2 15.8 21 12 21z"/>', '<path d="M12 20.5c-1.7 0-2.9-1.1-2.9-2.7 0-1.7 1.5-2.5 2.9-4.2 1.4 1.7 2.9 2.5 2.9 4.2 0 1.6-1.2 2.7-2.9 2.7z"/>'],
    note: ['<circle cx="7" cy="17.5" r="3"/><circle cx="17" cy="15.5" r="3"/>', '<path d="M10 17.5V6l10-2v11.5"/><circle cx="7" cy="17.5" r="3"/><circle cx="17" cy="15.5" r="3"/>'],
    pause: ["", '<path d="M8.5 5.5v13M15.5 5.5v13"/>'],
    clock: ['<circle cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/>', '<path d="M12 7v5l3 2"/>'],
    tick: ["", "m5.5 12.5 4.2 4.2L18.5 7.8"],
    check: ['<circle cx="12" cy="12" r="9.5"/>', '<circle cx="12" cy="12" r="9.5"/>', '<path d="m8.3 12.3 2.6 2.6 4.8-5.2"/>'],
    quote: ['<path d="M3 20c3.5 0 6.5-1.6 6.5-7.5V6.5a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 6.5V11a1.5 1.5 0 0 0 1.5 1.5H7C7 15 5.5 16.5 3 17z"/><path d="M14 20c3.5 0 6.5-1.6 6.5-7.5V6.5A1.5 1.5 0 0 0 19 5h-3.5A1.5 1.5 0 0 0 14 6.5V11a1.5 1.5 0 0 0 1.5 1.5H18c0 2.5-1.5 4-4 4.5z"/>', '<path d="M3 20c3.5 0 6.5-1.6 6.5-7.5V6.5a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 6.5V11a1.5 1.5 0 0 0 1.5 1.5H7C7 15 5.5 16.5 3 17z"/><path d="M14 20c3.5 0 6.5-1.6 6.5-7.5V6.5A1.5 1.5 0 0 0 19 5h-3.5A1.5 1.5 0 0 0 14 6.5V11a1.5 1.5 0 0 0 1.5 1.5H18c0 2.5-1.5 4-4 4.5z"/>'],
    arrow: ["", "M5 12h14M13 6l6 6-6 6"],
    mail: ['<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/>', '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>'],
    insta: ["", '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/>', '<path d="M17.3 6.7h.01"/>'],
    play: ['<path d="M8 5.2 19 12 8 18.8z"/>', '<path d="M8 5.2 19 12 8 18.8z"/>'],
    chat: ['<path d="M20.5 11.5a8 8 0 0 1-11.7 7L4 20l1.5-4.6A8 8 0 1 1 20.5 11.5z"/>', '<path d="M20.5 11.5a8 8 0 0 1-11.7 7L4 20l1.5-4.6A8 8 0 1 1 20.5 11.5z"/>'],
    card: ['<rect x="2.5" y="5" width="19" height="14" rx="2.5"/>', '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>', '<path d="M6.5 15h3.5"/>'],
    qr: ['<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/>', '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM19.5 14v6.5M14 20.5h2.5"/>'],
    bank: ['<path d="M4 9.5 12 4l8 5.5z"/>', '<path d="M4 9.5 12 4l8 5.5zM5 20h14M6.5 12v5M10.5 12v5M13.5 12v5M17.5 12v5"/>'],
  };

  function icon(name, size) {
    const s = size || 20;
    const [fill = "", line = "", acc = "", ring = ""] = P[name] || [];
    // `line` pode ser só o atributo "d" (string de caminho) ou um conjunto de elementos
    const lineEls = line && !line.startsWith("<") ? `<path d="${line}"/>` : line;
    return `<svg class="icon icon-${name}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
      (fill ? `<g class="ic-fill">${fill}</g>` : "") + (ring ? `<g class="ic-ring">${ring}</g>` : "") + lineEls + (acc ? `<g class="ic-acc">${acc}</g>` : "") + `</svg>`;
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
      <span class="cover__author">${escapeHtml(e.author || "Íntima Graça")}</span>
    </div>`;
  }

  function ebookCard(e) {
    return `<article class="card ebook-card">
      <a href="ler.html?id=${encodeURIComponent(e.id)}" aria-label="${escapeHtml(e.title)}">${cover(e)}</a>
      <div class="ebook-card__body">
        <span class="badge">${escapeHtml(e.category)}</span>
        <h3>${escapeHtml(e.title)}</h3>
        <p class="muted">${escapeHtml(e.author)}</p>
        <p class="price${e.free ? " price--free" : ""}">${escapeHtml(e.price)}</p>
        ${e.free
          ? `<button class="btn btn--primary btn--block btn--cart" type="button" data-claim="${escapeHtml(e.id)}">${icon("book", 18)}<span class="btn__label">Obter grátis</span></button>`
          : `<button class="btn btn--primary btn--block btn--cart" type="button" data-add-to-cart="${escapeHtml(e.id)}">${icon("bag", 18)}<span class="btn__label">Adicionar<span class="btn__long">&nbsp;ao carrinho</span></span></button>`}
      </div>
    </article>`;
  }

  function header() {
    const links = INTIMA.nav.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("");
    const mlinks = INTIMA.nav.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("");
    return `
    <div class="announcement">Acesso imediato na sua biblioteca após a compra</div>
    <header class="site-header">
      <div class="container header-inner">
        <button class="icon-btn menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-menu">${icon("menu", 22)}</button>
        <a class="logo" href="index.html" aria-label="Íntima Graça — página inicial"><img class="logo-img" src="assets/logo-intima-graca.svg" alt="Íntima Graça" width="138" height="52"></a>
        <nav class="main-nav" aria-label="Principal"><ul>${links}</ul></nav>
        <form class="search" role="search" action="devocionais.html">
          <label class="sr-only" for="busca">Buscar devocionais</label>
          ${icon("search", 16)}
          <input id="busca" name="q" type="search" placeholder="Buscar devocionais">
        </form>
        <div class="header-actions">
          <button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="Tema escuro" data-theme-toggle>
            <span class="theme-toggle__track" aria-hidden="true">${icon("sun", 14)}${icon("moon", 14)}<span class="theme-toggle__knob"></span></span>
          </button>
          <a class="btn btn--ghost account-link" href="biblioteca.html">${icon("user", 18)} Entrar</a>
          <a class="icon-btn cart" href="#" aria-label="Carrinho, 0 itens">${icon("bag", 22)}<span class="cart__count" id="cart-count">0</span></a>
        </div>
      </div>
    </header>
    <div class="drawer" id="mobile-menu" hidden>
      <div class="drawer__overlay" data-close></div>
      <div class="drawer__panel on-forest" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="drawer__top">
          <a class="logo" href="index.html" aria-label="Íntima Graça — página inicial"><img class="logo-img logo-img--light" src="assets/logo-intima-graca.svg" alt="Íntima Graça" width="138" height="52"></a>
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
      ["devocionais.html", "Loja"], ["biblioteca.html", "Minha conta"], ["ajuda.html", "Ajuda"],
      ["privacidade.html", "Política de privacidade"], ["termos.html", "Termos"],
    ].map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("");
    const socials = [["insta", "Instagram"], ["play", "YouTube"], ["chat", "WhatsApp"], ["mail", "E-mail"]]
      .map(([i, l]) => `<li><a class="icon-btn icon-btn--ring" href="#" aria-label="${l}">${icon(i, 18)}</a></li>`).join("");
    return `
    <footer class="site-footer on-forest" id="contato">
      <div class="container footer-grid">
        <div>
          <img class="logo-img logo-img--light logo-img--lg" src="assets/logo-intima-graca.svg" alt="Íntima Graça" width="191" height="72">
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
      <p class="footer-copy">© Íntima Graça. Todos os direitos reservados.</p>
    </footer>`;
  }

  window.UI = { icon, cover, ebookCard, header, footer, escapeHtml };
})();

// Imagens do site não podem ser arrastadas (também as criadas depois).
document.addEventListener("dragstart", (e) => {
  if (e.target && e.target.tagName === "IMG") e.preventDefault();
});
