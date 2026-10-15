// Home: troca os exemplos pelos ebooks publicados (se houver).
import { fetchPublished, updateCategoryCounts, ligarObterGratis } from "./catalog.js";

(async () => {
  const books = await fetchPublished();
  if (!books.length) return;
  const list = document.querySelector("#featured-list");
  if (list) list.innerHTML = books.slice(0, 6).map((e) => `<li>${UI.ebookCard(e)}</li>`).join("");
  updateCategoryCounts(books);
})();

ligarObterGratis();
