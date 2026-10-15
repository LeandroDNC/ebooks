// DADOS DE EXEMPLO (placeholder). Troque títulos, autoras, preços, categorias e capas aqui.
// Para usar uma imagem de capa real, preencha `cover` com o caminho (ex.: "assets/capa-1.jpg").
// `color` aceita: "forest", "sage", "gold", "cream".

window.INTIMA = {
  verse: {
    text: "[Texto do versículo do dia — edite em js/data.js]",
    reference: "[Livro 0:00]",
  },

  categories: [
    { slug: "mulheres", name: "Mulheres", count: "[00] ebooks", icon: "heart" },
    { slug: "casais", name: "Casais", count: "[00] ebooks", icon: "rings" },
    { slug: "jovens", name: "Jovens", count: "[00] ebooks", icon: "sprout" },
    { slug: "familia", name: "Família", count: "[00] ebooks", icon: "home" },
    { slug: "jornadas", name: "Jornadas de 21/30 dias", count: "[00] ebooks", icon: "calendar" },
    { slug: "oracao", name: "Oração", count: "[00] ebooks", icon: "prayer" },
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

  // Contato: preencha para ativar o botão flutuante do WhatsApp (somente números, com DDI+DDD).
  contact: {
    whatsapp: "",   // ex.: "5581999999999"
    whatsappMsg: "Olá! Gostaria de saber mais sobre os devocionais da Íntima Graça.",
    email: "",
  },

  // Perguntas frequentes. Itens com [colchetes] são placeholders: edite antes de publicar.
  faq: [
    { q: "Como recebo o ebook depois da compra?", a: "Ele aparece na sua biblioteca, dentro de “Minha conta”, assim que o pagamento é confirmado. Não depende de e-mail." },
    { q: "Em quais aparelhos posso ler?", a: "No celular, no tablet ou no computador, direto pelo navegador, entrando na sua conta. Seu progresso de leitura fica salvo." },
    { q: "Preciso criar uma conta?", a: "Sim. A conta guarda a sua biblioteca e o ponto em que você parou. O cadastro leva menos de um minuto, com e-mail e senha ou com o Google." },
    { q: "Posso ler sem internet ou baixar o arquivo?", a: "Hoje a leitura é feita online, na sua biblioteca. Assim o conteúdo fica protegido e você retoma de onde parou em qualquer aparelho." },
    { q: "Quais são as formas de pagamento?", a: "[Formas de pagamento — editar em js/data.js]" },
    { q: "Posso pedir reembolso?", a: "[Política de reembolso — editar em js/data.js]" },
  ],

  nav: [
    { href: "index.html", label: "Início" },
    { href: "devocionais.html", label: "Devocionais" },
    { href: "index.html#categorias", label: "Categorias" },
    { href: "index.html#sobre", label: "Sobre" },
    { href: "#contato", label: "Contato" },
  ],
};
