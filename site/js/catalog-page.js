// Página /devocionais: lista, filtro por categoria e busca.
import { fetchPublished } from "./catalog.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const catSlug = params.get("categoria") || "";
const query = (params.get("q") || "").trim().toLowerCase();

const cats = LIZIVIDA.categories;
const activeCat = cats.find((c) => c.slug === catSlug)?.name || "";

function render(books) {
  const norm = (s) => String(s).toLowerCase();
  const shown = books.filter((b) =>
    (!activeCat || b.category === activeCat) &&
    (!query || norm(b.title).includes(query) || norm(b.author).includes(query)));

  $("#catalog-count").textContent =
    shown.length === 1 ? "1 devocional" : `${shown.length} devocionais`;
  $("#catalog-list").innerHTML = shown.map((e) => `<li>${UI.ebookCard(e)}</li>`).join("");
  $("#catalog-empty").hidden = shown.length > 0;
}

function renderChips() {
  const chip = (href, label, on) =>
    `<li><a class="chip${on ? " is-on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}>${UI.escapeHtml(label)}</a></li>`;
  $("#catalog-cats").innerHTML =
    chip("devocionais.html", "Todos", !activeCat) +
    cats.map((c) => chip(`devocionais.html?categoria=${c.slug}`, c.name, c.name === activeCat)).join("");
}

(async () => {
  renderChips();
  if (query) $("#catalog-q").value = params.get("q");
  const books = await fetchPublished();
  $("#catalog-loading").hidden = true;
  render(books);
})();
