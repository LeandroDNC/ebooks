// DADOS DE EXEMPLO (placeholder). Troque títulos, autoras, preços, categorias e capas aqui.
// Para usar uma imagem de capa real, preencha `cover` com o caminho (ex.: "assets/capa-1.jpg").
// `color` aceita: "forest", "sage", "gold", "cream".

window.LIZIVIDA = {
  verse: {
    text: "[Texto do versículo do dia — edite em js/data.js]",
    reference: "[Livro 0:00]",
  },

  categories: [
    { slug: "mulheres", name: "Mulheres", count: "[00] ebooks", icon: "heart" },
    { slug: "casais", name: "Casais", count: "[00] ebooks", icon: "users" },
    { slug: "jovens", name: "Jovens", count: "[00] ebooks", icon: "sprout" },
    { slug: "familia", name: "Família", count: "[00] ebooks", icon: "home" },
    { slug: "jornadas", name: "Jornadas de 21/30 dias", count: "[00] ebooks", icon: "calendar" },
    { slug: "oracao", name: "Oração", count: "[00] ebooks", icon: "cross" },
  ],

  ebooks: [
    { id: "1", title: "[Título do devocional]", author: "[Nome da autora]", category: "Mulheres", price: "[PREÇO]", color: "forest", cover: "" },
    { id: "2", title: "[Título do devocional]", author: "[Nome da autora]", category: "Casais", price: "[PREÇO]", color: "sage", cover: "" },
    { id: "3", title: "[Título do devocional]", author: "[Nome da autora]", category: "Jornada de 21 dias", price: "[PREÇO]", color: "gold", cover: "" },
    { id: "4", title: "[Título do devocional]", author: "[Nome da autora]", category: "Oração", price: "[PREÇO]", color: "cream", cover: "" },
    { id: "5", title: "[Título do devocional]", author: "[Nome da autora]", category: "Família", price: "[PREÇO]", color: "sage", cover: "" },
    { id: "6", title: "[Título do devocional]", author: "[Nome da autora]", category: "Jovens", price: "[PREÇO]", color: "forest", cover: "" },
  ],

  testimonials: [
    { text: "[Depoimento da leitora]", name: "[Nome]" },
    { text: "[Depoimento da leitora]", name: "[Nome]" },
    { text: "[Depoimento da leitora]", name: "[Nome]" },
  ],

  nav: [
    { href: "index.html", label: "Início" },
    { href: "devocionais.html", label: "Devocionais" },
    { href: "index.html#categorias", label: "Categorias" },
    { href: "index.html#sobre", label: "Sobre" },
    { href: "#contato", label: "Contato" },
  ],
};
