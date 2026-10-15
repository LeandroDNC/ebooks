---
name: criar_ebook
description: Cria um ebook devocional completo (capa, páginas, textos, versículos, linhas decorativas) e salva como arquivo .json para baixar e importar no editor admin da Íntima Graça. Use sempre que o usuário pedir para criar, escrever ou gerar um ebook, devocional ou jornada de dias.
---

# criar_ebook

Gera um ebook no formato do editor (`site/admin-ebook.html`) e salva em `ebooks-gerados/<slug>.json`.
O usuário importa pelo menu do editor: **⋯ > Importar ebook (.json)**.

## Fluxo
1. Se faltar algo essencial (tema, público, número de dias/capítulos), pergunte em UMA mensagem curta. Se o pedido já bastar, não pergunte.
2. Escreva o conteúdo em português do Brasil, tom acolhedor, cristão, sem emoji.
3. Monte o JSON conforme o formato abaixo e grave com a ferramenta Write em `ebooks-gerados/<slug>.json` (slug em minúsculas, hífens).
4. Valide: `node .claude/skills/criar_ebook/validar.mjs ebooks-gerados/<slug>.json` e corrija o que ele apontar.
5. Responda com: título, nº de páginas, link do arquivo e o passo a passo para importar. Nunca publique nem salve no banco.

## Regras de conteúdo
- Nada de emoji. Versículos só de traduções de domínio público (ARA/ACF antiga, Almeida Revista e Corrigida) e com referência. Não copie textos protegidos de terceiros.
- Imagens só por link `https://` (nunca base64). Se não houver link confiável, não crie bloco de imagem; sugira ao usuário adicionar depois.
- Páginas curtas: até ~900 caracteres de texto por página e no máximo 6 blocos. Divida capítulos longos em várias páginas.
- Estrutura sugerida: página de abertura (título + frase), uma página por dia/capítulo (título, versículo, reflexão, oração) e página final de encerramento.
- Máximo 200 páginas, 40 blocos por página.

## Formato do arquivo
```json
{
  "title": "Título do ebook",
  "author": "Nome da autoria",
  "category": "Mulheres | Casais | Jovens | Família | Jornadas de 21/30 dias | Oração",
  "price": 0,
  "coverColor": "#344E41",
  "coverImage": null,
  "year": 2026,
  "holder": "Titular dos direitos",
  "isbn": "",
  "creditsText": "",
  "creditsPosition": "front",
  "coverStyles": {
    "cover-title":  { "font": "Cormorant Garamond", "size": 9, "bold": true, "align": "center", "color": "#F8F6F0" },
    "cover-author": { "font": "Manrope", "size": 3.6, "align": "center", "color": "#C6A667" }
  },
  "pages": [
    { "bg": "#FFFFFF", "blocks": [
      { "type": "text", "text": "Dia 1", "font": "Cormorant Garamond", "size": 8, "bold": true, "align": "center", "color": "#344E41" },
      { "type": "line", "style": "ornament", "color": "#C6A667", "thickness": 2, "width": 40, "align": "center" },
      { "type": "text", "text": "Texto do corpo.", "font": "Manrope", "size": 4, "align": "left", "color": "#344E41" },
      { "type": "image", "src": "https://...", "alt": "descrição", "width": 100, "radius": 8, "align": "center" }
    ] }
  ]
}
```

Campos e limites:
- **category**: exatamente um dos valores acima. **price**: número em reais; `0` ou `""` = Free.
- **Cores**: sempre hexadecimal (`#RRGGBB`). Paleta da marca: floresta `#344E41`, sálvia `#A3B18A`, dourado `#C6A667`, creme `#F8F6F0`, tinta `#1F3329`. Capa escura com texto creme; páginas claras com texto floresta.
- **font** (apenas): Cormorant Garamond, Playfair Display, Lora, Merriweather, Manrope, Montserrat, Poppins, Great Vibes, Dancing Script, Parisienne.
- **text.size**: 2 a 20 (unidade relativa à largura da página; corpo 3.8 a 4.4, título 7 a 9, versículo 6 a 7). **align**: left, center, right, justify. Opcionais: bold, italic, underline.
- **line.style**: solid, dashed, dotted, double, fade, ornament. width 5 a 100 (%).
- **image**: width 10 a 100 (%), radius 0 a 60.
- Quebra de linha dentro de `text` com `\n`.
- Não inclua `id`, `published` nem posição livre: o editor recria ids e importa sempre como rascunho.
