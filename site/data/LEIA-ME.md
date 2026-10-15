# Versículo do dia — como preencher os textos

O componente mostra um versículo por dia, igual para todos os visitantes. A troca acontece à meia-noite de **America/Fortaleza**.

## Textos e tradução

Os 365 versículos (e os das datas especiais) já vêm preenchidos com a tradução **João Ferreira de Almeida**, de **domínio público**, e o campo `versao` traz `"Almeida"`. É a redação antiga (por exemplo, "Aquietai-vos, e sabei que eu sou Deus").

Quer outra tradução (NVI, ARA, NAA...)? Troque `texto` e `versao` entrada por entrada. Atenção: a maioria das traduções modernas tem direitos autorais, então confira a licença antes de publicar.

Se um `texto` ficar vazio, o componente mostra só a referência, sem quebrar.

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `versiculos.json` | 365 versículos, um para cada dia do ano (campo `dia` de 1 a 365). |
| `versiculos-especiais.json` | Datas especiais, que têm prioridade sobre a lista normal. |

## Como editar

1. Abra `versiculos.json`. Cada entrada tem este formato:

   ```json
   { "dia": 1, "ref": "Lamentações 3:22-23", "tema": "esperança", "texto": "", "versao": "" }
   ```

2. Cole o texto no campo `texto` e a sigla da tradução em `versao` (por exemplo, `"ARC"`, `"NVI"`, `"ARA"`).
3. Faça o mesmo em `versiculos-especiais.json`.
4. Salve. Os dados ficam guardados no navegador por um dia. Para ver a mudança na hora, abra a página com `?limpar=1` no final do endereço (apaga esse armazenamento). Páginas com `?dia=N` ou `?data=MM-DD` ignoram o armazenamento, então também servem para conferir.

Cuidados:
- Mantenha as aspas e a vírgula no fim de cada linha (menos na última entrada).
- Use aspas duplas retas (`"`) para delimitar. Dentro do texto, use `“ ”` ou `\"`.
- Não altere o campo `dia`.

## Datas especiais

Em `versiculos-especiais.json`:

- `fixas`: datas no formato `"MM-DD"`. Já incluídas: `01-01` (Ano-Novo) e `12-25` (Natal).
- `moveis`: regras que mudam a cada ano.
  - `pascoa`: calculada automaticamente para qualquer ano.
  - `domingo`: n-ésimo domingo de um mês. Já incluídos: Dia das Mães (2º domingo de maio) e Dia dos Pais (2º domingo de agosto).

Para adicionar outra data fixa, inclua uma entrada em `fixas`, por exemplo `"11-02": { "rotulo": "Finados", "ref": "...", "tema": "...", "texto": "", "versao": "" }`. O campo `rotulo` aparece como um selo acima do versículo.

## Anos bissextos

O dia 366 reaproveita uma entrada: volta ao versículo do dia 1. Na prática, em 31 de dezembro de um ano bissexto o dia do ano é 366.

## Testar qualquer dia

Em qualquer página com o componente, acrescente à URL:

- `?limpar=1`: apaga o armazenamento do dia (use depois de editar os JSON).
- `?dia=N` (de 1 a 366): simula o dia do ano.
- `?data=MM-DD`: simula uma data, por exemplo `?data=12-25`.

A página `exemplo-versiculo.html` traz atalhos para esses testes.

## Marca e endereço no compartilhamento

O texto enviado ao WhatsApp termina com "via *marca*" e o endereço do site. Configure no elemento:

```html
<section data-versiculo-do-dia data-marca="Nome da marca" data-url="https://seusite.com.br/">
```

Se `data-marca` não existir, usa "Íntima Graça". Se `data-url` não existir, usa a raiz do site atual.
